
(function () {
  'use strict';

  var currentTab = 'connectors';
  var currentFilter = 'all';
  var searchQuery = '';
  var toastTimer = null;
  var modalReturnFocus = null;

  var data = {
    connectors: [
      { id: 'feishu', name: '飞书', icon: 'link', meta: 'OAuth · 个人账号', desc: '读取云文档、日历和会议信息，并在授权范围内执行操作。', foot: '最近使用：今天', active: true, capabilities: ['读取和整理云文档', '查询日历与会议', '在授权范围内写入内容'] },
      { id: 'mail', name: '企业邮箱', icon: 'mail', meta: 'IMAP · 个人账号', desc: '收发邮件、搜索往来内容，并按规则辅助整理。', foot: '最近使用：昨天', active: true, capabilities: ['搜索和读取邮件', '创建邮件草稿', '按规则整理邮件'] },
      { id: 'folder', name: '本地文件夹', icon: 'folder', meta: '本机 · 目录授权', desc: '在你明确授权的目录中读取和整理文件。', foot: '授权范围：1 个目录', active: false, capabilities: ['读取授权目录', '整理文件结构', '生成新文件'] }
    ],
    skills: [
      { id: 'meeting-notes', name: '会议纪要整理', icon: 'sparkles', meta: '内容处理', desc: '把会议录音或文字整理为结论、决定和后续行动。', foot: '2 个助理正在使用', active: true, capabilities: ['提取会议结论', '识别负责人和截止时间', '生成行动清单'] },
      { id: 'sheet-analysis', name: '数据表分析', icon: 'chart', meta: '数据处理', desc: '分析表格结构、异常数据和关键趋势，生成简洁结论。', foot: '1 个助理正在使用', active: true, capabilities: ['检查表格结构', '发现异常值', '生成趋势摘要'] },
      { id: 'web-extract', name: '网页信息提取', icon: 'file', meta: '信息获取', desc: '从网页中提取正文、列表和结构化信息。', foot: '有可用更新', active: false, capabilities: ['提取网页正文', '识别列表与表格', '输出结构化结果'] }
    ],
    mcp: [
      { id: 'browser', name: 'Browser', icon: 'browser', meta: '本地服务', desc: '提供网页访问与自动化操作能力。', foot: '4 个工具', active: true, capabilities: ['打开和读取网页', '执行页面操作', '截取页面内容'] },
      { id: 'database', name: 'Database', icon: 'database', meta: '服务账号 · 只读', desc: '在授权的数据源中执行查询并读取结果。', foot: '2 个工具', active: true, capabilities: ['执行只读查询', '读取查询结果'] },
      { id: 'gitlab', name: 'GitLab', icon: 'git', meta: 'Personal Token · 个人账号', desc: '读取代码仓库、合并请求和流水线状态。', foot: '4 个工具', active: false, capabilities: ['读取仓库内容', '查看合并请求', '查询流水线状态'] }
    ]
  };

  var labels = {
    connectors: { title: '连接器', desc: '管理需要身份授权的外部系统与本机资源。', create: '添加连接器', active: '已连接', inactive: '未连接', enable: '连接', disable: '断开连接' },
    skills: { title: '技能', desc: '管理助理可以安装和调用的工作方法。', create: '新建或导入技能', active: '已安装', inactive: '未安装', enable: '安装', disable: '卸载' },
    mcp: { title: 'MCP', desc: '管理为助理提供工具能力的 MCP 服务。', create: '添加 MCP 服务', active: '已启用', inactive: '未启用', enable: '启用', disable: '停用' }
  };

  function esc(value) {
    return String(value == null ? '' : value).replace(/[&<>"']/g, function (char) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[char];
    });
  }

  function icon(name) {
    var paths = {
      plus: '<path d="M12 5v14M5 12h14"></path>',
      link: '<path d="M10 13a5 5 0 0 0 7.5.5l2-2a5 5 0 0 0-7-7l-1.1 1.1"></path><path d="M14 11a5 5 0 0 0-7.5-.5l-2 2a5 5 0 0 0 7 7l1.1-1.1"></path>',
      mail: '<rect width="18" height="14" x="3" y="5" rx="2"></rect><path d="m3 7 9 6 9-6"></path>',
      folder: '<path d="M3 6h6l2 2h10v10a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"></path>',
      sparkles: '<path d="m12 3-1.4 3.6L7 8l3.6 1.4L12 13l1.4-3.6L17 8l-3.6-1.4z"></path><path d="m5 15-.8 2.2L2 18l2.2.8L5 21l.8-2.2L8 18l-2.2-.8z"></path>',
      chart: '<path d="M3 3v18h18M7 16v-5M12 16V8M17 16v-9"></path>',
      file: '<path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><path d="M14 2v6h6M8 13h8M8 17h5"></path>',
      browser: '<rect width="18" height="16" x="3" y="4" rx="2"></rect><path d="M3 9h18M8 4v5"></path>',
      database: '<ellipse cx="12" cy="5" rx="8" ry="3"></ellipse><path d="M4 5v14c0 1.7 3.6 3 8 3s8-1.3 8-3V5M4 12c0 1.7 3.6 3 8 3s8-1.3 8-3"></path>',
      git: '<circle cx="6" cy="6" r="2"></circle><circle cx="18" cy="18" r="2"></circle><path d="M6 8v8a2 2 0 0 0 2 2h8M14 6h4v4"></path>'
    };
    return '<svg viewBox="0 0 24 24" aria-hidden="true">' + (paths[name] || paths.link) + '</svg>';
  }

  function ensureShell() {
    var center = document.querySelector('.eva-connection-center');
    if (center) return center;
    center = document.createElement('section');
    center.className = 'eva-connection-center';
    center.hidden = true;
    center.innerHTML = [
      '<header class="eva-connection-center__head"><h1>连接中心</h1><p>集中管理 EVA 可使用的连接器、技能与 MCP 服务</p></header>',
      '<div class="eva-connection-center__body">',
      '<nav class="eva-connection-tabs" role="tablist" aria-label="连接中心分类">',
      '<button class="eva-connection-tab" type="button" role="tab" data-center-tab="connectors">连接器 <span class="eva-connection-tab__count"></span></button>',
      '<button class="eva-connection-tab" type="button" role="tab" data-center-tab="skills">技能 <span class="eva-connection-tab__count"></span></button>',
      '<button class="eva-connection-tab" type="button" role="tab" data-center-tab="mcp">MCP <span class="eva-connection-tab__count"></span></button>',
      '</nav>',
      '<section class="eva-connection-panel"><div class="eva-connection-panel__top"><div><h2></h2><p></p></div></div>',
      '<div class="eva-center-toolbar"><label class="eva-connection-search">' + window.__evaLucide('search', { size: 16 }) + '<input data-center-search type="search" placeholder="搜索"></label>',
      '<div class="eva-center-filters"><button class="eva-center-filter" type="button" data-center-filter="all">全部</button><button class="eva-center-filter" type="button" data-center-filter="active"></button><button class="eva-center-filter" type="button" data-center-filter="inactive"></button></div>',
      '<span class="eva-center-toolbar__spacer"></span><button class="eva-center-primary" type="button" data-center-create>' + icon('plus') + '<span></span></button></div>',
      '<div class="eva-connection-grid" data-center-grid></div></section></div>',
      '<div class="eva-center-toast" role="status" hidden></div>'
    ].join('');
    return center;
  }

  function getItem(id) {
    return data[currentTab].find(function (item) { return item.id === id; }) || null;
  }

  function render() {
    var center = document.querySelector('.eva-connection-center');
    if (!center) return;
    var copy = labels[currentTab];
    center.querySelectorAll('[data-center-tab]').forEach(function (tab) {
      var selected = tab.dataset.centerTab === currentTab;
      tab.classList.toggle('is-active', selected);
      tab.setAttribute('aria-selected', selected ? 'true' : 'false');
      tab.tabIndex = selected ? 0 : -1;
      tab.querySelector('.eva-connection-tab__count').textContent = data[tab.dataset.centerTab].length;
    });
    center.querySelector('.eva-connection-panel__top h2').textContent = copy.title;
    center.querySelector('.eva-connection-panel__top p').textContent = copy.desc;
    center.querySelector('[data-center-search]').placeholder = '搜索' + copy.title;
    center.querySelector('[data-center-search]').value = searchQuery;
    center.querySelector('[data-center-create] span').textContent = copy.create;
    var filterButtons = center.querySelectorAll('[data-center-filter]');
    filterButtons.forEach(function (button) {
      button.classList.toggle('is-active', button.dataset.centerFilter === currentFilter);
      button.setAttribute('aria-pressed', String(button.dataset.centerFilter === currentFilter));
      if (button.dataset.centerFilter === 'active') button.textContent = copy.active;
      if (button.dataset.centerFilter === 'inactive') button.textContent = copy.inactive;
    });
    renderGrid();
  }

  function renderGrid() {
    var center = ensureShell();
    var copy = labels[currentTab];
    var query = searchQuery.trim().toLowerCase();
    var items = data[currentTab].filter(function (item) {
      var statusMatch = currentFilter === 'all' || (currentFilter === 'active' ? item.active : !item.active);
      var queryMatch = !query || [item.name, item.meta, item.desc].join(' ').toLowerCase().indexOf(query) >= 0;
      return statusMatch && queryMatch;
    });
    var grid = center.querySelector('[data-center-grid]');
    if (!items.length) {
      grid.innerHTML = '<div class="eva-center-empty">没有匹配的' + copy.title + '</div>';
      return;
    }
    grid.innerHTML = items.map(function (item) {
      return '<article class="eva-connection-card" data-center-card="' + esc(item.id) + '"><div class="eva-connection-card__head"><span class="eva-connection-card__icon">' + icon(item.icon) + '</span><div class="eva-connection-card__title"><strong>' + esc(item.name) + '</strong><span>' + esc(item.meta) + '</span></div><span class="eva-connection-card__status ' + (item.active ? '' : 'eva-connection-card__status--off') + '">' + (item.active ? copy.active : copy.inactive) + '</span></div><p class="eva-connection-card__desc">' + esc(item.desc) + '</p><div class="eva-connection-card__foot"><span>' + esc(item.foot) + '</span><span class="eva-connection-card__actions"><button class="eva-connection-card__action eva-connection-card__action--quiet" type="button" data-center-detail="' + esc(item.id) + '">查看详情</button><button class="eva-connection-card__action ' + (item.active ? 'eva-connection-card__action--danger' : '') + '" type="button" data-center-toggle="' + esc(item.id) + '">' + (item.active ? copy.disable : copy.enable) + '</button></span></div></article>';
    }).join('');
  }

  function ensureModalLayer() {
    var layer = document.querySelector('.eva-center-modal-layer');
    if (layer) return layer;
    layer = document.createElement('div');
    layer.className = 'eva-center-modal-layer';
    layer.hidden = true;
    document.body.appendChild(layer);
    return layer;
  }

  function openModal(html) {
    var layer = ensureModalLayer();
    if (layer.hidden) modalReturnFocus = document.activeElement;
    layer.innerHTML = '<section class="eva-center-modal" role="dialog" aria-modal="true" aria-labelledby="eva-center-modal-title">' + html + '</section>';
    layer.hidden = false;
    layer.querySelectorAll('.eva-center-field').forEach(function (field, index) {
      var control = field.querySelector('input, select, textarea');
      var label = field.querySelector('label');
      if (control && label) { control.id = 'eva-center-field-' + index; label.htmlFor = control.id; }
    });
    var focusable = layer.querySelector('input, select, textarea') || layer.querySelector('button');
    if (focusable) focusable.focus();
  }

  function closeModal() {
    var layer = ensureModalLayer();
    layer.hidden = true;
    layer.innerHTML = '';
    if (modalReturnFocus && modalReturnFocus.isConnected) modalReturnFocus.focus();
    modalReturnFocus = null;
  }

  function modalHead(title) {
    return '<header class="eva-center-modal__head"><h2 id="eva-center-modal-title">' + esc(title) + '</h2><button class="eva-center-modal__close" type="button" data-center-close aria-label="关闭"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="m6 6 12 12M6 18 18 6"/></svg></button></header>';
  }

  function showToast(message) {
    var toast = ensureShell().querySelector('.eva-center-toast');
    toast.textContent = message;
    toast.hidden = false;
    if (toastTimer) clearTimeout(toastTimer);
    toastTimer = setTimeout(function () { toast.hidden = true; }, 1800);
  }

  function openDetail(id) {
    var item = getItem(id);
    if (!item) return;
    var copy = labels[currentTab];
    openModal(modalHead(item.name) + '<div class="eva-center-modal__body"><div class="eva-center-detail-meta"><span>' + esc(item.meta) + '</span><span>' + (item.active ? copy.active : copy.inactive) + '</span></div><p>' + esc(item.desc) + '</p><ul class="eva-center-capabilities">' + item.capabilities.map(function (capability) { return '<li>' + esc(capability) + '</li>'; }).join('') + '</ul></div><footer class="eva-center-modal__footer">' + (currentTab === 'mcp' ? '<button class="eva-center-secondary eva-center-secondary--danger" type="button" data-center-delete="' + esc(item.id) + '">删除服务</button>' : '') + '<button class="eva-center-secondary" type="button" data-center-close>关闭</button><button class="eva-center-primary" type="button" data-center-toggle="' + esc(item.id) + '">' + (item.active ? copy.disable : copy.enable) + '</button></footer>');
  }

  function openConfirm(id, mode) {
    var item = getItem(id);
    if (!item) return;
    var copy = labels[currentTab];
    var deleting = mode === 'delete';
    var action = deleting ? '删除' : copy.disable;
    openModal(modalHead(action + item.name) + '<div class="eva-center-modal__body"><p>' + (deleting ? '删除后，该 MCP 服务及其工具将从连接中心移除。' : '执行后，助理将暂时无法继续使用这项能力。') + '</p></div><footer class="eva-center-modal__footer"><button class="eva-center-secondary" type="button" data-center-close>取消</button><button class="eva-center-secondary eva-center-secondary--danger" type="button" data-center-confirm="' + esc(id) + '" data-center-confirm-mode="' + mode + '">确认' + action + '</button></footer>');
  }

  function openAuthorization(id) {
    var item = getItem(id);
    if (!item) return;
    openModal(modalHead('连接' + item.name) + '<div class="eva-center-modal__body"><p>确认授权范围后建立连接。Demo 不会访问真实账号。</p><div class="eva-center-field"><label>账号</label><input value="demo@geely.com" aria-label="授权账号"></div><div class="eva-center-permissions"><label><input type="checkbox" checked>读取基础资料</label><label><input type="checkbox" checked>读取业务内容</label><label><input type="checkbox">允许写入或执行操作</label></div></div><footer class="eva-center-modal__footer"><button class="eva-center-secondary" type="button" data-center-close>取消</button><button class="eva-center-primary" type="button" data-center-authorize="' + esc(id) + '">授权并连接</button></footer>');
  }

  function createFields(tab, sourceMode) {
    if (tab === 'connectors') return '<div class="eva-center-field"><label>连接器名称</label><input data-center-field="name" placeholder="例如：企业知识库"></div><div class="eva-center-field"><label>认证方式</label><select data-center-field="meta"><option>OAuth · 个人账号</option><option>组织凭证 · 管理员配置</option><option>本机 · 目录授权</option></select></div><div class="eva-center-field"><label>用途说明</label><textarea data-center-field="desc" placeholder="说明这个连接器可以让助理做什么"></textarea></div>';
    if (tab === 'mcp') return '<div class="eva-center-field"><label>服务名称</label><input data-center-field="name" placeholder="例如：CRM 查询"></div><div class="eva-center-field"><label>传输方式</label><select data-center-field="meta"><option>HTTP</option><option>SSE</option><option>stdio</option></select></div><div class="eva-center-field"><label>地址或启动命令</label><input data-center-field="desc" placeholder="https://example.com/mcp 或启动命令"></div>';
    return '<div class="eva-center-source-tabs"><button class="eva-center-source-tab ' + (sourceMode === 'draft' ? 'is-active' : '') + '" type="button" data-skill-source="draft">新建技能</button><button class="eva-center-source-tab ' + (sourceMode === 'url' ? 'is-active' : '') + '" type="button" data-skill-source="url">从 URL 导入</button></div>' + (sourceMode === 'url' ? '<div class="eva-center-field"><label>技能地址</label><input data-center-field="url" placeholder="https://github.com/.../SKILL.md"></div>' : '<div class="eva-center-field"><label>技能名称</label><input data-center-field="name" placeholder="例如：项目周报整理"></div><div class="eva-center-field"><label>技能说明</label><textarea data-center-field="desc" placeholder="说明适用场景和主要步骤"></textarea></div>');
  }

  function openCreate(sourceMode) {
    sourceMode = sourceMode || 'draft';
    var copy = labels[currentTab];
    openModal(modalHead(copy.create) + '<div class="eva-center-modal__body" data-center-create-body data-source-mode="' + sourceMode + '">' + createFields(currentTab, sourceMode) + '<div class="eva-center-form-error" data-center-error role="alert" id="eva-center-form-error" hidden></div></div><footer class="eva-center-modal__footer"><button class="eva-center-secondary" type="button" data-center-close>取消</button><button class="eva-center-primary" type="button" data-center-submit-create>' + (currentTab === 'skills' && sourceMode === 'url' ? '导入' : '创建') + '</button></footer>');
  }

  function submitCreate() {
    var body = document.querySelector('[data-center-create-body]');
    if (!body) return;
    var sourceMode = body.dataset.sourceMode;
    var nameInput = body.querySelector('[data-center-field="name"]');
    var urlInput = body.querySelector('[data-center-field="url"]');
    var metaInput = body.querySelector('[data-center-field="meta"]');
    var descInput = body.querySelector('[data-center-field="desc"]');
    var url = urlInput ? urlInput.value.trim() : '';
    var name = nameInput ? nameInput.value.trim() : '';
    if (currentTab === 'skills' && sourceMode === 'url') name = url.split('/').filter(Boolean).pop() || '';
    var error = body.querySelector('[data-center-error]');
    if (!name || (currentTab === 'skills' && sourceMode === 'url' && !/^https?:\/\//i.test(url))) {
      var invalid = urlInput || nameInput;
      if (invalid) { invalid.setAttribute('aria-invalid', 'true'); invalid.setAttribute('aria-describedby', 'eva-center-form-error'); invalid.focus(); }
      error.hidden = false;
      error.textContent = currentTab === 'skills' && sourceMode === 'url' ? '请输入有效的 HTTP 或 HTTPS 地址' : '请输入名称';
      return;
    }
    var id = currentTab + '-' + Date.now();
    data[currentTab].unshift({
      id: id,
      name: name,
      icon: currentTab === 'connectors' ? 'link' : (currentTab === 'skills' ? 'sparkles' : 'database'),
      meta: metaInput ? metaInput.value : (sourceMode === 'url' ? 'URL 导入' : '本地创建'),
      desc: descInput && descInput.value.trim() ? descInput.value.trim() : (currentTab === 'skills' ? '新加入的技能，可以安装给助理使用。' : '新加入的能力。'),
      foot: currentTab === 'mcp' ? '尚未发现工具' : '刚刚添加',
      active: true,
      capabilities: currentTab === 'connectors' ? ['读取授权内容', '在授权范围内执行操作'] : (currentTab === 'skills' ? ['供助理按需调用', '可查看和维护技能内容'] : ['等待服务返回工具列表'])
    });
    closeModal();
    render();
    showToast(name + (currentTab === 'skills' && sourceMode === 'url' ? ' 已导入' : ' 已创建'));
  }

  function changeState(id, active) {
    var item = getItem(id);
    if (!item) return;
    item.active = active;
    closeModal();
    render();
    showToast(item.name + ' ' + (active ? labels[currentTab].active : labels[currentTab].inactive));
  }

  function deleteItem(id) {
    var item = getItem(id);
    if (!item) return;
    data[currentTab] = data[currentTab].filter(function (entry) { return entry.id !== id; });
    closeModal();
    render();
    showToast(item.name + ' 已删除');
  }

  document.addEventListener('input', function (event) {
    if (event.target.matches('[data-center-field]')) { event.target.removeAttribute('aria-invalid'); event.target.removeAttribute('aria-describedby'); var error = document.querySelector('[data-center-error]'); if (error) error.hidden = true; }
    if (!event.target.matches('[data-center-search]')) return;
    searchQuery = event.target.value;
    renderGrid();
  });

  document.addEventListener('click', function (event) {
    var tab = event.target.closest('[data-center-tab]');
    if (tab) { currentTab = tab.dataset.centerTab; currentFilter = 'all'; searchQuery = ''; render(); return; }
    var filter = event.target.closest('[data-center-filter]');
    if (filter) { currentFilter = filter.dataset.centerFilter; render(); return; }
    if (event.target.closest('[data-center-create]')) { openCreate(); return; }
    var source = event.target.closest('[data-skill-source]');
    if (source) { openCreate(source.dataset.skillSource); return; }
    if (event.target.closest('[data-center-submit-create]')) { submitCreate(); return; }
    var detail = event.target.closest('[data-center-detail]');
    if (detail) { openDetail(detail.dataset.centerDetail); return; }
    var toggle = event.target.closest('[data-center-toggle]');
    if (toggle) {
      var item = getItem(toggle.dataset.centerToggle);
      if (!item) return;
      if (item.active) openConfirm(item.id, 'disable');
      else if (currentTab === 'connectors') openAuthorization(item.id);
      else changeState(item.id, true);
      return;
    }
    var authorize = event.target.closest('[data-center-authorize]');
    if (authorize) { changeState(authorize.dataset.centerAuthorize, true); return; }
    var remove = event.target.closest('[data-center-delete]');
    if (remove) { openConfirm(remove.dataset.centerDelete, 'delete'); return; }
    var confirm = event.target.closest('[data-center-confirm]');
    if (confirm) {
      if (confirm.dataset.centerConfirmMode === 'delete') deleteItem(confirm.dataset.centerConfirm);
      else changeState(confirm.dataset.centerConfirm, false);
      return;
    }
    if (event.target.closest('[data-center-close]') || (event.target.classList.contains('eva-center-modal-layer'))) { closeModal(); return; }

  }, true);

  document.addEventListener('keydown', function (event) {
    var layer = document.querySelector('.eva-center-modal-layer:not([hidden])');
    if (layer) {
      if (event.key === 'Escape') { event.preventDefault(); closeModal(); return; }
      if (event.key === 'Tab') {
        var nodes = Array.from(layer.querySelectorAll('button, input, select, textarea, [tabindex]')).filter(function (node) { return !node.disabled && node.tabIndex >= 0 && node.getClientRects().length; });
        var first = nodes[0], last = nodes[nodes.length - 1];
        if (first && (event.shiftKey ? document.activeElement === first : document.activeElement === last)) { event.preventDefault(); (event.shiftKey ? last : first).focus(); }
      }
      return;
    }
    var tab = event.target.closest('[data-center-tab]');
    if (tab && ['ArrowLeft', 'ArrowRight', 'Home', 'End'].indexOf(event.key) >= 0) {
      var tabs = Array.from(tab.parentElement.querySelectorAll('[data-center-tab]'));
      var index = event.key === 'Home' ? 0 : event.key === 'End' ? tabs.length - 1 : (tabs.indexOf(tab) + (event.key === 'ArrowRight' ? 1 : -1) + tabs.length) % tabs.length;
      event.preventDefault(); tabs[index].click(); tabs[index].focus();
    }
  });

  window.__evaNativePages.register('connection-center', function (host) {
    var center = ensureShell();
    host.appendChild(center);
    center.classList.add('eva-connection-center--native');
    center.hidden = false;
    render();
    return function () {
      var layer = document.querySelector('.eva-center-modal-layer');
      if (layer) {
        layer.hidden = true;
        layer.innerHTML = '';
      }
      if (center.parentElement === host) center.remove();
    };
  });
})();
