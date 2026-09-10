
(function () {
  'use strict';

  var config = {"variant":"unified-sidebar","name":"个人与团队统一导航","defaultMode":"collaboration","defaultWorkspaceId":"prod"};
  /* Project cards, the left project tree, switching and messages share this registry. */
  var WORKSPACES = (window.__EVA_PROJECTS || []).map(function (project) {
    return {
      id: project.id,
      name: project.name,
      mark: project.short,
      description: project.desc,
      members: Array.isArray(project.members) ? project.members.length : Number(project.members || 0),
      assistants: Number(project.bots || 0),
      official: Boolean(project.official)
    };
  });

  var state = {
    mode: config.defaultMode || 'collaboration',
    workspaceId: config.defaultWorkspaceId || 'prod',
    driveEntry: 'global',
    driveScope: 'personal',
    selectedId: null,
    query: '',
    parentId: 0,
    crumbs: [],
    dialog: null,
    previewId: null,
    previewPage: 0,
    previewSheet: 0,
    previewMode: 'rendered',
    menuId: null,
    menuAnchor: null,
    tableScroll: null,
    uploadTarget: null,
    pendingWorkspaceId: null,
    pendingTab: null,
    toastTimer: null
  };

  var frameQueued = false;
  var internalMutation = false;

  function workspaceById(id) {
    return WORKSPACES.find(function (workspace) { return workspace.id === id; }) || WORKSPACES[0];
  }

  function driveScopeForMode(mode) {
    return 'personal';
  }

  function escapeHTML(value) {
    return String(value == null ? '' : value)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }

  function icon(name, className) {
    var aliases = {
      link: 'link-2', file: 'file-text', sheet: 'file-spreadsheet', drive: 'hard-drive',
      workspace: 'layout-grid', task: 'list-checks', automation: 'cpu', bolt: 'sparkles',
      arrow: 'chevron-down', chevron: 'chevron-right', external: 'external-link', more: 'ellipsis'
    };
    return window.__evaLucide(aliases[name] || name, { className: className || 'eva-drive-icon' });
  }

  function sidebar() {
    return document.querySelector('aside.arco-layout-sider') || document.querySelector('aside');
  }

  function navContainer() {
    var side = sidebar();
    if (!side) return null;
    return side.querySelector('.size-full.flex.flex-col.gap-2px');
  }

  function directChildForText(container, text) {
    if (!container) return null;
    return Array.from(container.children).find(function (child) {
      return Array.from(child.querySelectorAll('span')).some(function (span) {
        return span.textContent.trim() === text;
      });
    }) || null;
  }

  function searchEntry(container) {
    return directChildForText(container, '搜索会话') || directChildForText(container, '搜索');
  }

  function newConversationEntry(container) {
    return directChildForText(container, '新建会话');
  }

  function historyArea(container) {
    return Array.from(container ? container.children : []).find(function (child) {
      return child.className && String(child.className).indexOf('overflow-y-auto') >= 0;
    }) || null;
  }

  function nativeDivider(container) {
    return Array.from(container ? container.children : []).find(function (child) {
      var className = String(child.className || '');
      return className.indexOf('h-1px') >= 0 && className.indexOf('bg-') >= 0;
    }) || null;
  }

  function currentModeFromLocation() {
    var hash = String(location.hash || '');
    if (/^#\/(collab|messages|contacts|drive)(?:[/?]|$)/.test(hash)) return 'collaboration';
    if (hash.indexOf('evaMode=collaboration') >= 0) return 'collaboration';
    return 'personal';
  }

  /* Business overlays may sync their geometry, but never mutate first-level navigation. */
  function syncShellGeometry() {
    state.mode = currentModeFromLocation();
    syncDriveLeft();
  }

  function navigatePersonal() {
    closeDrive();
    if (location.hash !== '#/guid') location.hash = '#/guid';
  }

  function navigateCollaboration() {
    closeDrive();
    if (location.hash !== '#/collab') location.hash = '#/collab';
  }

  function setMode(mode, workspaceId) {
    state.mode = mode;
    if (workspaceId) state.workspaceId = workspaceId;
    if (mode === 'personal') {
      navigatePersonal();
    } else if (config.variant === 'workspace-picker') {
      openWorkspace(state.workspaceId, null);
    } else {
      navigateCollaboration();
    }
    syncShellGeometry();
  }

  function currentWorkspaceIdFromUI() {
    var chip = document.querySelector('.collab-sp-chip .nm');
    if (chip) {
      var match = WORKSPACES.find(function (workspace) { return workspace.name === chip.textContent.trim(); });
      if (match) return match.id;
    }
    return state.workspaceId || 'prod';
  }

  function openWorkspace(id, tab) {
    state.mode = 'collaboration';
    state.workspaceId = id || state.workspaceId || 'prod';
    state.pendingWorkspaceId = state.workspaceId;
    state.pendingTab = tab || null;
    closeDrive();
    if (location.hash !== '#/collab') location.hash = '#/collab';
    syncShellGeometry();
    setTimeout(fulfillPendingNavigation, 30);
  }

  window.__evaOpenWorkspaceFromTree = function (id, tab) {
    /* 项目快捷入口位于消息页中时，项目内容属于当前会话的右侧工作区。
       这里兜底旧监听器和遗留 React 回调，避免它们把消息路由改成 /collab。 */
    if (String(location.hash || '').indexOf('#/messages') === 0) {
      window.dispatchEvent(new CustomEvent('eva:open-inline-project', {
        detail: { projectId: id, tab: tab || 'tasks' }
      }));
      return;
    }
    openWorkspace(id, tab || null);
  };

  function fulfillPendingNavigation() {
    if (!state.pendingWorkspaceId) return;
    var workspace = workspaceById(state.pendingWorkspaceId);
    var list = document.querySelector('.collab-list-page');
    if (list) {
      var card = Array.from(list.querySelectorAll('.collab-space-card')).find(function (item) {
        return item.textContent.indexOf(workspace.name) >= 0;
      });
      if (card) {
        card.click();
        return;
      }
    }

    var frame = document.querySelector('.collab-frame');
    if (!frame) return;
    var currentName = frame.querySelector('.collab-sp-chip .nm');
    if (currentName && currentName.textContent.trim() !== workspace.name) {
      var chip = frame.querySelector('.collab-sp-chip');
      if (chip && !document.querySelector('[data-eva-project-id]')) {
        chip.click();
        setTimeout(fulfillPendingNavigation, 30);
        return;
      }
      var option = Array.from(document.querySelectorAll('[data-eva-project-id]')).find(function (item) {
        return item.textContent.indexOf(workspace.name) >= 0;
      });
      if (option) {
        option.click();
        return;
      }
    }

    var tab = state.pendingTab;
    state.pendingWorkspaceId = null;
    state.pendingTab = null;
    if (!tab) return;
    var labels = { projects: '项目', tasks: '任务', channels: '群聊', files: '文件', experts: '专家', squads: '专家团', skills: '技能', automation: '自动化', settings: '设置' };
    var target = Array.from(frame.querySelectorAll('.collab-tab')).find(function (button) {
      return button.textContent.trim().replace(/\d+$/, '') === labels[tab];
    });
    if (target) target.click();
  }

  function fileContext() {
    return typeof window.__evaGetFileContext === 'function' ? window.__evaGetFileContext() : null;
  }

  function fileActor() {
    var context = fileContext();
    return context ? context.store.snapshot().actorId : 'u-wangyilin';
  }

  function personalSpaceId() {
    var context = fileContext();
    return context ? context.files.personalSpace(fileActor()) : 'personal:' + fileActor();
  }

  function workspaceName(id) {
    var workspace = WORKSPACES.find(function (item) { return item.id === id; });
    return workspace ? workspace.name : '项目';
  }

  function spaceName(id) {
    if (String(id || '').startsWith('personal:')) return '个人空间';
    return workspaceName(id);
  }

  function formatDriveBytes(value) {
    if (!value) return '—';
    var units = ['B', 'KB', 'MB', 'GB'];
    var size = Number(value), index = 0;
    while (size >= 1024 && index < units.length - 1) { size /= 1024; index += 1; }
    return (size >= 10 || index === 0 ? Math.round(size) : Math.round(size * 10) / 10) + ' ' + units[index];
  }

  function formatDriveTime(value) {
    if (!value) return '—';
    var date = new Date(value);
    if (Number.isNaN(date.getTime())) return value;
    return new Intl.DateTimeFormat('zh-CN', { year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', hour12: false }).format(date).replace(/\//g, '-');
  }

  function scopeSpaceId() {
    if (state.driveScope === 'personal') return personalSpaceId();
    if (state.driveScope === 'workspace') return state.workspaceId;
    return null;
  }

  function resourcesForScope() {
    var context = fileContext();
    if (!context) return [];
    var actor = fileActor(), list = [];
    if (state.driveScope === 'personal') list = context.files.list(personalSpaceId(), actor);
    if (state.driveScope === 'workspace') list = context.files.list(state.workspaceId, actor);
    if (state.driveScope === 'trash') {
      list = [];
      [personalSpaceId()].concat(WORKSPACES.map(function (item) { return item.id; })).forEach(function (spaceId) {
        if (context.files.can('view-trash', spaceId, actor)) list = list.concat(context.files.trashList(spaceId, actor));
      });
    } else if (scopeSpaceId() && !state.query.trim()) {
      list = list.filter(function (resource) { return resource.parent_id === state.parentId; });
    }
    var query = state.query.trim().toLowerCase();
    if (query) list = list.filter(function (resource) {
      return [resource.name, resource.creator, resourceFileType(resource), resource.external && resource.external.host, resource.external && resource.external.url].concat(resource.tags || [], relationsFor(resource).map(function (relation) { return relation.label; })).some(function (value) {
        return String(value || '').toLowerCase().includes(query);
      });
    });
    return context.files.sortEntries(list);
  }

  function isExternalFolderResource(resource) {
    return Boolean(resource && resource.type === 'external_link' && resource.external && resource.external.kind === 'folder');
  }

  function fileIconName(resource) {
    if (resource.type === 'folder' || isExternalFolderResource(resource)) return 'folder';
    if (resource.type === 'external_link') return 'link';
    if (resource.type === 'shortcut') return 'file';
    if (['xlsx', 'xls', 'csv'].includes(resource.extension)) return 'sheet';
    return 'file';
  }

  function fileMarkClass(resource) {
    if (resource.type === 'folder') return 'is-folder';
    if (isExternalFolderResource(resource)) return 'is-external-folder';
    if (resource.type === 'external_link') return 'is-external-link';
    if (resource.type === 'shortcut') return 'is-shortcut';
    if (resource.extension === 'pdf') return 'is-pdf';
    if (['xlsx', 'xls', 'csv'].includes(resource.extension)) return 'is-sheet';
    return '';
  }

  function fileMarkIconHTML(resource) {
    return icon(fileIconName(resource))
      + (isExternalFolderResource(resource) ? icon('external', 'eva-drive-icon eva-drive__file-external-badge') : '')
      + (resource.type === 'shortcut' ? icon('external', 'eva-drive-icon eva-drive__shortcut-badge') : '');
  }

  function scopeCopy() {
    if (state.driveScope === 'personal') return { title: '个人空间', section: '个人文件', subtitle: '仅你可访问，可统一整理本地文件与外部链接' };
    if (state.driveScope === 'projects') return { title: '项目空间', section: '我的项目空间', subtitle: '选择一个已加入的项目后浏览和整理团队文件' };
    if (state.driveScope === 'workspace') return { title: workspaceName(state.workspaceId), section: '团队文件', subtitle: '权限继承项目角色，任务产出、群文件与外部链接归属项目空间' };
    if (state.driveScope === 'trash') return { title: '回收站', section: '回收站', subtitle: '仅显示你有管理权限的空间中已删除的文件' };
    return { title: '个人空间', section: '个人文件', subtitle: '仅你可访问，可用于上传和整理个人资料' };
  }

  function ensureDriveRoot(host) {
    var root = document.getElementById('eva-drive-root');
    if (!root) {
      root = document.createElement('section');
      root.id = 'eva-drive-root';
      root.className = 'eva-drive';
      root.setAttribute('aria-label', '文件库');
    }
    if (host && root.parentElement !== host) host.appendChild(root);
    return root;
  }

  function detailContentHTML(resource) {
    if (!resource) return '';
    var context = fileContext(), actor = fileActor();
    var canEdit = context.files.can('rename', resource.spaceId, actor);
    var canEditTags = resource.type !== 'folder' && context.files.can('edit-tags', resource.spaceId, actor);
    var canTrash = context.files.can('trash', resource.spaceId, actor);
    var canRestore = context.files.can('restore', resource.spaceId, actor);
    var canDeleteForever = context.files.can('delete-forever', resource.spaceId, actor);
    var isTrash = Boolean(resource.deletedAt);
    var shortcutInfo = context.files.shortcutInfo(resource, actor);
    var canOpen = !shortcutInfo || shortcutInfo.status === 'available';
    var externalInfo = canOpen ? context.files.externalLinkInfo(resource, actor) : null;
    var isExternal = Boolean(externalInfo);
    var canDownload = resource.type !== 'folder' && !isExternal && !isTrash && canOpen && context.files.can('download', resource.spaceId, actor);
    return [
      '<div class="eva-file-detail__identity' + (!isTrash ? ' eva-file-detail__identity--with-action' : '') + '"><span class="eva-drive__file-mark ' + fileMarkClass(resource) + '">' + fileMarkIconHTML(resource) + '</span><span class="eva-file-detail__identity-content"><strong>' + escapeHTML(resource.name) + '</strong><small>' + escapeHTML(resourceFileType(resource) + (resource.type === 'folder' ? (isTrash && resource.trashedItemCount ? ' · 包含 ' + resource.trashedItemCount + ' 项' : '') : isExternal ? ' · ' + externalInfo.host : ' · ' + formatDriveBytes(resource.size))) + '</small></span>' + (!isTrash ? '<button class="eva-file-detail__copy-link" type="button" data-drive-action="copy-link" aria-label="复制内部链接" title="复制内部链接">' + icon('link') + '</button>' : '') + '</div>',
      !isTrash && (resource.projectId || canDownload || isExternal) ? '<div class="eva-drive__inspector-actions">' + (resource.projectId ? '<button class="eva-drive__text-button" type="button" data-drive-action="open-project">' + icon('external') + '在项目中打开</button>' : '') + (isExternal ? '<button class="eva-drive__ghost-button" type="button" data-drive-action="open-external">' + (externalInfo.kind === 'folder' ? '打开原文件夹' : '打开原链接') + '</button><button class="eva-drive__ghost-button" type="button" data-drive-action="copy-external-link">' + (externalInfo.kind === 'folder' ? '复制文件夹链接' : '复制外部链接') + '</button>' : canDownload ? '<button class="eva-drive__ghost-button" type="button" data-drive-action="download">下载</button>' : '') + '</div>' : '',
      isTrash && (canRestore || canDeleteForever) ? '<div class="eva-drive__management-actions">' + (canRestore ? '<button type="button" data-drive-action="restore">恢复</button>' : '') + (canDeleteForever ? '<button class="is-danger" type="button" data-drive-action="delete-forever">永久删除</button>' : '') + '</div>' : '',
      !isTrash && canEdit ? '<div class="eva-drive__management-actions"><button type="button" data-drive-action="rename">重命名</button>' + (resource.type === 'external_link' ? '<button type="button" data-drive-action="edit-external-link">' + (externalInfo && externalInfo.kind === 'folder' ? '编辑外部文件夹' : '编辑链接') + '</button>' : '') + '<button type="button" data-drive-action="move">移动</button>' + (resource.type !== 'shortcut' && !isExternal ? '<button type="button" data-drive-action="copy">创建副本</button>' : '') + (resource.type !== 'shortcut' && resource.type !== 'folder' ? '<button type="button" data-drive-action="create-shortcut">创建快捷方式</button>' : '') + (canTrash ? '<button class="is-danger" type="button" data-drive-action="trash">移至回收站</button>' : '') + '</div>' : '',
      resource.type !== 'folder' ? '<section class="eva-file-detail__section"><div class="eva-file-detail__section-head"><h3>标签</h3>' + (canEditTags && !isTrash ? '<button type="button" data-drive-action="tags">编辑</button>' : '') + '</div><div class="eva-file-detail__classification">' + (tagsHTML(resource) || '<span class="eva-file-muted">暂无标签</span>') + '</div></section>' : '',
      resource.type !== 'folder' ? '<section class="eva-file-detail__section"><div class="eva-file-detail__section-head"><h3>系统关联</h3><span class="eva-file-readonly">只读</span></div>' + relationDetailsHTML(resource) + '</section>' : '',
      resource.type === 'shortcut' ? shortcutDetailsHTML(resource) : '',
      isExternal ? '<section class="eva-file-detail__section"><div class="eva-file-detail__section-head"><h3>' + (externalInfo.kind === 'folder' ? '外部文件夹' : '外部链接') + '</h3></div><dl class="eva-drive__meta"><div><dt>来源平台</dt><dd>' + escapeHTML(externalInfo.providerLabel) + '</dd></div><div><dt>资源类型</dt><dd>' + escapeHTML(externalInfo.kindLabel) + '</dd></div><div><dt>链接域名</dt><dd>' + escapeHTML(externalInfo.host) + '</dd></div><div><dt>内容与版本</dt><dd>由原平台维护</dd></div></dl></section>' : '',
      '<section class="eva-file-detail__section"><div class="eva-file-detail__section-head"><h3>文件信息</h3></div><dl class="eva-drive__meta">',
      '<div><dt>文件类型</dt><dd>' + escapeHTML(resourceFileType(resource)) + '</dd></div>',
      '<div><dt>所在位置</dt><dd>' + escapeHTML(isTrash ? originalLocationLabel(resource) : resourceLocationLabel(resource)) + '</dd></div>',
      '<div><dt>产生方式</dt><dd>' + escapeHTML(resourceSourceLabel(resource)) + '</dd></div>',
      '<div><dt>创建者</dt><dd>' + escapeHTML(resource.creator || '—') + '</dd></div>',
      '<div><dt>创建时间</dt><dd>' + escapeHTML(formatDriveTime(resource.createdAt)) + '</dd></div>',
      '<div><dt>大小</dt><dd>' + escapeHTML(resource.type === 'folder' || isExternal ? '—' : formatDriveBytes(resource.size)) + '</dd></div>',
      '</dl></section>'
    ].join('');
  }

  function detailHTML(resource) {
    if (!resource) return '';
    var externalInfo;
    try { externalInfo = fileContext().files.externalLinkInfo(resource, fileActor()); } catch (error) { externalInfo = null; }
    var title = externalInfo ? (externalInfo.kind === 'folder' ? '外部文件夹详情' : '外部链接详情') : '文件详情';
    return '<div class="eva-drive-dialog eva-file-detail-dialog" role="dialog" aria-modal="true" aria-labelledby="eva-file-detail-title"><button class="eva-drive-dialog__mask" type="button" data-drive-action="detail-close" aria-label="关闭文件详情"></button><section class="eva-drive-dialog__panel eva-file-detail-dialog__panel"><header><h2 id="eva-file-detail-title">' + title + '</h2><button type="button" data-drive-action="detail-close" aria-label="关闭文件详情">' + icon('x') + '</button></header><div class="eva-drive-dialog__body"><div class="eva-file-detail-dialog__content">' + detailContentHTML(resource) + '</div></div></section></div>';
  }

  function resourceSourceLabel(resource) {
    var context = fileContext();
    if (context && context.files.sourceLabelFor) return context.files.sourceLabelFor(resource, fileActor());
    if (resource.source && resource.source.label) return resource.source.label;
    if (resource.area === 'project') return '项目 · ' + workspaceName(resource.projectId);
    if (resource.area === 'personal') return '个人空间';
    return '项目空间';
  }

  function resourceFileType(resource) {
    var context = fileContext();
    return context && context.files.fileTypeFor ? context.files.fileTypeFor(resource, fileActor()) : resource.type === 'folder' ? '文件夹' : '其他';
  }

  function relationsFor(resource) {
    var context = fileContext();
    return context && context.files.relationsFor ? context.files.relationsFor(resource, fileActor()) : [];
  }

  function relationIconName(type) {
    return type === 'task' ? 'task' : type === 'ai-conversation' ? 'automation' : type === 'group' || type === 'chat' ? 'users' : 'file';
  }

  function relationTypeLabel(type) {
    return type === 'task' ? '任务' : type === 'group' ? '群聊' : type === 'chat' ? '私聊' : type === 'ai-conversation' ? 'AI 团队会话' : '来源文件';
  }

  function openRelationSource(relation) {
    if (!relation || relation.restricted || !relation.navigable) return false;
    var target = relation.target || {}, params;
    if (relation.type === 'ai-conversation' && target.identityId) {
      params = new URLSearchParams({ evaIM: 'my-ai', evaIdentity: target.identityId });
      if (target.sessionId) params.set('evaSession', target.sessionId);
      if (target.messageId) params.set('evaMessage', target.messageId);
      location.hash = '#/messages?' + params.toString();
      return true;
    }
    if (relation.type === 'chat' && relation.id) {
      params = new URLSearchParams({ evaDM: relation.id });
      if (target.messageId) params.set('evaMessage', target.messageId);
      location.hash = '#/messages?' + params.toString();
      return true;
    }
    if (relation.type === 'group' && relation.id) {
      location.hash = '#/messages';
      setTimeout(function () {
        window.dispatchEvent(new CustomEvent('eva-im:open', { detail: { conversationId: target.groupId || relation.id, threadId: target.threadId || null, messageId: target.messageId || null } }));
      }, 80);
      return true;
    }
    return false;
  }

  function tagsHTML(resource) {
    var tags = resource.tags || [];
    if (!tags.length) return resource.type === 'folder' ? '<span class="eva-file-muted">文件夹</span>' : '';
    return '<span class="eva-drive__name-tags">' + tags.slice(0, 2).map(function (tag) { return '<span class="eva-file-tag">' + escapeHTML(tag) + '</span>'; }).join('') + (tags.length > 2 ? '<span class="eva-file-tag is-more">+' + (tags.length - 2) + '</span>' : '') + '</span>';
  }

  function relationCellHTML(resource) {
    var externalInfo;
    try { externalInfo = fileContext().files.externalLinkInfo(resource, fileActor()); } catch (error) { externalInfo = null; }
    if (externalInfo) return '<span class="eva-relation-cell"><span class="eva-relation-chip is-external" title="' + escapeHTML(externalInfo.url) + '">' + icon(externalInfo.kind === 'folder' ? 'folder' : 'link') + escapeHTML(externalInfo.providerLabel + ' · ' + externalInfo.host) + '</span></span>';
    var relations = relationsFor(resource);
    if (!relations.length) return '<span class="eva-file-muted">—</span>';
    return '<span class="eva-relation-cell">' + relations.slice(0, 2).map(function (relation) {
      return '<span class="eva-relation-chip' + (relation.restricted ? ' is-restricted' : '') + '" title="' + escapeHTML(relation.meta || relation.label) + '">' + icon(relationIconName(relation.type)) + escapeHTML(relation.label) + '</span>';
    }).join('') + (relations.length > 2 ? '<span class="eva-relation-more">+' + (relations.length - 2) + '</span>' : '') + '</span>';
  }

  function relationDetailsHTML(resource) {
    var relations = relationsFor(resource);
    if (!relations.length) return '<p class="eva-file-detail__empty">当前文件没有系统关联</p>';
    return '<div class="eva-file-relations">' + relations.map(function (relation, index) {
      var action = relation.navigable && !relation.restricted && ['ai-conversation', 'chat', 'group'].includes(relation.type) ? '<button class="eva-file-relation__action" type="button" data-drive-action="open-relation" data-drive-relation-index="' + index + '">查看来源</button>' : '';
      return '<div class="eva-file-relation"><span class="eva-file-relation__icon">' + icon(relationIconName(relation.type)) + '</span><span><small>' + relationTypeLabel(relation.type) + '</small><strong>' + escapeHTML(relation.label) + '</strong>' + (relation.meta ? '<em>' + escapeHTML(relation.meta) + '</em>' : '') + '</span>' + action + '</div>';
    }).join('') + '</div>';
  }

  function shortcutDetailsHTML(resource) {
    var info = fileContext().files.shortcutInfo(resource, fileActor());
    if (!info) return '';
    return '<section class="eva-file-detail__section"><div class="eva-file-detail__section-head"><h3>快捷方式信息</h3></div><dl class="eva-drive__meta"><div><dt>访问状态</dt><dd>' + escapeHTML(info.statusLabel) + '</dd></div>' + (info.status === 'available' ? '<div><dt>源文件</dt><dd>' + escapeHTML(info.sourceName) + '</dd></div><div><dt>来源空间</dt><dd>' + escapeHTML(info.sourceSpaceName) + '</dd></div>' : '<div><dt>权限说明</dt><dd>快捷方式不会授予源文件权限</dd></div>') + '</dl></section>';
  }

  function spaceRootLabel(resource) {
    if (resource.area === 'personal') return '个人空间';
    return workspaceName(resource.projectId || resource.spaceId) + ' / 团队文件';
  }

  function resourceLocationLabel(resource) {
    var snapshot = fileContext().files.snapshot(fileActor()), names = [], current = resource;
    while (current && current.parent_id) {
      current = snapshot.find(function (item) { return item.id === current.parent_id; });
      if (current) names.unshift(current.name);
    }
    return [spaceRootLabel(resource)].concat(names).join(' / ');
  }

  function originalLocationLabel(resource) {
    var parent = fileContext().files.snapshot(fileActor()).find(function (item) { return item.id === resource.originalParentId; });
    return spaceRootLabel(resource) + (parent ? ' / ' + parent.name : ' / 根目录');
  }

  function rowMenuItemHTML(action, label, danger) {
    return '<button type="button" role="menuitem" data-drive-action="' + action + '"' + (danger ? ' class="is-danger"' : '') + '>' + escapeHTML(label) + '</button>';
  }

  function captureTableScroll() {
    var table = document.querySelector('#eva-drive-root .eva-drive__table');
    state.tableScroll = table ? { left: table.scrollLeft, top: table.scrollTop } : null;
  }

  function closeRowMenu(preserveScroll) {
    if (preserveScroll !== false) captureTableScroll();
    state.menuId = null;
    state.menuAnchor = null;
  }

  function rowMenuAnchor(trigger, itemCount) {
    var rect = trigger.getBoundingClientRect();
    var viewportHeight = window.visualViewport ? window.visualViewport.height : window.innerHeight;
    var menuHeight = Math.min(itemCount * 34 + 10, Math.max(160, viewportHeight - 24));
    var roomBelow = viewportHeight - rect.bottom - 12;
    var opensUp = roomBelow < menuHeight && rect.top > roomBelow;
    return {
      left: Math.max(12, Math.round(rect.right - 168)),
      top: opensUp ? null : Math.round(rect.bottom + 4),
      bottom: opensUp ? Math.max(12, Math.round(viewportHeight - rect.top + 4)) : null,
      direction: opensUp ? 'up' : 'down'
    };
  }

  function rowActionsHTML(resource) {
    var context = fileContext(), actor = fileActor(), isTrash = state.driveScope === 'trash';
    var shortcutInfo = context.files.shortcutInfo(resource, actor), canOpen = !shortcutInfo || shortcutInfo.status === 'available';
    var externalInfo = canOpen ? context.files.externalLinkInfo(resource, actor) : null, isExternal = Boolean(externalInfo);
    var canDownload = resource.type !== 'folder' && !isExternal && canOpen && context.files.can('download', resource.spaceId, actor);
    var open = state.menuId === String(resource.id), items = [];
    if (isTrash) {
      items.push(rowMenuItemHTML('select', '查看文件信息'));
      if (context.files.can('restore', resource.spaceId, actor)) items.push(rowMenuItemHTML('restore', '恢复'));
      if (context.files.can('delete-forever', resource.spaceId, actor)) items.push(rowMenuItemHTML('delete-forever', '永久删除', true));
    } else {
      if (resource.type === 'folder') items.push(rowMenuItemHTML('open-folder', '打开文件夹'));
      else if (isExternal) items.push(rowMenuItemHTML('open-external', externalInfo.kind === 'folder' ? '打开原文件夹' : '打开原链接'));
      else if (canOpen) items.push(rowMenuItemHTML('preview', '预览'));
      if (canDownload) items.push(rowMenuItemHTML('download', '下载'));
      items.push(rowMenuItemHTML('select', '查看文件信息'));
      if (isExternal) items.push(rowMenuItemHTML('copy-external-link', externalInfo.kind === 'folder' ? '复制文件夹链接' : '复制外部链接'));
      items.push(rowMenuItemHTML('copy-link', '复制内部链接'));
      if (context.files.can('rename', resource.spaceId, actor)) items.push(rowMenuItemHTML('rename', '重命名'));
      if (resource.type === 'external_link' && context.files.can('edit-external-link', resource.spaceId, actor)) items.push(rowMenuItemHTML('edit-external-link', externalInfo && externalInfo.kind === 'folder' ? '编辑外部文件夹' : '编辑链接'));
      if (context.files.can('move', resource.spaceId, actor)) items.push(rowMenuItemHTML('move', '移动'));
      if (resource.type !== 'shortcut' && !isExternal && context.files.can('copy', resource.spaceId, actor)) items.push(rowMenuItemHTML('copy', '创建副本'));
      if (resource.type !== 'folder' && resource.type !== 'shortcut' && context.files.can('create-shortcut', resource.spaceId, actor)) items.push(rowMenuItemHTML('create-shortcut', '创建快捷方式'));
      if (resource.type !== 'folder' && context.files.can('edit-tags', resource.spaceId, actor)) items.push(rowMenuItemHTML('tags', '编辑标签'));
      if (context.files.can('trash', resource.spaceId, actor)) items.push(rowMenuItemHTML('trash', '移至回收站', true));
    }
    var anchor = state.menuAnchor;
    var menuStyle = anchor ? 'left:' + anchor.left + 'px;' + (anchor.top == null ? 'bottom:' + anchor.bottom + 'px;' : 'top:' + anchor.top + 'px;') : '';
    return '<span class="eva-drive__row-actions"><button class="eva-drive__row-more" type="button" data-drive-action="row-menu" data-drive-menu-size="' + items.length + '" aria-label="更多操作：' + escapeHTML(resource.name) + '" aria-haspopup="menu" aria-expanded="' + open + '">' + icon('more') + '</button>' + (open ? '<span class="eva-drive__row-menu is-' + (anchor ? anchor.direction : 'down') + '" role="menu" aria-label="' + escapeHTML(resource.name) + '的操作" style="' + menuStyle + '">' + items.join('') + '</span>' : '') + '</span>';
  }

  function tableHTML(list) {
    if (!list.length) {
      var emptyCopy = state.query.trim() ? '没有匹配的文件' : state.driveScope === 'workspace' ? '当前项目暂无文件' : '暂无文件';
      return '<div class="eva-drive__empty">' + emptyCopy + '</div>';
    }
    return [
      '<div class="eva-drive__table eva-drive__table--with-source' + (state.driveScope === 'trash' ? ' eva-drive__table--trash' : '') + '" role="table" tabindex="0" aria-label="文件列表，可左右滚动">',
      '<div class="eva-drive__table-head" role="row"><span>名称</span><span>文件类型</span><span>' + (state.driveScope === 'trash' ? '原位置' : '关联内容') + '</span><span>大小</span><span>' + (state.driveScope === 'trash' ? '删除信息' : '创建信息') + '</span><span>操作</span></div>',
      list.map(function (resource) {
        var common = [
          '<div class="eva-drive__row" role="row" data-resource-id="' + resource.id + '" aria-selected="' + (resource.id === state.selectedId ? 'true' : 'false') + '">',
          '<button class="eva-drive__name-cell" type="button" data-drive-action="' + (resource.type === 'folder' ? (state.driveScope === 'trash' ? 'noop' : 'open-folder') : state.driveScope === 'trash' ? 'noop' : resource.type === 'external_link' ? 'open-external' : 'preview') + '"><span class="eva-drive__file-mark ' + fileMarkClass(resource) + '">' + fileMarkIconHTML(resource) + '</span><span class="eva-drive__name-copy"><strong>' + escapeHTML(resource.name) + '</strong>' + tagsHTML(resource) + '</span></button>',
        ];
        common.push('<span><span class="eva-file-type">' + escapeHTML(resourceFileType(resource)) + '</span></span>');
        common.push(state.driveScope === 'trash' ? '<span class="eva-file-location-cell">' + escapeHTML(originalLocationLabel(resource)) + '</span>' : relationCellHTML(resource));
        common.push('<span>' + escapeHTML(resource.type === 'folder' ? '—' : formatDriveBytes(resource.size)) + '</span>');
        common.push('<span class="eva-created-cell"><strong>' + escapeHTML(state.driveScope === 'trash' ? resource.deletedBy || '—' : resource.creator || '—') + '</strong><small>' + escapeHTML(formatDriveTime(state.driveScope === 'trash' ? resource.deletedAt : resource.createdAt)) + '</small></span>');
        common.push(rowActionsHTML(resource), '</div>');
        return common.join('');
      }).join(''),
      '</div>'
    ].join('');
  }

  function treeButton(scope, label, iconName, child, spaceId) {
    var current = state.driveScope === scope && (!spaceId || state.workspaceId === spaceId);
    var spaceAttribute = !spaceId ? '' : ' data-workspace-id="' + escapeHTML(spaceId) + '"';
    return '<button type="button" class="' + (child ? 'is-child' : '') + '" data-drive-scope="' + scope + '"' + spaceAttribute + ' aria-current="' + (current ? 'page' : 'false') + '">' + icon(iconName, 'eva-drive-icon ' + (iconName === 'folder' ? 'is-folder' : '')) + '<span>' + escapeHTML(label) + '</span></button>';
  }

  function targetOptionsHTML(selectedSpaceId) {
    var context = fileContext(), actor = fileActor();
    var personal = [{ id: personalSpaceId(), label: '个人空间' }];
    var projects = [];
    WORKSPACES.forEach(function (workspace) {
      var role = context.files.role(workspace.id, actor);
      if (role) projects.push({ id: workspace.id, label: workspace.name });
    });
    function options(label, spaces) {
      return '<optgroup label="' + label + '">' + spaces.map(function (space) { return '<option value="' + escapeHTML(space.id) + '"' + (space.id === selectedSpaceId ? ' selected' : '') + '>' + escapeHTML(space.label) + '</option>'; }).join('') + '</optgroup>';
    }
    return options('个人空间', personal) + options('项目空间', projects);
  }

  function shortcutTargetOptionsHTML(sourceSpaceId, selectedSpaceId) {
    return fileContext().files.writableSpaces(fileActor(), sourceSpaceId).map(function (space) {
      var prefix = space.kind === 'personal' ? '个人空间' : '项目空间';
      return '<option value="' + escapeHTML(space.id) + '"' + (space.id === selectedSpaceId ? ' selected' : '') + '>' + escapeHTML(prefix + ' · ' + space.name) + '</option>';
    }).join('');
  }

  function shortcutFolderOptionsHTML(spaceId, selectedParentId) {
    if (!spaceId) return '<option value="0">根目录</option>';
    var folders = fileContext().files.list(spaceId, fileActor()).filter(function (item) { return item.type === 'folder'; });
    return '<option value="0">根目录</option>' + folders.map(function (folder) {
      return '<option value="' + escapeHTML(folder.id) + '"' + (folder.id === selectedParentId ? ' selected' : '') + '>' + escapeHTML(folder.name) + '</option>';
    }).join('');
  }

  function tagSuggestions(resource) {
    var selected = state.dialog && Array.isArray(state.dialog.tags) ? state.dialog.tags : [];
    var seen = {};
    return fileContext().files.list(resource.spaceId, fileActor()).reduce(function (tags, item) {
      (item.tags || []).forEach(function (tag) {
        if (!seen[tag] && !selected.includes(tag)) { seen[tag] = true; tags.push(tag); }
      });
      return tags;
    }, []);
  }

  function tagEditorHTML(resource) {
    var tags = Array.isArray(state.dialog.tags) ? state.dialog.tags : [];
    var query = String(state.dialog.tagInput || '').trim().toLowerCase();
    var suggestions = tagSuggestions(resource).filter(function (tag) { return !query || tag.toLowerCase().includes(query); });
    var selected = tags.length ? tags.map(function (tag) {
      return '<span class="eva-tag-editor__chip"><span>' + escapeHTML(tag) + '</span><button type="button" data-drive-action="tag-remove" data-drive-tag-value="' + escapeHTML(tag) + '" aria-label="移除标签 ' + escapeHTML(tag) + '">' + icon('x') + '</button></span>';
    }).join('') : '<span class="eva-tag-editor__empty">暂未选择标签</span>';
    var options = suggestions.length ? suggestions.map(function (tag) {
      return '<button class="eva-tag-editor__option" type="button" role="option" data-drive-action="tag-option" data-drive-tag-value="' + escapeHTML(tag) + '">' + escapeHTML(tag) + '</button>';
    }).join('') : '<span class="eva-tag-editor__empty">没有匹配标签，按回车新建</span>';
    var dropdown = state.dialog.tagDropdownOpen === false ? '' : '<div id="eva-drive-tag-options" class="eva-tag-editor__dropdown" role="listbox" aria-label="当前空间已有标签">' + options + '</div>';
    return '<div class="eva-tag-editor"><span class="eva-tag-editor__label">自定义标签</span><div class="eva-tag-editor__selected">' + selected + '</div><div class="eva-tag-editor__control"><input id="eva-drive-dialog-tags" data-drive-tag-input type="text" value="' + escapeHTML(state.dialog.tagInput || '') + '" maxlength="20" placeholder="输入或选择标签" role="combobox" aria-label="输入或选择标签" aria-expanded="' + (state.dialog.tagDropdownOpen === false ? 'false' : 'true') + '" aria-controls="eva-drive-tag-options" autocomplete="off"><button class="eva-tag-editor__toggle" type="button" data-drive-action="tag-dropdown-toggle" aria-label="' + (state.dialog.tagDropdownOpen === false ? '展开已有标签' : '收起已有标签') + '">' + icon('arrow') + '</button></div>' + dropdown + (state.dialog.tagError ? '<small class="eva-project-files__error">' + escapeHTML(state.dialog.tagError) + '</small>' : '') + '</div>';
  }

  function addDialogTag(value) {
    if (!state.dialog || state.dialog.type !== 'tags') return;
    var input = String(value == null ? state.dialog.tagInput || '' : value).trim().slice(0, 20);
    var tags = Array.isArray(state.dialog.tags) ? state.dialog.tags.slice() : [];
    var resource = fileContext().files.snapshot(fileActor()).find(function (item) { return item.id === state.dialog.id; });
    var existing = resource ? tagSuggestions(resource).find(function (tag) { return tag.toLowerCase() === input.toLowerCase(); }) : null;
    var tag = existing || input;
    if (!tag) { state.dialog.tagError = '请输入标签名称'; return; }
    if (tags.some(function (selected) { return selected.toLowerCase() === tag.toLowerCase(); })) { state.dialog.tagInput = ''; state.dialog.tagError = '该标签已选择'; return; }
    if (tags.length >= 8) { state.dialog.tagError = '每个文件最多添加 8 个标签'; return; }
    tags.push(tag);
    state.dialog.tags = tags;
    state.dialog.tagInput = '';
    state.dialog.tagError = '';
  }

  function externalFolderDetectionHTML(url) {
    if (!String(url || '').trim()) return '<div class="eva-external-link-detection" data-external-folder-detection role="status" aria-live="polite">' + icon('folder') + '<span><strong>等待识别</strong><small>粘贴链接后识别来源平台</small></span></div>';
    try {
      var info = fileContext().files.inspectExternalLink(url, { kind: 'folder' });
      var provider = info.provider === 'web' ? '其他平台' : info.providerLabel;
      var description = info.detection === 'pattern' ? '已识别为文件夹链接' : '链接类型由你确认，将按外部文件夹保存';
      return '<div class="eva-external-link-detection is-ready" data-external-folder-detection role="status" aria-live="polite">' + icon(info.provider === 'feishu' ? 'link' : info.provider === 'wecom' ? 'users' : 'folder') + '<span><strong>' + escapeHTML(provider + ' · 文件夹') + '</strong><small>' + escapeHTML(description) + '</small></span></div>';
    } catch (error) {
      return '<div class="eva-external-link-detection is-error" data-external-folder-detection role="status" aria-live="polite">' + icon('external') + '<span><strong>无法按文件夹保存</strong><small>' + escapeHTML(error.message || '无法识别该链接') + '</small></span></div>';
    }
  }

  function dialogHTML() {
    if (!state.dialog) return '';
    var type = state.dialog.type, resource = state.dialog.id ? fileContext().files.snapshot(fileActor()).find(function (item) { return item.id === state.dialog.id; }) : null;
    var externalFolderDialog = type === 'add-external-folder' || (type === 'edit-external-link' && resource && resource.external && resource.external.kind === 'folder');
    var title = type === 'new-folder' ? '新建文件夹' : type === 'add-external-folder' ? '添加外部文件夹' : type === 'add-external-link' ? '添加外部链接' : type === 'edit-external-link' ? (externalFolderDialog ? '编辑外部文件夹' : '编辑外部链接') : type === 'target-upload' ? '选择上传位置' : type === 'create-shortcut' ? '创建快捷方式' : type === 'tags' ? '编辑标签' : type === 'rename' ? '重命名' : type === 'move' ? '移动到' : type === 'trash' ? '移至回收站' : '永久删除';
    var content = '';
    if (type === 'new-folder') content = '<label class="eva-drive-dialog__field"><span>文件夹名称</span><input id="eva-drive-dialog-name" value="" placeholder="请输入文件夹名称" autofocus></label>';
    if (type === 'add-external-folder' || type === 'add-external-link' || type === 'edit-external-link') {
      var linkInfo = resource ? fileContext().files.externalLinkInfo(resource, fileActor()) : null;
      var externalName = state.dialog.name == null ? resource ? resource.name : '' : state.dialog.name;
      var externalURL = state.dialog.url == null ? linkInfo ? linkInfo.url : '' : state.dialog.url;
      var nameField = '<label class="eva-drive-dialog__field"><span>' + (externalFolderDialog ? '文件夹名称' : '链接名称') + '</span><input id="eva-drive-dialog-external-name" value="' + escapeHTML(externalName) + '" maxlength="100" placeholder="' + (externalFolderDialog ? '例如：供应商交付资料' : '例如：供应商协作飞书文档') + '"' + (externalFolderDialog ? '' : ' autofocus') + '></label>';
      var urlField = '<label class="eva-drive-dialog__field"><span>' + (externalFolderDialog ? '文件夹链接' : '外部链接') + '</span><input id="eva-drive-dialog-external-url" type="url" value="' + escapeHTML(externalURL) + '" placeholder="https://"' + (externalFolderDialog ? ' autofocus' : '') + '></label>';
      content = (externalFolderDialog ? urlField + externalFolderDetectionHTML(externalURL) + nameField : nameField + urlField) + (state.dialog.confirmHostChange ? '<div class="eva-external-link-warning">' + icon('external') + '<span>链接域名发生变化。请确认新地址可信后再保存。</span></div>' : '') + (state.dialog.error ? '<small class="eva-project-files__error">' + escapeHTML(state.dialog.error) + '</small>' : '') + '<p class="eva-drive-dialog__hint">' + (externalFolderDialog ? '仅保存访问入口，不复制或同步文件夹内容；访问权限仍由原平台控制。' : '仅保存访问入口，不复制外部内容、版本和评论；访问权限仍由原平台控制。') + '</p>';
    }
    if (type === 'target-upload') content = '<label class="eva-drive-dialog__field"><span>上传到</span><select id="eva-drive-dialog-space">' + targetOptionsHTML(state.dialog.spaceId || personalSpaceId()) + '</select></label><p class="eva-drive-dialog__hint">上传后文件继承目标空间的角色权限。</p>';
    if (type === 'rename') content = '<label class="eva-drive-dialog__field"><span>新名称</span><input id="eva-drive-dialog-name" value="' + escapeHTML(resource ? resource.name : '') + '" autofocus></label>';
    if (type === 'tags' && resource) content = tagEditorHTML(resource) + '<p class="eva-drive-dialog__hint">从下拉框选择已有标签，或直接输入后按回车新建。最多 8 个标签。</p>';
    if (type === 'create-shortcut' && resource) {
      var shortcutSpaces = fileContext().files.writableSpaces(fileActor(), resource.spaceId);
      content = shortcutSpaces.length ? '<div class="eva-shortcut-source"><span>源文件</span><strong>' + escapeHTML(resource.name) + '</strong><small>' + escapeHTML(spaceRootLabel(resource)) + '</small></div><label class="eva-drive-dialog__field"><span>目标空间</span><select id="eva-drive-dialog-shortcut-space">' + shortcutTargetOptionsHTML(resource.spaceId, state.dialog.targetSpaceId) + '</select></label><label class="eva-drive-dialog__field"><span>目标文件夹</span><select id="eva-drive-dialog-shortcut-parent">' + shortcutFolderOptionsHTML(state.dialog.targetSpaceId, state.dialog.targetParentId || 0) + '</select></label><p class="eva-drive-dialog__hint">快捷方式不复制文件，也不会向目标空间成员授予源文件权限。</p>' : '<p>没有其他可写入的空间，暂时无法创建跨空间快捷方式。</p>';
    }
    if (type === 'move') {
      var folders = fileContext().files.list(resource.spaceId, fileActor()).filter(function (item) { return item.type === 'folder' && item.id !== resource.id; });
      content = '<label class="eva-drive-dialog__field"><span>目标文件夹</span><select id="eva-drive-dialog-parent"><option value="0">根目录</option>' + folders.map(function (item) { return '<option value="' + escapeHTML(item.id) + '">' + escapeHTML(item.name) + '</option>'; }).join('') + '</select></label><p class="eva-drive-dialog__hint">仅允许在当前空间内移动。</p>';
    }
    if (type === 'trash') content = '<p>将“' + escapeHTML(resource.name) + '”' + (resource.type === 'folder' ? '及其中内容' : '') + '移至回收站？Owner 或 Manager 可恢复。</p>';
    if (type === 'delete-forever') content = '<p>永久删除“' + escapeHTML(resource.name) + '”' + (resource.type === 'folder' ? '及其中内容' : '') + '后不可恢复。</p>';
    var confirmLabel = type === 'add-external-folder' ? '添加文件夹' : type === 'add-external-link' ? '添加链接' : type === 'edit-external-link' ? (state.dialog.confirmHostChange ? '确认更换并保存' : '保存') : type === 'target-upload' ? '选择文件' : type === 'create-shortcut' ? '创建快捷方式' : type === 'tags' ? '保存' : type === 'trash' ? '移至回收站' : type === 'delete-forever' ? '永久删除' : '确认';
    var noShortcutTarget = type === 'create-shortcut' && !fileContext().files.writableSpaces(fileActor(), resource.spaceId).length;
    var confirm = noShortcutTarget ? '' : '<button class="' + (type === 'delete-forever' || type === 'trash' ? 'is-danger' : 'is-primary') + '" type="button" data-drive-action="dialog-confirm">' + confirmLabel + '</button>';
    return '<div class="eva-drive-dialog" role="dialog" aria-modal="true" aria-labelledby="eva-drive-dialog-title"><button class="eva-drive-dialog__mask" type="button" data-drive-action="dialog-close" aria-label="关闭"></button><section class="eva-drive-dialog__panel"><header><h2 id="eva-drive-dialog-title">' + title + '</h2><button type="button" data-drive-action="dialog-close" aria-label="关闭">' + icon('x') + '</button></header><div class="eva-drive-dialog__body">' + content + '</div><footer><button type="button" data-drive-action="dialog-close">' + (confirm ? '取消' : '关闭') + '</button>' + confirm + '</footer></section></div>';
  }

  function filePreviewFixture(resource) {
    return (window.__EVA_FILE_PREVIEW_FIXTURES && window.__EVA_FILE_PREVIEW_FIXTURES[resource.sourceFileName || resource.name]) || {};
  }

  function wordPreviewHTML(resource) {
    var fixture = filePreviewFixture(resource);
    var pages = fixture.pages;
    if (!pages?.length) return '<p class="eva-file-preview-sidebar__empty">此文件未提供在线预览内容。</p>';
    return '<div class="eva-word-preview" aria-label="Word 文档内容">' + pages.map(function (page, index) {
      return '<article class="eva-word-preview__page" aria-label="第 ' + (index + 1) + ' 页"><small class="eva-word-preview__kicker">' + escapeHTML(page.kicker || 'Word 文档') + '</small><h2>' + escapeHTML(page.title || resource.name) + '</h2>' + (page.subtitle ? '<p class="eva-word-preview__subtitle">' + escapeHTML(page.subtitle) + '</p>' : '') + (page.paragraphs || []).map(function (paragraph) { return '<p>' + escapeHTML(paragraph) + '</p>'; }).join('') + (page.sections || []).map(function (section) { return '<section><h3>' + escapeHTML(section.title) + '</h3><p>' + escapeHTML(section.text) + '</p></section>'; }).join('') + '<footer>' + (index + 1) + ' / ' + pages.length + '</footer></article>';
    }).join('') + '</div>';
  }

  function sheetPreviewHTML(resource) {
    var fixture = filePreviewFixture(resource);
    var sheets = fixture.sheets;
    if (!sheets?.length) return '<p class="eva-file-preview-sidebar__empty">此文件未提供在线预览内容。</p>';
    var sheetIndex = Math.min(state.previewSheet || 0, sheets.length - 1), sheet = sheets[sheetIndex];
    return '<div class="eva-sheet-preview" aria-label="Excel 表格内容"><div class="eva-sheet-preview__formula"><strong>fx</strong><span>' + escapeHTML(resource.name.replace(/\.[^.]+$/, '')) + '</span></div><div class="eva-sheet-preview__viewport"><table><thead><tr><th class="is-corner"></th>' + sheet.columns.map(function (column) { return '<th>' + escapeHTML(column) + '</th>'; }).join('') + '</tr></thead><tbody>' + sheet.rows.map(function (row, rowIndex) { return '<tr><th>' + (rowIndex + 1) + '</th>' + row.map(function (cell) { return '<td>' + escapeHTML(cell) + '</td>'; }).join('') + '</tr>'; }).join('') + '</tbody></table></div><div class="eva-sheet-preview__tabs">' + sheets.map(function (item, index) { return '<button type="button" class="' + (index === sheetIndex ? 'is-active' : '') + '" data-drive-action="preview-sheet" data-preview-sheet-index="' + index + '">' + escapeHTML(item.name) + '</button>'; }).join('') + '<span>' + sheet.rows.length + ' 行</span></div></div>';
  }

  function presentationPreviewHTML(resource) {
    var fixture = filePreviewFixture(resource);
    var slides = fixture.slides;
    if (!slides?.length) return '<p class="eva-file-preview-sidebar__empty">此文件未提供在线预览内容。</p>';
    var index = Math.min(state.previewPage || 0, slides.length - 1), slide = slides[index];
    return '<div class="eva-presentation-preview" aria-label="PPT 幻灯片内容"><div class="eva-presentation-preview__stage"><article class="eva-presentation-preview__slide is-' + escapeHTML(slide.accent || 'violet') + '" aria-label="第 ' + (index + 1) + ' 张幻灯片"><small>' + escapeHTML(slide.eyebrow || '演示文稿') + '</small><h2>' + escapeHTML(slide.title) + '</h2><p>' + escapeHTML(slide.subtitle || '') + '</p>' + (slide.metric ? '<strong class="eva-presentation-preview__metric">' + escapeHTML(slide.metric) + '</strong>' : '') + (slide.bullets ? '<ul>' + slide.bullets.map(function (item) { return '<li>' + escapeHTML(item) + '</li>'; }).join('') + '</ul>' : '') + '</article></div><div class="eva-presentation-preview__thumbs" aria-label="幻灯片缩略图">' + slides.map(function (item, itemIndex) { return '<button type="button" class="' + (itemIndex === index ? 'is-active' : '') + '" data-drive-action="preview-slide" data-preview-slide-index="' + itemIndex + '" aria-label="查看第 ' + (itemIndex + 1) + ' 张"><span>' + (itemIndex + 1) + '</span><small>' + escapeHTML(item.title) + '</small></button>'; }).join('') + '</div><div class="eva-presentation-preview__controls"><button type="button" data-drive-action="preview-prev"' + (index === 0 ? ' disabled' : '') + '>上一页</button><span>' + (index + 1) + ' / ' + slides.length + '</span><button type="button" data-drive-action="preview-next"' + (index === slides.length - 1 ? ' disabled' : '') + '>下一页</button></div></div>';
  }

  function markdownPreviewHTML(resource) {
    var fixture = filePreviewFixture(resource).markdown;
    if (!fixture) return '<p class="eva-file-preview-sidebar__empty">此文件未提供在线预览内容。</p>';
    var source = '# ' + fixture.title + '\n\n' + fixture.summary + '\n\n' + fixture.sections.map(function (section) { return '## ' + section.title + '\n\n' + section.paragraph + '\n\n' + (section.items || []).map(function (item) { return '- ' + item; }).join('\n'); }).join('\n\n');
    var toolbar = '<div class="eva-markdown-preview__toolbar"><button type="button" class="' + (state.previewMode === 'rendered' ? 'is-active' : '') + '" data-drive-action="preview-mode" data-preview-mode="rendered">阅读</button><button type="button" class="' + (state.previewMode === 'source' ? 'is-active' : '') + '" data-drive-action="preview-mode" data-preview-mode="source">源码</button></div>';
    if (state.previewMode === 'source') return '<div class="eva-markdown-preview">' + toolbar + '<pre class="eva-markdown-preview__source"><code>' + escapeHTML(source) + '</code></pre></div>';
    return '<div class="eva-markdown-preview">' + toolbar + '<article><h1>' + escapeHTML(fixture.title) + '</h1><p class="eva-markdown-preview__summary">' + escapeHTML(fixture.summary) + '</p>' + fixture.sections.map(function (section) { return '<section><h2>' + escapeHTML(section.title) + '</h2><p>' + escapeHTML(section.paragraph) + '</p>' + (section.items && section.items.length ? '<ul>' + section.items.map(function (item) { return '<li>' + escapeHTML(item) + '</li>'; }).join('') + '</ul>' : '') + '</section>'; }).join('') + '</article></div>';
  }

  function archivePreviewHTML(resource) {
    var archive = filePreviewFixture(resource).archive;
    if (!archive) return '<p class="eva-file-preview-sidebar__empty">此文件未提供在线预览内容。</p>';
    return '<div class="eva-archive-preview" aria-label="压缩包内容"><div class="eva-archive-preview__summary"><span><strong>' + archive.entries.length + '</strong><small>项目</small></span><span><strong>' + escapeHTML(archive.compressedSize || '—') + '</strong><small>压缩后</small></span><span><strong>' + escapeHTML(archive.originalSize || '—') + '</strong><small>原始大小</small></span></div><div class="eva-archive-preview__head"><span>名称</span><span>类型</span><span>大小</span></div><div class="eva-archive-preview__list">' + archive.entries.map(function (entry) { return '<div class="eva-archive-preview__row"><span>' + escapeHTML(entry.path) + '</span><small>' + escapeHTML(entry.type) + '</small><small>' + escapeHTML(entry.size) + '</small></div>'; }).join('') + '</div></div>';
  }

  function previewHTML() {
    if (!state.previewId) return '';
    var context = fileContext(), actor = fileActor();
    var resource = context.files.snapshot(actor).find(function (item) { return item.id === state.previewId; });
    if (!resource) return '';
    var target;
    try { target = context.files.resolveFile(resource, actor); } catch (error) { return ''; }
    var sampleURL = window.__EVA_FILE_SAMPLE_URLS && window.__EVA_FILE_SAMPLE_URLS[target.sourceFileName || target.name];
    var extension = String(target.extension || target.name.split('.').pop() || '').toLowerCase();
    var content;
    if (target.previewUrl) content = '<iframe class="eva-file-preview-sidebar__frame" sandbox="allow-same-origin" src="' + escapeHTML(target.previewUrl) + '" title="' + escapeHTML(target.name + '预览') + '"></iframe>';
    else if (['doc', 'docx'].includes(extension)) content = wordPreviewHTML(target);
    else if (['xlsx', 'xls', 'xlsb', 'xlsm', 'csv'].includes(extension)) content = sheetPreviewHTML(target);
    else if (['ppt', 'pptx'].includes(extension)) content = presentationPreviewHTML(target);
    else if (['md', 'markdown'].includes(extension)) content = markdownPreviewHTML(target);
    else if (['zip', 'rar', '7z', 'tar', 'gz'].includes(extension)) content = archivePreviewHTML(target);
    else if (sampleURL && extension === 'pdf') content = '<iframe class="eva-file-preview-sidebar__frame" src="' + escapeHTML(sampleURL) + '" title="' + escapeHTML(target.name + '预览') + '"></iframe>';
    else if (sampleURL && ['png', 'jpg', 'jpeg', 'gif', 'webp', 'svg'].includes(extension)) content = '<img class="eva-file-preview-sidebar__image" src="' + escapeHTML(sampleURL) + '" alt="' + escapeHTML(target.name) + '">';
    else content = '<div class="eva-file-preview-sidebar__empty"><span class="eva-drive__file-mark ' + fileMarkClass(target) + '">' + icon(fileIconName(target)) + '</span><strong>' + escapeHTML(target.name) + '</strong><span>' + escapeHTML(context.files.fileTypeFor(target, actor) + ' · ' + formatDriveBytes(target.size)) + '</span><p>当前格式暂不支持在线阅读，可下载后打开。</p></div>';
    return '<aside class="eva-file-preview-sidebar eva-drive-preview-sidebar" aria-label="文件预览"><header class="eva-file-preview-sidebar__head"><h2>' + escapeHTML(resource.name) + '</h2><button type="button" data-drive-action="preview-close" aria-label="关闭预览">' + icon('x') + '</button></header><div class="eva-file-preview-sidebar__body">' + content + '</div></aside>';
  }

  function downloadDriveFile(resource) {
    var context = fileContext(), actor = fileActor();
    var liveResource = resource && context.files.list(resource.spaceId, actor).find(function (item) { return item.id === resource.id; });
    var shortcutInfo = liveResource && context.files.shortcutInfo(liveResource, actor);
    var canOpen = !shortcutInfo || shortcutInfo.status === 'available';
    var canDownload = Boolean(liveResource && liveResource.type !== 'folder' && !liveResource.deletedAt && canOpen && context.files.can('download', liveResource.spaceId, actor));
    if (!canDownload) {
      showToast('当前文件无法下载');
      return;
    }
    try {
      var target = context.files.resolveFile(liveResource, actor);
      if (target.type === 'folder' || target.deletedAt || !context.files.can('download', target.spaceId, actor)) throw new Error('当前文件无法下载');
      var sampleURL = window.__EVA_FILE_SAMPLE_URLS && window.__EVA_FILE_SAMPLE_URLS[target.sourceFileName || target.name];
      var fallbackURL = window.__EVA_FILE_DOWNLOAD_FALLBACK_URL || 'prototype/assets/file-samples/file-placeholder.txt';
      var anchor = document.createElement('a');
      anchor.href = sampleURL || fallbackURL;
      anchor.download = target.name;
      anchor.rel = 'noopener';
      document.body.appendChild(anchor);
      anchor.click();
      anchor.remove();
    } catch (error) {
      showToast(error.message || '当前文件无法下载');
    }
  }

  function openExternalResource(resource) {
    try {
      var info = fileContext().files.externalLinkInfo(resource, fileActor());
      if (!info) throw new Error('当前资源不是外部链接');
      var popup = window.open(info.url, '_blank', 'noopener,noreferrer');
      if (popup) popup.opener = null;
      return true;
    } catch (error) {
      showToast(error.message || '当前外部链接无法打开');
      return false;
    }
  }

  function projectSpacesHTML() {
    var context = fileContext(), actor = fileActor(), all = context.files.all(actor);
    var projects = WORKSPACES.map(function (workspace) {
      var role = context.files.role(workspace.id, actor);
      if (!role) return null;
      var records = all.filter(function (resource) { return resource.projectId === workspace.id; });
      return { workspace: workspace, role: role, fileCount: records.filter(function (resource) { return resource.type !== 'folder'; }).length, folderCount: records.filter(function (resource) { return resource.type === 'folder'; }).length };
    }).filter(Boolean);
    if (!projects.length) return '<div class="eva-drive__empty">你还没有加入任何项目空间</div>';
    return '<div class="eva-drive-projects">' + projects.map(function (item) {
      var roleLabel = item.role === 'owner' ? 'Owner' : item.role === 'manager' ? 'Manager' : 'Editor';
      return '<button type="button" class="eva-drive-project-card" data-drive-scope="workspace" data-workspace-id="' + escapeHTML(item.workspace.id) + '"><span class="eva-drive-project-card__mark">' + escapeHTML(item.workspace.mark || item.workspace.name.slice(0, 1)) + '</span><span class="eva-drive-project-card__copy"><strong>' + escapeHTML(item.workspace.name) + '</strong><small>' + escapeHTML(item.workspace.description || '项目团队文件') + '</small><span>' + item.folderCount + ' 个文件夹 · ' + item.fileCount + ' 个文件</span></span><span class="eva-drive-project-card__role">' + roleLabel + '</span>' + icon('chevron') + '</button>';
    }).join('') + '</div>';
  }

  function externalAddMenuHTML() {
    return '<details class="eva-drive__external-add"><summary class="eva-drive__action" aria-label="添加外部资源" data-drive-action="toggle-external-add">' + icon('link') + '<span>添加外部资源</span>' + icon('arrow') + '</summary><span class="eva-drive__external-add-menu" role="menu" aria-label="添加外部资源"><button type="button" role="menuitem" data-drive-action="add-external-folder"><span class="eva-drive__external-add-icon">' + icon('folder') + '</span><span><strong>外部文件夹</strong><small>飞书、企业微信等文件夹入口</small></span></button><button type="button" role="menuitem" data-drive-action="add-external-link"><span class="eva-drive__external-add-icon">' + icon('link') + '</span><span><strong>普通外部链接</strong><small>文档、表格或网页入口</small></span></button></span></details>';
  }

  function driveHTML(list, selected) {
    var copy = scopeCopy();
    var context = fileContext(), actor = fileActor(), currentSpace = scopeSpaceId();
    var role = currentSpace ? context.files.role(currentSpace, actor) : null;
    var roleLabel = role === 'owner' ? 'Owner' : role === 'manager' ? 'Manager' : role === 'editor' ? 'Editor' : '';
    var crumbs = currentSpace && state.crumbs.length ? [{ id: 0, name: copy.section }].concat(state.crumbs) : [];
    return [
      '<aside class="eva-drive__side" aria-label="文件导航">',
      '<div class="eva-drive__side-head"><strong>文件库</strong></div>',
      '<nav class="eva-drive__tree">',
      '<div class="eva-drive__tree-group">文件空间</div>',
      treeButton('personal', '个人空间', 'file', false),
      treeButton('projects', '项目空间', 'workspace', false),
      WORKSPACES.map(function (item) { return treeButton('workspace', item.name, 'workspace', true, item.id); }).join(''),
      '<div class="eva-drive__tree-spacer"></div>',
      '<div class="eva-drive__tree-group">管理</div>',
      treeButton('trash', '回收站', 'folder', false),
      '</nav>',
      '</aside>',
      '<main class="eva-drive__main">',
      '<header class="eva-drive__header"><div><strong>' + escapeHTML(copy.title) + '</strong><span>' + escapeHTML(copy.subtitle) + '</span></div><span class="eva-drive__header-spacer"></span>',
      roleLabel ? '<span class="eva-drive__role">' + roleLabel + '</span>' : '',
      state.driveScope === 'workspace' ? '<button class="eva-drive__text-button" type="button" data-drive-action="open-project">' + icon('external') + '进入项目</button>' : '',
      '</header>',
      '<div class="eva-drive__scroll">',
      currentSpace && state.driveScope !== 'trash' ? '<div class="eva-drive__actions"><button class="eva-drive__action" type="button" data-drive-action="new-folder">' + icon('plus') + '<span>新建文件夹</span></button>' + externalAddMenuHTML() + '<button class="eva-drive__action eva-drive__action--primary" type="button" data-drive-action="upload-file">' + icon('upload') + '<span>上传本地文件</span></button></div>' : '',
      crumbs.length ? '<div class="eva-drive__pathbar"><button class="eva-drive__back-button" type="button" data-drive-action="up-folder">' + icon('chevron') + '<span>返回上一级</span></button><nav class="eva-drive__breadcrumbs" aria-label="文件路径">' + crumbs.map(function (crumb, index) { return '<button type="button" data-drive-action="breadcrumb" data-breadcrumb-index="' + index + '"' + (index === crumbs.length - 1 ? ' aria-current="page"' : '') + '>' + escapeHTML(crumb.name) + '</button>'; }).join('<span>/</span>') + '</nav></div>' : '',
      '</div>',
      '<div class="eva-drive__section-head"><div><h1>' + escapeHTML(copy.section) + '</h1><p>' + escapeHTML(copy.subtitle) + '</p></div><label class="eva-drive__side-search">' + icon('search') + '<input type="search" data-drive-search="main" value="' + escapeHTML(state.query) + '" placeholder="搜索当前位置"></label></div>',
      state.driveScope === 'projects' ? projectSpacesHTML() : tableHTML(list),
      '</div>',
      '<input id="eva-file-upload" type="file" multiple hidden>',
      '</main>',
      '<div class="eva-drive__toast" role="status" aria-live="polite" hidden></div>',
      detailHTML(selected),
      dialogHTML(),
      previewHTML()
    ].join('');
  }

  function renderDrive() {
    var root = ensureDriveRoot();
    var list = resourcesForScope();
    if (!state.selectedId || !list.some(function (resource) { return resource.id === state.selectedId; })) {
      state.selectedId = null;
    }
    var context = fileContext();
    var selected = context ? context.files.snapshot(fileActor()).find(function (resource) { return resource.id === state.selectedId; }) || null : null;
    root.innerHTML = driveHTML(list, selected);
    var table = root.querySelector('.eva-drive__table');
    if (table && state.tableScroll) {
      table.scrollLeft = state.tableScroll.left;
      table.scrollTop = state.tableScroll.top;
    }
    state.tableScroll = null;
    root.dataset.evaDriveScope = state.driveScope;
    root.dataset.evaWorkspaceId = state.workspaceId;
    root.hidden = false;
    syncDriveLeft();
  }

  function openDrive(entry, workspaceId, scope) {
    if (entry === 'workspace') state.mode = 'collaboration';
    state.driveEntry = entry || 'global';
    if (workspaceId) state.workspaceId = workspaceId;
    state.driveScope = scope || (entry === 'workspace' ? 'workspace' : state.driveScope || 'personal');
    state.query = '';
    state.selectedId = null;
    state.parentId = 0;
    state.crumbs = [];
    state.dialog = null;
    state.previewId = null;
    closeRowMenu(false);
    if (String(location.hash || '').indexOf('#/drive') !== 0) location.hash = '#/drive';
    else {
      renderDrive();
      syncShellGeometry();
    }
  }

  function openDriveFile(recordOrId) {
    var context = fileContext(), actor = fileActor();
    if (!context) return false;
    var id = typeof recordOrId === 'object' ? recordOrId && recordOrId.id : recordOrId;
    var available = context.files.all(actor);
    var resource = available.find(function (item) { return String(item.id) === String(id); });
    if (!resource) return false;
    var scope = resource.area === 'project' ? 'workspace' : 'personal';
    var workspaceId = resource.projectId || (resource.area === 'project' ? resource.spaceId : null);
    openDrive('global', workspaceId, scope);
    if (scope === 'workspace') state.workspaceId = workspaceId;
    var crumbs = [], currentId = resource.parent_id || 0, guard = 0;
    while (currentId && guard++ < 30) {
      var folder = available.find(function (item) { return item.id === currentId && item.spaceId === resource.spaceId; });
      if (!folder) break;
      crumbs.unshift({ id: folder.id, name: folder.name });
      currentId = folder.parent_id || 0;
    }
    state.parentId = resource.parent_id || 0;
    state.crumbs = crumbs;
    state.selectedId = resource.id;
    state.previewId = null;
    if (document.getElementById('eva-drive-root')) renderDrive();
    return true;
  }

  function closeDrive() {
    var root = document.getElementById('eva-drive-root');
    state.previewId = null;
    state.previewPage = 0;
    state.previewSheet = 0;
    state.previewMode = 'rendered';
    state.selectedId = null;
    state.dialog = null;
    closeRowMenu(false);
    if (root) root.hidden = true;
  }

  function syncDriveLeft() {
    var side = sidebar();
    var left = side ? Math.max(0, Math.round(side.getBoundingClientRect().right)) : 260;
    document.documentElement.style.setProperty('--eva-drive-left', left + 'px');
  }

  function showToast(message) {
    var toast = document.querySelector('.eva-drive__toast');
    if (!toast) return;
    toast.textContent = message;
    toast.hidden = false;
    clearTimeout(state.toastTimer);
    state.toastTimer = setTimeout(function () { toast.hidden = true; }, 1800);
  }

  function selectedResource() {
    var context = fileContext();
    return context ? context.files.snapshot(fileActor()).find(function (resource) { return resource.id === state.selectedId; }) || null : null;
  }

  function openDialog(type, resource, spaceId) {
    state.dialog = { type: type, id: resource ? resource.id : null, spaceId: spaceId || null };
    if (type === 'edit-external-link' && resource) {
      var linkInfo = fileContext().files.externalLinkInfo(resource, fileActor());
      state.dialog.name = resource.name;
      state.dialog.url = linkInfo ? linkInfo.url : '';
    }
    if (type === 'tags' && resource) {
      state.dialog.tags = (resource.tags || []).slice();
      state.dialog.tagInput = '';
      state.dialog.tagDropdownOpen = true;
    }
    if (type === 'create-shortcut' && resource) {
      var target = fileContext().files.writableSpaces(fileActor(), resource.spaceId)[0];
      state.dialog.targetSpaceId = target ? target.id : null;
      state.dialog.targetParentId = 0;
    }
    renderDrive();
  }

  function closeDialog() {
    state.dialog = null;
    renderDrive();
  }

  function confirmDialog() {
    if (!state.dialog) return;
    var dialog = state.dialog, context = fileContext(), actor = fileActor();
    var resource = dialog.id ? context.files.snapshot(actor).find(function (item) { return item.id === dialog.id; }) : null;
    var nameInput = document.getElementById('eva-drive-dialog-name');
    var spaceInput = document.getElementById('eva-drive-dialog-space');
    var parentInput = document.getElementById('eva-drive-dialog-parent');
    var shortcutSpaceInput = document.getElementById('eva-drive-dialog-shortcut-space');
    var shortcutParentInput = document.getElementById('eva-drive-dialog-shortcut-parent');
    var externalNameInput = document.getElementById('eva-drive-dialog-external-name');
    var externalURLInput = document.getElementById('eva-drive-dialog-external-url');
    try {
      if (externalNameInput) dialog.name = externalNameInput.value;
      if (externalURLInput) { if (dialog.url !== externalURLInput.value) dialog.confirmHostChange = false; dialog.url = externalURLInput.value; }
      state.dialog = null;
      if (dialog.type === 'new-folder') {
        var targetSpace = dialog.spaceId || scopeSpaceId();
        state.selectedId = context.files.createFolder(actor, targetSpace, nameInput ? nameInput.value : '', targetSpace === scopeSpaceId() ? state.parentId : 0);
      }
      if (dialog.type === 'target-upload') {
        state.uploadTarget = spaceInput.value;
        renderDrive();
        setTimeout(function () { var input = document.getElementById('eva-file-upload'); if (input) input.click(); }, 0);
        return;
      }
      if (dialog.type === 'add-external-folder') state.selectedId = context.files.createExternalLink(actor, dialog.spaceId || scopeSpaceId(), { name: dialog.name, url: dialog.url, kind: 'folder' }, (dialog.spaceId || scopeSpaceId()) === scopeSpaceId() ? state.parentId : 0);
      if (dialog.type === 'add-external-link') state.selectedId = context.files.createExternalLink(actor, dialog.spaceId || scopeSpaceId(), { name: dialog.name, url: dialog.url }, (dialog.spaceId || scopeSpaceId()) === scopeSpaceId() ? state.parentId : 0);
      if (dialog.type === 'edit-external-link') { context.files.updateExternalLink(actor, resource.id, { name: dialog.name, url: dialog.url, kind: resource && resource.external && resource.external.kind === 'folder' ? 'folder' : undefined, confirmHostChange: Boolean(dialog.confirmHostChange) }); state.selectedId = resource.id; }
      if (dialog.type === 'tags') {
        var nextTags = Array.isArray(dialog.tags) ? dialog.tags.slice() : [];
        var pendingTag = String(dialog.tagInput || '').trim().slice(0, 20);
        var matchedTag = pendingTag && tagSuggestions(resource).find(function (tag) { return tag.toLowerCase() === pendingTag.toLowerCase(); });
        pendingTag = matchedTag || pendingTag;
        if (pendingTag && !nextTags.some(function (tag) { return tag.toLowerCase() === pendingTag.toLowerCase(); }) && nextTags.length < 8) nextTags.push(pendingTag);
        context.files.updateTags(actor, resource.id, nextTags);
      }
      if (dialog.type === 'create-shortcut') context.files.createShortcut(actor, resource.id, shortcutSpaceInput.value, shortcutParentInput.value === '0' ? 0 : shortcutParentInput.value);
      if (dialog.type === 'rename') context.files.rename(actor, resource.id, nameInput.value);
      if (dialog.type === 'move') context.files.move(actor, resource.id, parentInput.value === '0' ? 0 : parentInput.value);
      if (dialog.type === 'trash') { context.files.trash(actor, resource.id); state.selectedId = null; }
      if (dialog.type === 'delete-forever') { context.files.removeForever(actor, resource.id); state.selectedId = null; }
      renderDrive();
      if (dialog.type === 'create-shortcut') showToast('快捷方式已创建，源文件权限保持不变');
      if (dialog.type === 'add-external-folder') showToast('外部文件夹已添加');
      if (dialog.type === 'add-external-link') showToast('外部链接已添加');
      if (dialog.type === 'edit-external-link') showToast(resource && resource.external && resource.external.kind === 'folder' ? '外部文件夹已更新' : '外部链接已更新');
    } catch (error) {
      state.dialog = dialog;
      state.dialog.error = error.message || '操作失败';
      if (state.dialog.error.indexOf('域名已变更') >= 0) state.dialog.confirmHostChange = true;
      renderDrive();
      showToast(error.message || '操作失败');
    }
  }

  function bridgeSelectedResource() {
    var selected = selectedResource();
    var projectId = selected && selected.projectId ? selected.projectId : state.workspaceId;
    if (projectId) {
      closeDrive();
      location.hash = '#/collab?evaProject=' + encodeURIComponent(projectId) + '&evaTab=files';
    }
  }

  function handleDriveClick(event) {
    if (!event.target.closest('.eva-drive__external-add') && typeof document !== 'undefined') document.querySelectorAll('#eva-drive-root .eva-drive__external-add[open]').forEach(function (menu) { menu.open = false; });
    var previewOutside = Boolean(state.previewId && !event.target.closest('.eva-file-preview-sidebar'));
    if (previewOutside) state.previewId = null;
    var row = event.target.closest('[data-resource-id]');
    var resource = row ? fileContext().files.snapshot(fileActor()).find(function (item) { return item.id === row.dataset.resourceId; }) : selectedResource();

    var scopeButton = event.target.closest('[data-drive-scope]');
    if (scopeButton) {
      state.driveScope = scopeButton.dataset.driveScope;
      if (scopeButton.dataset.workspaceId) state.workspaceId = scopeButton.dataset.workspaceId;
      state.driveEntry = 'global';
      state.query = '';
      state.parentId = 0;
      state.crumbs = [];
      state.selectedId = null;
      closeRowMenu(false);
      renderDrive();
      return;
    }

    var action = event.target.closest('[data-drive-action]');
    if (!action && row) {
      closeRowMenu();
      if (state.driveScope === 'trash') { renderDrive(); return; }
      if (resource.type === 'folder') {
        if (state.driveScope !== 'trash') {
          state.parentId = resource.id;
          state.crumbs = [{ id: resource.id, name: resource.name }];
          state.query = '';
        }
      } else {
        try {
          var rowTarget = fileContext().files.resolveFile(resource, fileActor());
          if (rowTarget.type === 'external_link') { openExternalResource(resource); return; }
          state.previewId = resource.id;
          state.previewPage = 0;
          state.previewSheet = 0;
          state.previewMode = 'rendered';
        } catch (error) {
          state.previewId = null;
          showToast(error.message || '当前文件无法预览');
        }
      }
      renderDrive();
      return;
    }
    if (!action) {
      if (previewOutside) renderDrive();
      return;
    }
    event.preventDefault();
    event.stopPropagation();
    var name = action.dataset.driveAction;
    if (previewOutside) renderDrive();
    if (name === 'toggle-external-add') {
      var externalAdd = action.closest('.eva-drive__external-add');
      if (externalAdd) externalAdd.open = !externalAdd.open;
      return;
    }
    if (name === 'noop') return;
    if (name === 'preview-slide') {
      state.previewPage = Number(action.dataset.previewSlideIndex || 0);
      renderDrive();
      return;
    }
    if (name === 'preview-prev' || name === 'preview-next') {
      var previewResource = fileContext().files.snapshot(fileActor()).find(function (item) { return item.id === state.previewId; });
      var slideCount = previewResource ? ((filePreviewFixture(previewResource).slides || []).length || 2) : 2;
      state.previewPage = Math.max(0, Math.min(slideCount - 1, state.previewPage + (name === 'preview-next' ? 1 : -1)));
      renderDrive();
      return;
    }
    if (name === 'preview-sheet') {
      state.previewSheet = Number(action.dataset.previewSheetIndex || 0);
      renderDrive();
      return;
    }
    if (name === 'preview-mode') {
      state.previewMode = action.dataset.previewMode === 'source' ? 'source' : 'rendered';
      renderDrive();
      return;
    }
    if (name === 'tag-dropdown-toggle') {
      state.dialog.tagDropdownOpen = state.dialog.tagDropdownOpen === false;
      renderDrive();
      return;
    }
    if (name === 'tag-option') {
      addDialogTag(action.dataset.driveTagValue);
      state.dialog.tagDropdownOpen = true;
      renderDrive();
      return;
    }
    if (name === 'tag-remove') {
      state.dialog.tags = state.dialog.tags.filter(function (tag) { return tag !== action.dataset.driveTagValue; });
      state.dialog.tagError = '';
      renderDrive();
      return;
    }
    if (name === 'row-menu') {
      if (state.menuId === String(resource.id)) closeRowMenu();
      else {
        captureTableScroll();
        state.menuId = String(resource.id);
        state.menuAnchor = rowMenuAnchor(action, Number(action.dataset.driveMenuSize || 1));
      }
      renderDrive();
      return;
    }
    if (state.menuId) {
      closeRowMenu();
      renderDrive();
    }
    if (name === 'select') { state.selectedId = resource.id; renderDrive(); }
    if (name === 'open-relation') {
      var relation = relationsFor(resource)[Number(action.dataset.driveRelationIndex)];
      openRelationSource(relation);
    }
    if (name === 'preview') {
      try {
        var previewTarget = fileContext().files.resolveFile(resource, fileActor());
        if (previewTarget.type === 'external_link') { openExternalResource(resource); return; }
        state.previewId = resource.id;
        state.previewPage = 0;
        state.previewSheet = 0;
        state.previewMode = 'rendered';
        state.selectedId = null;
        renderDrive();
      } catch (error) {
        state.previewId = null;
        renderDrive();
        showToast(error.message || '当前文件无法预览');
      }
    }
    if (name === 'preview-close') { state.previewId = null; renderDrive(); }
    if (name === 'download') { downloadDriveFile(resource); return; }
    if (name === 'detail-close') { state.selectedId = null; renderDrive(); }
    if (name === 'open-folder') {
      if (resource.area === 'personal') state.driveScope = 'personal';
      if (resource.area === 'project') { state.driveScope = 'workspace'; state.workspaceId = resource.projectId; }
      state.parentId = resource.id;
      state.crumbs = [{ id: resource.id, name: resource.name }];
      state.query = '';
      state.selectedId = null;
      renderDrive();
    }
    if (name === 'breadcrumb') {
      var index = Number(action.dataset.breadcrumbIndex);
      state.parentId = index === 0 ? 0 : state.crumbs[index - 1].id;
      state.crumbs = state.crumbs.slice(0, index);
      state.selectedId = null;
      renderDrive();
    }
    if (name === 'up-folder') {
      state.crumbs = state.crumbs.slice(0, -1);
      state.parentId = state.crumbs.length ? state.crumbs[state.crumbs.length - 1].id : 0;
      state.query = '';
      state.selectedId = null;
      renderDrive();
    }
    if (name === 'new-folder') openDialog('new-folder', null, scopeSpaceId());
    if (name === 'add-external-folder') openDialog('add-external-folder', null, scopeSpaceId());
    if (name === 'add-external-link') openDialog('add-external-link', null, scopeSpaceId());
    if (name === 'upload-file') {
      var spaceId = scopeSpaceId();
      if (spaceId) { state.uploadTarget = spaceId; document.getElementById('eva-file-upload').click(); }
      else openDialog('target-upload');
    }
    if (name === 'copy-link') {
      var internalLink = location.origin + location.pathname + '#/drive?file=' + encodeURIComponent(resource.id);
      if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(internalLink).catch(function () {});
      showToast('已复制内部链接，不会改变访问权限');
    }
    if (name === 'open-external') { openExternalResource(resource); return; }
    if (name === 'copy-external-link') {
      try {
        var externalLink = fileContext().files.externalLinkInfo(resource, fileActor());
        if (!externalLink) throw new Error('当前资源不是外部链接');
        if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(externalLink.url).catch(function () {});
        showToast(externalLink.kind === 'folder' ? '已复制文件夹链接' : '已复制外部链接');
      } catch (error) { showToast(error.message || '复制外部链接失败'); }
    }
    if (name === 'open-project') bridgeSelectedResource();
    if (name === 'tags') openDialog('tags', resource);
    if (name === 'edit-external-link') openDialog('edit-external-link', resource);
    if (name === 'create-shortcut') openDialog('create-shortcut', resource);
    if (name === 'rename') openDialog('rename', resource);
    if (name === 'move') openDialog('move', resource);
    if (name === 'copy') { fileContext().files.copy(fileActor(), resource.id); showToast('已在当前空间创建副本'); }
    if (name === 'trash') openDialog('trash', resource);
    if (name === 'restore') {
      var restoreResult = fileContext().files.restore(fileActor(), resource.id);
      state.selectedId = null;
      showToast(restoreResult && restoreResult.restoredToRoot ? '原位置不存在，已恢复到空间根目录' : '已恢复到原位置');
    }
    if (name === 'delete-forever') openDialog('delete-forever', resource);
    if (name === 'dialog-close') closeDialog();
    if (name === 'dialog-confirm') confirmDialog();
  }

  function handleDriveInput(event) {
    if (event.type === 'input' && event.target.id === 'eva-drive-dialog-external-url' && state.dialog && ['add-external-folder', 'add-external-link', 'edit-external-link'].includes(state.dialog.type)) {
      var externalNameInput = document.getElementById('eva-drive-dialog-external-name');
      state.dialog.name = externalNameInput ? externalNameInput.value : state.dialog.name;
      state.dialog.url = event.target.value;
      state.dialog.error = '';
      state.dialog.confirmHostChange = false;
      var dialogResource = state.dialog.id ? fileContext().files.snapshot(fileActor()).find(function (item) { return item.id === state.dialog.id; }) : null;
      if (state.dialog.type === 'add-external-folder' || (state.dialog.type === 'edit-external-link' && isExternalFolderResource(dialogResource))) {
        renderDrive();
        var externalURLInput = document.getElementById('eva-drive-dialog-external-url');
        if (externalURLInput) {
          externalURLInput.focus();
          externalURLInput.setSelectionRange(externalURLInput.value.length, externalURLInput.value.length);
        }
      }
      return;
    }
    if (event.type === 'input' && event.target.matches('[data-drive-tag-input]')) {
      state.dialog.tagInput = event.target.value;
      state.dialog.tagError = '';
      state.dialog.tagDropdownOpen = true;
      renderDrive();
      var editorInput = document.querySelector('[data-drive-tag-input]');
      if (editorInput) {
        editorInput.focus();
        editorInput.setSelectionRange(editorInput.value.length, editorInput.value.length);
      }
    }
    if (event.type === 'input' && event.target.matches('[data-drive-search]')) {
      state.query = event.target.value;
      renderDrive();
      var input = document.querySelector('[data-drive-search="' + event.target.dataset.driveSearch + '"]');
      if (input) {
        input.focus();
        input.setSelectionRange(input.value.length, input.value.length);
      }
    }
    if (event.type === 'change' && event.target.id === 'eva-file-upload' && event.target.files.length) {
      var context = fileContext(), actor = fileActor(), targetSpace = state.uploadTarget || scopeSpaceId() || personalSpaceId();
      var parentId = targetSpace === scopeSpaceId() ? state.parentId : 0;
      Array.from(event.target.files).forEach(function (file) { state.selectedId = context.files.upload(actor, targetSpace, file, parentId); });
      state.uploadTarget = null;
      event.target.value = '';
      renderDrive();
      showToast('文件已上传到' + spaceName(targetSpace));
    }
    if (event.type === 'change' && event.target.id === 'eva-drive-dialog-shortcut-space') {
      state.dialog.targetSpaceId = event.target.value;
      state.dialog.targetParentId = 0;
      renderDrive();
    }
  }

  function handleCustomNavigation(event) {
    var trigger = event.target.closest('.eva-space-picker__trigger');
    if (trigger) {
      var menu = trigger.parentElement.querySelector('.eva-space-picker__menu');
      menu.hidden = !menu.hidden;
      trigger.setAttribute('aria-expanded', menu.hidden ? 'false' : 'true');
      return true;
    }

    var picker = event.target.closest('[data-eva-picker]');
    if (picker) {
      var value = picker.dataset.evaPicker;
      var pickerRoot = picker.closest('.eva-space-picker');
      pickerRoot.querySelector('.eva-space-picker__menu').hidden = true;
      pickerRoot.querySelector('.eva-space-picker__trigger').setAttribute('aria-expanded', 'false');
      if (value === 'personal') setMode('personal');
      else setMode('collaboration', value);
      return true;
    }

    var custom = event.target.closest('[data-eva-action]');
    if (!custom) return false;
    var action = custom.dataset.evaAction;
    if (action === 'drive') openDrive('global', null, driveScopeForMode('collaboration'));
    if (action === 'workspace-home') openWorkspace(state.workspaceId, null);
    if (action === 'workspace-tasks') openWorkspace(state.workspaceId, 'tasks');
    if (action === 'workspace-automation') openWorkspace(state.workspaceId, 'automation');
    if (action === 'workspace-skills') openWorkspace(state.workspaceId, 'skills');
    return true;
  }

  function enhanceSpaceCopy() {
    document.querySelectorAll('.collab-space-card .meta').forEach(function (meta) {
      meta.textContent = meta.textContent.replace(/(\d+)\s*人\s*·\s*(\d+)\s*分身/, '$1 位成员 · $2 个专家');
    });
    var title = document.querySelector('.collab-list-page .collab-hero h1');
    if (title) title.textContent = '项目';
    var section = document.querySelector('.collab-list-page .collab-section-head h2');
    if (section) section.textContent = '已加入';
    var input = document.querySelector('.collab-create-form input');
    if (input) input.placeholder = '例如：供应链运营协同';

    document.querySelectorAll('.collab-tab').forEach(function (button) {
      button.style.display = '';
    });
  }

  function scheduleEnhance() {
    if (frameQueued) return;
    frameQueued = true;
    requestAnimationFrame(function () {
      frameQueued = false;
      syncShellGeometry();
      enhanceSpaceCopy();
      fulfillPendingNavigation();
    });
  }

  function installEvents() {
    document.addEventListener('click', function (event) {
      if (handleCustomNavigation(event)) return;
      if (event.target.closest('#eva-drive-root')) return;

      var tab = event.target.closest('.collab-tab');
      if (tab) {
        closeDrive();
      }

      var side = sidebar();
      if (side && side.contains(event.target)) closeDrive();
    }, true);

    document.addEventListener('click', function (event) {
      if (event.target.closest('#eva-drive-root')) handleDriveClick(event);
      else if (document.getElementById('eva-drive-root')) {
        var root = document.getElementById('eva-drive-root');
        var externalAddMenu = root.querySelector('.eva-drive__external-add[open]');
        if (externalAddMenu) externalAddMenu.open = false;
        if (state.menuId || state.previewId) {
          closeRowMenu(false);
          state.previewId = null;
          if (root && !root.hidden) renderDrive();
        }
      }
    });
    document.addEventListener('input', function (event) {
      if (event.target.closest('#eva-drive-root')) handleDriveInput(event);
    });
    document.addEventListener('focusin', function (event) {
      if (state.dialog && state.dialog.type === 'tags' && event.target.matches('[data-drive-tag-input]') && state.dialog.tagDropdownOpen === false) {
        state.dialog.tagDropdownOpen = true;
        renderDrive();
        var input = document.querySelector('[data-drive-tag-input]');
        if (input) input.focus();
      }
    });
    document.addEventListener('change', function (event) {
      if (event.target.closest('#eva-drive-root')) handleDriveInput(event);
    });
    document.addEventListener('keydown', function (event) {
      if (state.dialog && state.dialog.type === 'tags' && event.target.matches('[data-drive-tag-input]') && event.key === 'Enter') {
        event.preventDefault();
        addDialogTag();
        renderDrive();
        var tagInput = document.querySelector('[data-drive-tag-input]');
        if (tagInput) tagInput.focus();
        return;
      }
      if (event.key === 'Escape') {
        var menu = document.querySelector('.eva-space-picker__menu:not([hidden])');
        if (menu) menu.hidden = true;
        var externalAddMenu = document.querySelector('#eva-drive-root .eva-drive__external-add[open]');
        if (externalAddMenu) { externalAddMenu.open = false; externalAddMenu.querySelector('summary').focus(); }
        if (state.menuId) { closeRowMenu(); renderDrive(); }
        if (state.dialog) closeDialog();
        else if (state.selectedId) { state.selectedId = null; renderDrive(); }
        else if (state.previewId) { state.previewId = null; renderDrive(); }
      }
    });
    window.addEventListener('resize', function () {
      if (state.menuId) { closeRowMenu(); renderDrive(); }
      syncDriveLeft();
    });
    window.addEventListener('hashchange', function () {
      if (String(location.hash || '').indexOf('#/drive') !== 0) closeDrive();
    });
  }

  function initialize() {
    installEvents();
    window.__evaOpenDrive = openDrive;
    window.__evaOpenDriveFile = openDriveFile;
    window.__evaNativePages.register('drive', function (host) {
      var root = ensureDriveRoot(host);
      root.hidden = false;
      renderDrive();
      syncShellGeometry();
      return function () {
        closeDrive();
        if (root.parentElement === host) root.remove();
      };
    });
    var context = fileContext();
    if (context) context.files.subscribe(function () {
      var root = document.getElementById('eva-drive-root');
      if (root && !root.hidden) renderDrive();
    });
    var observer = new MutationObserver(scheduleEnhance);
    observer.observe(document.getElementById('root') || document.body, { childList: true, subtree: true });
    scheduleEnhance();
    syncShellGeometry();
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', initialize, { once: true });
  else initialize();
})();
