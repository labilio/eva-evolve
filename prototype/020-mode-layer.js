
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

  var pageServices = null;
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
    previewFullscreen: false,
    previewPage: 0,
    previewSheet: 0,
    previewMode: 'rendered',
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
    return context ? context.store.actorId() : 'u-wangyilin';
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
    if (String(id || '').startsWith('personal:')) return '个人文件库';
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
    if (state.driveScope === 'pinned') list = context.files.pinnedFiles(actor);
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
    return context.files.sortEntries(actor, list, { pinnedFirst: state.driveScope !== 'trash' });
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
    if (['doc', 'docx'].includes(resource.extension)) return 'is-word';
    if (['xlsx', 'xls', 'csv'].includes(resource.extension)) return 'is-sheet';
    if (['ppt', 'pptx'].includes(resource.extension)) return 'is-presentation';
    if (['zip', 'rar', '7z', 'tar', 'gz'].includes(resource.extension)) return 'is-archive';
    if (['md', 'markdown'].includes(resource.extension)) return 'is-markdown';
    return '';
  }

  function fileMarkIconHTML(resource) {
    return icon(fileIconName(resource))
      + (isExternalFolderResource(resource) ? icon('external', 'eva-drive-icon eva-drive__file-external-badge') : '')
      + (resource.type === 'shortcut' ? icon('external', 'eva-drive-icon eva-drive__shortcut-badge') : '');
  }

  function scopeCopy() {
    if (state.driveScope === 'pinned') return { title: '置顶文件', section: '置顶文件', subtitle: '汇总你在个人文件库和各个可访问项目文件库中置顶的文件与文件夹' };
    if (state.driveScope === 'personal') return { title: '个人文件库', section: '个人文件', subtitle: '仅你可访问，可统一整理本地文件与外部链接' };
    if (state.driveScope === 'projects') return { title: '项目文件库', section: '我的项目文件库', subtitle: '选择一个已加入的项目后浏览和整理团队文件' };
    if (state.driveScope === 'workspace') return { title: workspaceName(state.workspaceId), section: '团队文件', subtitle: '权限继承项目角色，任务产出、群文件与外部链接归属项目文件库' };
    if (state.driveScope === 'trash') return { title: '回收站', section: '回收站', subtitle: '仅显示你有管理权限的文件库中已删除的文件' };
    return { title: '个人文件库', section: '个人文件', subtitle: '仅你可访问，可用于上传和整理个人资料' };
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

  function detailHTML(resource) { return resource ? '<div data-eva-file-detail-host></div>' : ''; }

  function resourceSourceLabel(resource) {
    var context = fileContext();
    if (context && context.files.sourceLabelFor) return context.files.sourceLabelFor(resource, fileActor());
    if (resource.source && resource.source.label) return resource.source.label;
    if (resource.area === 'project') return '项目 · ' + workspaceName(resource.projectId);
    if (resource.area === 'personal') return '个人文件库';
    return '项目文件库';
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
    return type === 'task' ? '任务' : type === 'group' ? '群聊' : type === 'chat' ? '私聊' : type === 'ai-conversation' ? 'AI 小队会话' : '来源文件';
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
    if (externalInfo) return '<span class="eva-relation-cell"><span class="eva-relation-chip is-external" data-eva-tooltip="' + escapeHTML(externalInfo.url) + '">' + icon(externalInfo.kind === 'folder' ? 'folder' : 'link') + escapeHTML(externalInfo.providerLabel + ' · ' + externalInfo.host) + '</span></span>';
    var relations = relationsFor(resource);
    if (!relations.length) return '<span class="eva-file-muted">—</span>';
    return '<span class="eva-relation-cell">' + relations.slice(0, 2).map(function (relation) {
      return '<span class="eva-relation-chip' + (relation.restricted ? ' is-restricted' : '') + '"' + (relation.restricted ? '' : ' data-eva-tooltip="' + escapeHTML(relation.meta || relation.label) + '"' + (relation.meta ? '' : ' data-eva-tooltip-clamp=""')) + '>' + icon(relationIconName(relation.type)) + escapeHTML(relation.restricted ? relation.meta || '无权访问来源' : relation.label) + '</span>';
    }).join('') + (relations.length > 2 ? '<span class="eva-relation-more">+' + (relations.length - 2) + '</span>' : '') + '</span>';
  }

  function spaceRootLabel(resource) {
    if (resource.area === 'personal') return '个人文件库';
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

  function rowMenuItem(action, label, danger) {
    return {action:action,label:label,danger:danger};
  }

  function captureTableScroll() {
    var table = document.querySelector('#eva-drive-root .eva-drive__table');
    state.tableScroll = table ? { left: table.scrollLeft, top: table.scrollTop } : null;
  }

  function rowActionsHTML(resource) {
    var context = fileContext(), actor = fileActor(), isTrash = state.driveScope === 'trash';
    var shortcutInfo = context.files.shortcutInfo(resource, actor), canOpen = !shortcutInfo || shortcutInfo.status === 'available';
    var externalInfo = canOpen ? context.files.externalLinkInfo(resource, actor) : null, isExternal = Boolean(externalInfo);
    var canDownload = resource.type !== 'folder' && !isExternal && canOpen && context.files.can('download', resource.spaceId, actor);
    var items = [];
    if (isTrash) {
      items.push(rowMenuItem('select', '查看文件信息'));
      if (context.files.can('restore', resource.spaceId, actor)) items.push(rowMenuItem('restore', '恢复'));
      if (context.files.can('delete-forever', resource.spaceId, actor)) items.push(rowMenuItem('delete-forever', '永久删除', true));
    } else {
      if (resource.type === 'folder') items.push(rowMenuItem('open-folder', '打开文件夹'));
      else if (isExternal) items.push(rowMenuItem('open-external', externalInfo.kind === 'folder' ? '打开原文件夹' : '打开原链接'));
      else if (canOpen) items.push(rowMenuItem('preview', '预览'));
      if (canDownload) items.push(rowMenuItem('download', '下载'));
      if (state.driveScope === 'pinned') items.push(rowMenuItem('open-location', '打开所在位置'));
      items.push(rowMenuItem('select', '查看文件信息'));
      items.push(rowMenuItem('toggle-pin', resource.pinned ? '取消置顶' : '置顶'));
      if (isExternal) items.push(rowMenuItem('copy-external-link', externalInfo.kind === 'folder' ? '复制文件夹链接' : '复制外部链接'));
      items.push(rowMenuItem('copy-link', '复制内部链接'));
      if (context.files.can('rename', resource.spaceId, actor)) items.push(rowMenuItem('rename', '重命名'));
      if (resource.type === 'external_link' && context.files.can('edit-external-link', resource.spaceId, actor)) items.push(rowMenuItem('edit-external-link', externalInfo && externalInfo.kind === 'folder' ? '编辑外部文件夹' : '编辑链接'));
      if (context.files.can('move', resource.spaceId, actor)) items.push(rowMenuItem('move', '移动'));
      if (resource.type !== 'shortcut' && !isExternal && context.files.can('copy', resource.spaceId, actor)) items.push(rowMenuItem('copy', '创建副本'));
      if (resource.type !== 'folder' && resource.type !== 'shortcut' && context.files.can('create-shortcut', resource.spaceId, actor)) items.push(rowMenuItem('create-shortcut', '创建快捷方式'));
      if (resource.type !== 'folder' && context.files.can('edit-tags', resource.spaceId, actor)) items.push(rowMenuItem('tags', '编辑标签'));
      if (context.files.can('trash', resource.spaceId, actor)) items.push(rowMenuItem('trash', '移至回收站', true));
    }
    var key=fileRowControls.length;
    fileRowControls.push({key:key,props:{files:context.files,actor:actor,resource:resource,onRemoved:function(){state.selectedId=null;renderDrive();},name:resource.name,pinned:resource.pinned,showPin:!isTrash,onPin:function(){dispatchDriveAction('toggle-pin',resource);},items:items.map(function(item){return {action:item.action,label:item.label,danger:item.danger,onClick:function(){dispatchDriveAction(item.action,resource);}};})}});
    return '<span data-eva-file-row-host="'+key+'"></span>';
  }


  function tableHTML(list) {
    if (!list.length) {
      var emptyCopy = state.query.trim() ? '没有匹配的文件' : state.driveScope === 'pinned' ? '还没有置顶文件或文件夹，可在文件列表中点击图钉添加' : state.driveScope === 'workspace' ? '当前项目暂无文件' : '暂无文件';
      return '<div class="eva-drive__empty">' + emptyCopy + '</div>';
    }
    var pinnedView = state.driveScope === 'pinned';
    return [
      '<div class="eva-drive__table eva-drive__table--with-source' + (state.driveScope === 'trash' ? ' eva-drive__table--trash' : '') + (pinnedView ? ' eva-drive__table--pinned' : '') + '" role="table" tabindex="0" aria-label="文件列表，可左右滚动">',
      pinnedView ? '<div class="eva-drive__table-head" role="row"><span>名称</span><span>所在位置</span><span>文件类型</span><span>关联内容</span><span>大小</span><span>创建信息</span><span>操作</span></div>' : '<div class="eva-drive__table-head" role="row"><span>名称</span><span>文件类型</span><span>' + (state.driveScope === 'trash' ? '原位置' : '关联内容') + '</span><span>大小</span><span>' + (state.driveScope === 'trash' ? '删除信息' : '创建信息') + '</span><span>操作</span></div>',
      list.map(function (resource) {
        var common = [
          '<div class="eva-drive__row' + (resource.pinned ? ' is-pinned' : '') + '" role="row" data-resource-id="' + resource.id + '" data-file-pinned="' + (resource.pinned ? 'true' : 'false') + '" aria-selected="' + (resource.id === state.selectedId ? 'true' : 'false') + '">',
          '<button class="eva-drive__name-cell" type="button" data-drive-action="' + (resource.type === 'folder' ? (state.driveScope === 'trash' ? 'noop' : 'open-folder') : state.driveScope === 'trash' ? 'noop' : resource.type === 'external_link' ? 'open-external' : 'preview') + '"><span class="eva-drive__file-mark ' + fileMarkClass(resource) + '">' + fileMarkIconHTML(resource) + '</span><span class="eva-drive__name-copy"><strong>' + escapeHTML(resource.name) + '</strong>' + tagsHTML(resource) + '</span></button>',
        ];
        if (pinnedView) common.push('<span class="eva-file-location-cell">' + escapeHTML(resourceLocationLabel(resource)) + '</span>');
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

  function sharedFileFormType() {
    if (!state.dialog) return null;
    var type = state.dialog.type;
    if (type === 'add-external-link') return 'external-link';
    if (type === 'add-external-folder') return 'external-folder';
    return ['new-folder','rename','edit-external-link','move','create-shortcut','tags'].includes(type) ? type : null;
  }

  function syncFileControls() {
    if (!pageServices?.showFileControls) return;
    var context=fileContext(),actor=fileActor(),resource=selectedResource(),requests=[];
    var add=function(component,selector,props){var container=document.querySelector('#eva-drive-root '+selector);if(container)requests.push({component:component,container:container,props:props});};
    if(resource)add('FileDetail','[data-eva-file-detail-host]',{
      resource:resource,files:context.files,actor:actor,fileType:resourceFileType(resource),
      location:resource.deletedAt?originalLocationLabel(resource):resourceLocationLabel(resource),source:resourceSourceLabel(resource),
      createdAt:formatDriveTime(resource.createdAt),size:formatDriveBytes(resource.size),markClass:fileMarkClass(resource),
      markIcon:({file:'file-text',sheet:'file-spreadsheet',link:'link-2'})[fileIconName(resource)]||fileIconName(resource),
      locationAction:state.driveScope==='pinned'?{name:'open-location',label:'打开所在位置'}:resource.projectId?{name:'open-project',label:'在项目中打开'}:null,
      onClose:function(){state.selectedId=null;renderDrive();},onRelation:openRelationSource,
      onAction:function(name){dispatchDriveAction(name,resource);}
    });
    if(state.dialog&&!sharedFileFormType()) {
      var target=context.files.snapshot(actor).find(function(item){return item.id===state.dialog.id;});
      if(target)add('FileConfirmation','[data-eva-file-confirm-host]',{resource:target,type:state.dialog.type,onClose:closeDialog,onConfirm:confirmDialog});
    }
    add('FileToolbar','[data-eva-file-toolbar-host]',{onAction:function(name){dispatchDriveAction(({upload:'upload-file','external-link':'add-external-link','external-folder':'add-external-folder'})[name]||name,null);}});
    fileRowControls.forEach(function(item){add('FileRowActions','[data-eva-file-row-host="'+item.key+'"]',item.props);});
    add('FileButton','[data-eva-file-project-host]',{iconName:'external-link',label:'进入项目',onClick:function(){dispatchDriveAction('open-project',resource);}});
    add('FilePreviewActions','[data-eva-file-preview-actions-host]',{fullscreen:state.previewFullscreen,onAction:function(name){dispatchDriveAction(name,resource);}});
    add('FilePath','[data-eva-file-path-host]',{crumbs:[{id:0,name:scopeCopy().section}].concat(state.crumbs),onBack:function(){dispatchDriveAction('up-folder',resource);},onCrumb:function(index){dispatchDriveAction('breadcrumb',resource,{dataset:{breadcrumbIndex:index}});}});
    pageServices.showFileControls(requests);
  }

  function syncFileForm() {
    if (!pageServices?.showFileForm) return;
    var type = sharedFileFormType(),container = document.querySelector('#eva-drive-root [data-eva-file-form-host]');
    if (!type || !container) { pageServices.showFileForm(null); return; }
    var dialog = state.dialog, context = fileContext(), actor = fileActor();
    var resource = dialog.id ? context.files.snapshot(actor).find(function(item){return item.id===dialog.id;}) : null;
    var spaceId = dialog.spaceId || scopeSpaceId() || personalSpaceId();
    pageServices.showFileForm({container:container,type:type,files:context.files,actor:actor,spaceId:spaceId,
      parentId:spaceId===scopeSpaceId()?state.parentId:0,resource:resource,entry:'drive',sourceLabel:resource?spaceRootLabel(resource):'',
      onClose:closeDialog,
      onSaved:function(result){
        if (['new-folder','external-link','external-folder','edit-external-link'].includes(result.type)) { state.selectedId=result.id;renderDrive(); }
        if(result.type==='create-shortcut')showToast('快捷方式已创建，源文件权限保持不变');
        if(result.type==='external-folder')showToast('外部文件夹已添加');
        if(result.type==='external-link')showToast('外部链接已添加');
        if(result.type==='edit-external-link')showToast(resource.external?.kind==='folder'?'外部文件夹已更新':'外部链接已更新');
      },
    });
  }

  function dialogHTML() {
    if (!state.dialog) return '';
    if (sharedFileFormType()) return '<div data-eva-file-form-host></div>';
    return '<div data-eva-file-confirm-host></div>';
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
    var fullscreenLabel = state.previewFullscreen ? '退出全屏预览' : '进入全屏预览';
    return '<aside class="eva-file-preview-sidebar eva-drive-preview-sidebar' + (state.previewFullscreen ? ' is-fullscreen' : '') + '" aria-label="文件预览" data-eva-file-preview-fullscreen="' + (state.previewFullscreen ? 'true' : 'false') + '"><div class="eva-file-preview-resizer" role="separator" tabindex="0" aria-label="调整文件预览宽度" aria-orientation="vertical" aria-valuemin="280" aria-valuemax="664" aria-valuenow="480" data-eva-file-preview-resizer></div><header class="eva-file-preview-sidebar__head"><h2>' + escapeHTML(resource.name) + '</h2><span data-eva-file-preview-actions-host></span></header><div class="eva-file-preview-sidebar__body">' + content + '</div></aside>';
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
    if (!projects.length) return '<div class="eva-drive__empty">你还没有加入任何项目文件库</div>';
    return '<div class="eva-drive-projects">' + projects.map(function (item) {
      var roleLabel = item.role === 'owner' ? '项目负责人' : item.role === 'manager' ? '项目管理员' : '项目成员';
      return '<button type="button" class="eva-drive-project-card" data-drive-scope="workspace" data-workspace-id="' + escapeHTML(item.workspace.id) + '"><span class="eva-drive-project-card__mark">' + escapeHTML(item.workspace.mark || item.workspace.name.slice(0, 1)) + '</span><span class="eva-drive-project-card__copy"><strong>' + escapeHTML(item.workspace.name) + '</strong><small>' + escapeHTML(item.workspace.description || '项目团队文件') + '</small><span>' + item.folderCount + ' 个文件夹 · ' + item.fileCount + ' 个文件</span></span><span class="eva-drive-project-card__role">' + roleLabel + '</span>' + icon('chevron') + '</button>';
    }).join('') + '</div>';
  }

  function driveHTML(list, selected) {
    var copy = scopeCopy();
    var context = fileContext(), actor = fileActor(), currentSpace = scopeSpaceId();
    var role = currentSpace ? context.files.role(currentSpace, actor) : null;
    var roleLabel = state.driveScope === 'personal' ? '本人' : role === 'owner' ? '项目负责人' : role === 'manager' ? '项目管理员' : role === 'editor' ? '项目成员' : '';
    var crumbs = currentSpace && state.crumbs.length ? [{ id: 0, name: copy.section }].concat(state.crumbs) : [];
    return [
      '<aside class="eva-drive__side" aria-label="文件导航">',
      '<div class="eva-drive__side-head"><strong>文件库</strong></div>',
      '<nav class="eva-drive__tree">',
      '<div class="eva-drive__tree-group">快速访问</div>',
      treeButton('pinned', '置顶文件', 'pin', false),
      '<div class="eva-drive__tree-group">文件库</div>',
      treeButton('personal', '个人文件库', 'file', false),
      treeButton('projects', '项目文件库', 'workspace', false),
      WORKSPACES.map(function (item) { return treeButton('workspace', item.name, 'workspace', true, item.id); }).join(''),
      '<div class="eva-drive__tree-spacer"></div>',
      '<div class="eva-drive__tree-group">管理</div>',
      treeButton('trash', '回收站', 'folder', false),
      '</nav>',
      '</aside>',
      '<main class="eva-drive__main">',
      '<header class="eva-drive__header"><div><strong>' + escapeHTML(copy.title) + '</strong><span>' + escapeHTML(copy.subtitle) + '</span></div><span class="eva-drive__header-spacer"></span>',
      roleLabel ? '<span class="eva-drive__role">' + roleLabel + '</span>' : '',
      state.driveScope === 'workspace' ? '<span data-eva-file-project-host></span>' : '',
      '</header>',
      '<div class="eva-drive__scroll">',
      '<div class="eva-drive__toolbar">',
      currentSpace && state.driveScope !== 'trash' ? '<div data-eva-file-toolbar-host></div>' : '',
      '<label class="eva-drive__side-search">' + icon('search') + '<input type="search" data-drive-search="main" value="' + escapeHTML(state.query) + '" placeholder="' + (state.driveScope === 'pinned' ? '搜索置顶文件' : state.driveScope === 'trash' ? '搜索回收站' : '搜索此文件库') + '"></label>',
      '</div>',
      crumbs.length ? '<div data-eva-file-path-host></div>' : '',
      '</div>',
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

  var fileRowControls=[];
  function renderDrive() {
    fileRowControls=[];
    var root = ensureDriveRoot();
    var list = resourcesForScope();
    if (!state.selectedId || !list.some(function (resource) { return resource.id === state.selectedId; })) {
      state.selectedId = null;
    }
    var context = fileContext();
    var selected = context ? context.files.snapshot(fileActor()).find(function (resource) { return resource.id === state.selectedId; }) || null : null;
    root.innerHTML = driveHTML(list, selected);
    syncFileForm();
    syncFileControls();
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
    state.previewFullscreen = false;
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
    state.previewFullscreen = false;
    if (document.getElementById('eva-drive-root')) renderDrive();
    return true;
  }

  function closeDrive() {
    pageServices?.showFileForm?.(null);pageServices?.showFileControls?.([]);
    var root = document.getElementById('eva-drive-root');
    state.previewId = null;
    state.previewFullscreen = false;
    state.previewPage = 0;
    state.previewSheet = 0;
    state.previewMode = 'rendered';
    state.selectedId = null;
    state.dialog = null;
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
    state.dialog={type:type,id:resource?resource.id:null,spaceId:spaceId||null};
    renderDrive();
  }

  function closeDialog() {
    state.dialog = null;
    renderDrive();
  }

  function confirmDialog() {
    if(!state.dialog||sharedFileFormType())return;
    var dialog=state.dialog,context=fileContext(),actor=fileActor();
    var resource=context.files.snapshot(actor).find(function(item){return item.id===dialog.id;});
    try {
      if(dialog.type==='trash')context.files.trash(actor,resource.id);
      if(dialog.type==='delete-forever')context.files.removeForever(actor,resource.id);
      state.selectedId=null;state.dialog=null;renderDrive();
    }catch(error){showToast(error.message||(dialog.type==='trash'?'文件未能移至回收站，请重试':'文件未能永久删除，请重试'));}
  }

  function bridgeSelectedResource() {
    var selected = selectedResource();
    var projectId = selected && selected.projectId ? selected.projectId : state.workspaceId;
    if (projectId) {
      closeDrive();
      location.hash = '#/collab?evaProject=' + encodeURIComponent(projectId) + '&evaTab=files';
    }
  }

  function openResourceLocation(resource, enterFolder) {
    var snapshot = fileContext().files.snapshot(fileActor()), folders = [], parentId = resource.parent_id || 0, currentId = parentId, guard = 0;
    while (currentId && guard++ < 30) {
      var folder = snapshot.find(function (item) { return item.id === currentId && item.spaceId === resource.spaceId; });
      if (!folder) break;
      folders.unshift({ id: folder.id, name: folder.name });
      currentId = folder.parent_id || 0;
    }
    if (enterFolder && resource.type === 'folder') {
      parentId = resource.id;
      folders.push({ id: resource.id, name: resource.name });
    }
    if (resource.area === 'personal') state.driveScope = 'personal';
    if (resource.area === 'project') { state.driveScope = 'workspace'; state.workspaceId = resource.projectId || resource.spaceId; }
    state.parentId = parentId;
    state.crumbs = folders;
    state.query = '';
    state.selectedId = enterFolder ? null : resource.id;
    renderDrive();
  }

  function handleDriveClick(event) {
    var previewOutside = Boolean(state.previewId && !event.target.closest('.eva-file-preview-sidebar'));
    if (previewOutside) { state.previewId = null; state.previewFullscreen = false; }
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
      renderDrive();
      return;
    }

    var action = event.target.closest('[data-drive-action]');
    if (!action && row) {
      captureTableScroll();
      if (state.driveScope === 'trash') { renderDrive(); return; }
      if (resource.type === 'folder') {
        if (state.driveScope === 'pinned') { openResourceLocation(resource, true); return; }
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
          state.previewFullscreen = false;
          state.previewPage = 0;
          state.previewSheet = 0;
          state.previewMode = 'rendered';
        } catch (error) {
          state.previewId = null;
          state.previewFullscreen = false;
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
    dispatchDriveAction(name,resource,action);
  }

  function dispatchDriveAction(name,resource,action) {
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
    if (name === 'select') { state.selectedId = resource.id; renderDrive(); }
    if (name === 'open-relation') {
      var relation = relationsFor(resource)[Number(action.dataset.driveRelationIndex)];
      openRelationSource(relation);
    }
    if (name === 'toggle-pin') {
      var fromPinned = state.driveScope === 'pinned';
      var isPinned = fileContext().files.togglePinned(fileActor(), resource.id);
      renderDrive();
      showToast(isPinned ? '已置顶，可在置顶文件中查看' : '已取消置顶');
      window.setTimeout(function () {
        var focusTarget = fromPinned && !isPinned ? document.querySelector('[data-drive-search="main"]') : document.querySelector('[data-resource-id="' + resource.id + '"] .eva-drive__pin-button');
        if (focusTarget) focusTarget.focus();
      }, 0);
      return;
    }
    if (name === 'open-location') { openResourceLocation(resource); return; }
    if (name === 'preview') {
      try {
        var previewTarget = fileContext().files.resolveFile(resource, fileActor());
        if (previewTarget.type === 'external_link') { openExternalResource(resource); return; }
        state.previewId = resource.id;
        state.previewFullscreen = false;
        state.previewPage = 0;
        state.previewSheet = 0;
        state.previewMode = 'rendered';
        state.selectedId = null;
        renderDrive();
      } catch (error) {
        state.previewId = null;
        state.previewFullscreen = false;
        renderDrive();
        showToast(error.message || '当前文件无法预览');
      }
    }
    if (name === 'preview-fullscreen') {
      state.previewFullscreen = !state.previewFullscreen;
      renderDrive();
      requestAnimationFrame(function () {
        document.querySelector('[data-drive-action="preview-fullscreen"]')?.focus();
      });
      return;
    }
    if (name === 'preview-close') { state.previewId = null; state.previewFullscreen = false; renderDrive(); }
    if (name === 'download') { downloadDriveFile(resource); return; }
    if (name === 'detail-close') { state.selectedId = null; renderDrive(); }
    if (name === 'open-folder') {
      if (state.driveScope === 'pinned') { openResourceLocation(resource, true); return; }
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
    if (name === 'copy') { fileContext().files.copy(fileActor(), resource.id); showToast('已在当前文件库创建副本'); }
    if (name === 'trash') openDialog('trash', resource);
    if (name === 'restore') {
      var restoreResult = fileContext().files.restore(fileActor(), resource.id);
      state.selectedId = null;
      showToast(restoreResult && restoreResult.restoredToRoot ? '原位置不存在，已恢复到文件库根目录' : '已恢复到原位置');
    }
    if (name === 'delete-forever') openDialog('delete-forever', resource);
    if (name === 'dialog-close') closeDialog();
    if (name === 'dialog-confirm') confirmDialog();
  }

  function handleDriveInput(event) {
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
        if (state.previewId) {
          state.previewId = null;
          state.previewFullscreen = false;
          if (root && !root.hidden) renderDrive();
        }
      }
    });
    document.addEventListener('input', function (event) {
      if (event.target.closest('#eva-drive-root')) handleDriveInput(event);
    });
    document.addEventListener('change', function (event) {
      if (event.target.closest('#eva-drive-root')) handleDriveInput(event);
    });
    document.addEventListener('keydown', function (event) {
      if (event.key === 'Escape') {
        var menu = document.querySelector('.eva-space-picker__menu:not([hidden])');
        if (menu) menu.hidden = true;
        if (state.dialog || state.selectedId) return; // Shared Dialog owns nested Escape and focus restoration.
        if (state.previewId && state.previewFullscreen) {
          event.preventDefault();
          state.previewFullscreen = false;
          renderDrive();
          requestAnimationFrame(function () {
            document.querySelector('[data-drive-action="preview-fullscreen"]')?.focus();
          });
        }
        else if (state.previewId) { state.previewId = null; state.previewFullscreen = false; renderDrive(); }
      }
    });
    window.addEventListener('resize', function () {
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
    window.__evaNativePages.register('drive', function (host,services) {
      pageServices=services;
      var root = ensureDriveRoot(host);
      root.hidden = false;
      renderDrive();
      syncShellGeometry();
      return function () {
        closeDrive();
        pageServices?.showFileForm?.(null);pageServices?.showFileControls?.([]);pageServices=null;
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
