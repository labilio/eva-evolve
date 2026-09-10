
(function () {
  'use strict';

  var activeFeature = null;
  var pageTuneQueued = false;

  function icon(name) {
    var aliases = { refresh: 'rotate-ccw', bolt: 'zap', grid: 'layout-grid', check: 'circle-check', file: 'file-text', briefcase: 'briefcase-business', calendar: 'calendar-clock', chart: 'chart-column' };
    return window.__evaLucide(aliases[name] || name);
  }

  function isTeamMode() {
    return /^#\/(collab|messages)(?:[/?]|$)/.test(String(location.hash || ''));
  }

  function buildWorkboard() {
    var stats = [
      ['grid', '总数', '0'], ['check', '活跃', '0'], ['play', '运行中', '0'], ['shield', '诊断', '0'], ['clock', '最早就绪', '-']
    ];
    var columns = [
      ['', '收件箱'], ['', '积压'], ['eva-board-column--todo', '待办'], ['eva-board-column--planned', '已计划'], ['eva-board-column--ready', '就绪']
    ];
    return [
      '<section class="eva-personal-feature-page eva-feature-page" data-eva-page="workboard" hidden>',
      '<header class="eva-feature-head"><h1>任务看板</h1></header>',
      '<div class="eva-feature-body"><div class="eva-board-topline"><p class="eva-feature-intro">管理任务卡片、依赖、调度、运行和诊断</p>',
      '<div class="eva-feature-actions"><button class="eva-ui-btn" type="button">' + icon('refresh') + '刷新</button><button class="eva-ui-btn" type="button">' + icon('bolt') + '提醒调度器</button><button class="eva-ui-btn eva-ui-btn--primary" type="button">' + icon('plus') + '新建卡片</button></div></div>',
      '<div class="eva-board-stats">' + stats.map(function (item) { return '<div class="eva-board-stat"><span>' + icon(item[0]) + item[1] + '</span><strong>' + item[2] + '</strong></div>'; }).join('') + '</div>',
      '<section class="eva-board-filter"><div class="eva-board-filter__row"><div class="eva-faux-field eva-faux-field--muted">' + icon('search') + '<span class="eva-faux-field__text" title="搜索卡片、标签、助理或运行信息">搜索卡片、标签、助理或运行信息…</span></div><div class="eva-faux-field">全部优先级</div><div class="eva-faux-field">全部助理</div><div class="eva-faux-field">default</div></div><label class="eva-board-check"><input type="checkbox">显示已归档</label></section>',
      '<div class="eva-board-scroll" tabindex="0" role="region" aria-label="任务流程看板，可左右滚动"><div class="eva-board-columns">' + columns.map(function (item) { return '<section class="eva-board-column ' + item[0] + '"><div class="eva-board-column__head"><span class="eva-board-column__dot"></span><span>' + item[1] + '</span><span class="eva-board-column__count">0</span></div><div class="eva-board-column__empty">暂无卡片</div></section>'; }).join('') + '</div></div></div></section>'
    ].join('');
  }

  function taskCard(title, desc, time) {
    return '<article class="eva-auto-task"><div class="eva-auto-task__top"><strong>' + title + '</strong><span class="eva-auto-task__spacer"></span><button class="eva-auto-switch" type="button" role="switch" aria-checked="false" aria-label="启用或暂停"></button><button class="eva-auto-more" type="button" aria-label="更多">' + icon('ellipsis') + '</button></div><p class="eva-auto-task__desc">' + desc + '</p><div class="eva-auto-task__meta">' + icon('clock') + time + '<span class="eva-auto-status">已暂停</span></div></article>';
  }

  function templateCard(iconName, title, desc, time) {
    return '<button class="eva-auto-template" type="button"><span class="eva-auto-template__icon">' + icon(iconName) + '</span><span><strong>' + title + '</strong><p>' + desc + '</p><time>' + icon('clock') + time + '</time></span></button>';
  }

  function buildAutomation() {
    return [
      '<section class="eva-personal-feature-page eva-feature-page" data-eva-page="automation" hidden>',
      '<header class="eva-feature-head"><h1>自动化任务</h1></header>',
      '<div class="eva-feature-body"><p class="eva-feature-intro">按计划自动执行任务，让 AI 替你处理重复工作</p><div class="eva-auto-toolbar"><button class="eva-ui-btn eva-ui-btn--primary" type="button">' + icon('plus') + '新建</button></div>',
      '<div class="eva-auto-tabs" role="tablist"><button class="eva-auto-tab is-active" data-eva-auto-tab="tasks" type="button">任务 <span class="eva-auto-count">2</span></button><button class="eva-auto-tab" data-eva-auto-tab="history" type="button">历史</button></div>',
      '<div data-eva-auto-panel="tasks"><div class="eva-auto-task-grid">',
      taskCard('每日开源AI工具推介', '请搜索近期（过去7天内）发布或更新的、适合企业办公场景的开源AI Skill/插件/工具。要求：1. 排除已推介过…', '每天 09:00'),
      taskCard('每日开源Skill探索', '你是GeelyClaw，一个企业办公AI助手。请执行以下任务：【任务目标】搜索并整理行业内最新的开源Skill（…', '每天 11:00'),
      '</div><div class="eva-auto-template-title">从模板快速创建</div><div class="eva-auto-template-grid">',
      templateCard('file', '科技早报', '工作日早晨汇总科技、AI 和产品动态，筛出适合办公人群快速浏览的重点。', '工作日 08:30'),
      templateCard('briefcase', '每日工作收尾', '下班前整理当天进展、风险和明日待办，适合个人复盘或团队同步。', '工作日 18:00'),
      templateCard('calendar', '会议准备', '每天开始前梳理会议目标、待确认问题和需要提前准备的材料。', '工作日 08:45'),
      templateCard('chart', '周报草稿', '每周五生成一份结构化周报草稿，减少临下班补材料的成本。', '周五 17:30'),
      templateCard('shield', '项目健康巡检', '定期检查项目状态、近期变更和潜在风险，适合研发或运营项目。', '每天 10:00'),
      templateCard('bell', '月度行政提醒', '月底前提醒整理发票、报销、续费、合同和常规行政待办。', '每月 25 日 10:00'),
      '</div></div><div class="eva-auto-history" data-eva-auto-panel="history" hidden>暂无运行历史</div></div></section>'
    ].join('');
  }

  function ensureFeaturePages(host) {
    var page = document.querySelector('[data-eva-page="workboard"]');
    if (!page) {
      var template = document.createElement('template');
      template.innerHTML = buildWorkboard();
      page = template.content.firstElementChild;
    }
    if (host && page.parentElement !== host) host.appendChild(page);
    return page;
  }

  function setFeaturePage(name) {
    activeFeature = name;
    var page = document.querySelector('[data-eva-page="workboard"]');
    if (page) page.hidden = name !== 'workboard';
  }

  function clearFeaturePage() { setFeaturePage(null); }

  function renameExact(root, from, to) {
    if (!root) return;
    root.querySelectorAll('span, h1, h2, button').forEach(function (node) {
      if (node.children.length === 0 && node.textContent.trim() === from) node.textContent = to;
    });
  }

  function tuneProjectTerminology() {

    if (isTeamMode()) {
      var list = document.querySelector('.collab-list-page');
      if (list) {
        renameExact(list, '空间', '项目');
        renameExact(list, '新建空间', '新建项目');
        var search = list.querySelector('input[placeholder="搜索空间"]');
        if (search) search.placeholder = '搜索项目';
        list.querySelectorAll('button').forEach(function (button) {
          if (button.textContent.indexOf('新建空间') >= 0) button.textContent = button.textContent.replace('新建空间', '新建项目');
        });
      }
      document.querySelectorAll('.semi-modal').forEach(function (modal) {
        if (!modal.querySelector('.collab-create-form')) return;
        renameExact(modal, '新建空间', '新建项目');
        renameExact(modal, '创建空间', '创建项目');
        renameExact(modal, '空间名称', '项目名称');
      });
      document.querySelectorAll('.collab-tab').forEach(function (tab) {
        var label = tab.textContent.trim().replace(/\d+$/, '');
        if (label === '项目') {
          if (tab.getAttribute('aria-selected') === 'true') {
            var chatTab = Array.from(document.querySelectorAll('.collab-tab')).find(function (item) { return item.textContent.trim() === '群聊'; });
            if (chatTab) chatTab.click();
          }
          tab.hidden = true;
          tab.setAttribute('aria-hidden', 'true');
        } else if (['专家', '专家团', '技能'].indexOf(label) >= 0) {
          tab.hidden = true;
          tab.setAttribute('aria-hidden', 'true');
        } else {
          if (['文件', '资料', '团队文件'].indexOf(label) >= 0) tab.textContent = '文件';
          tab.hidden = false;
          tab.removeAttribute('aria-hidden');
        }
      });
      document.querySelectorAll('.sp-menu .mi').forEach(function (item) {
        if (item.textContent.indexOf('全部空间') >= 0) item.textContent = item.textContent.replace('全部空间', '全部项目');
      });
    }
  }

  function organizationProjectCard(title, desc, meta) {
    var card = document.createElement('div');
    card.className = 'collab-space-card eva-organization-project-card';
    card.tabIndex = 0;
    card.setAttribute('role', 'button');
    card.dataset.evaProjectKind = 'organization';
    card.innerHTML = '<span class="collab-space-ic">' + icon('users') + '</span><div class="info"><div class="name"><span>' + title + '</span><span class="eva-project-tag eva-project-tag--org">组织空间</span></div><div class="eva-space-card-desc">' + desc + '</div><div class="meta">' + meta + '</div></div>';
    return card;
  }

  function ensureProjectCards() {
    if (!isTeamMode()) return;
    var list = document.querySelector('.collab-list-page');
    if (!list) return;
    if (list.classList.contains('eva-project-directory')) return;
    var grid = list.querySelector('.collab-space-grid');
    if (!grid) {
      var section = document.createElement('section');
      section.className = 'eva-official-project-section';
      section.innerHTML = '<div class="collab-section-head"><h2>已加入</h2></div><div class="collab-space-grid"></div>';
      list.appendChild(section);
      grid = section.querySelector('.collab-space-grid');
    }
    /* Official is rendered by the native project list from window.__EVA_PROJECTS. */
    grid.querySelectorAll(':scope > .eva-official-project-card').forEach(function (card) { card.remove(); });
    var groupItems = Array.from(document.querySelectorAll('.eva-created-group-item'));
    groupItems.forEach(function (item) {
      var id = item.dataset.groupId;
      if (grid.querySelector('[data-eva-organization-id="' + id + '"]')) return;
      var org = organizationProjectCard(item.dataset.groupName, '由无项目拉群自动创建的组织空间', item.dataset.groupMemberNames);
      org.dataset.evaOrganizationId = id;
      grid.appendChild(org);
    });
  }

  function ensureProjectDetail() {
    var page = document.querySelector('.eva-project-detail-page');
    if (page) return page;
    page = document.createElement('section');
    page.className = 'eva-project-detail-page';
    page.hidden = true;
    page.innerHTML = '<header class="eva-project-detail-head"><h1></h1><span class="eva-project-tag"></span></header><nav class="eva-project-tabs" aria-label="项目功能"><button class="eva-project-tab is-active" type="button">任务</button><button class="eva-project-tab" type="button">群聊</button><button class="eva-project-tab" type="button">文件</button><button class="eva-project-tab" type="button">自动化</button><button class="eva-project-tab" type="button">项目设置</button></nav><div class="eva-project-detail-body"><p class="eva-project-detail-note"></p><div class="eva-project-groups"></div></div>';
    var list = document.querySelector('.collab-list-page');
    if (list && list.parentElement) list.parentElement.appendChild(page);
    return page;
  }

  function openProjectDetail(card) {
    clearFeaturePage();
    var page = ensureProjectDetail();
    var title = card.querySelector('.name > span').textContent.trim();
    page.querySelector('h1').textContent = title;
    var tag = page.querySelector('.eva-project-detail-head .eva-project-tag');
    tag.textContent = '项目';
    tag.classList.add('eva-project-tag--org');
    page.querySelector('.eva-project-detail-note').textContent = '无项目拉群时自动形成的项目；本次群聊是该项目的首个群聊。';
    var groups = [[title, card.querySelector('.meta').textContent.trim()]];
    page.querySelector('.eva-project-groups').innerHTML = groups.map(function (group) { return '<article class="eva-project-group-card"><strong># ' + group[0] + '</strong><span>' + group[1] + '</span></article>'; }).join('');
    page.hidden = false;
  }

  function closeProjectDetail() {
    var page = document.querySelector('.eva-project-detail-page');
    if (page) page.hidden = true;
  }

  function bindStaticInteractions() {
    document.querySelectorAll('.eva-auto-switch').forEach(function (button) {
      if (button.dataset.evaBound) return;
      button.dataset.evaBound = 'true';
      button.addEventListener('click', function () { button.setAttribute('aria-checked', button.getAttribute('aria-checked') === 'true' ? 'false' : 'true'); });
    });
    document.querySelectorAll('[data-eva-auto-tab]').forEach(function (button) {
      if (button.dataset.evaBound) return;
      button.dataset.evaBound = 'true';
      button.addEventListener('click', function () {
        var page = button.closest('[data-eva-page="automation"]');
        page.querySelectorAll('[data-eva-auto-tab]').forEach(function (tab) { tab.classList.toggle('is-active', tab === button); });
        page.querySelectorAll('[data-eva-auto-panel]').forEach(function (panel) { panel.hidden = panel.dataset.evaAutoPanel !== button.dataset.evaAutoTab; });
      });
    });
  }

  function tunePages() {
    pageTuneQueued = false;
    tuneProjectTerminology();
    ensureProjectCards();
    bindStaticInteractions();
    if (!isTeamMode()) closeProjectDetail();
  }

  function queueTunePages() {
    if (pageTuneQueued) return;
    pageTuneQueued = true;
    requestAnimationFrame(tunePages);
  }

  document.addEventListener('click', function (event) {
    var organization = event.target.closest('.eva-organization-project-card');
      if (organization) { event.preventDefault(); event.stopPropagation(); openProjectDetail(organization); return; }

  }, true);

  window.__evaNativePages.register('workboard', function (host) {
    var page = ensureFeaturePages(host);
    activeFeature = 'workboard';
    page.hidden = false;
    bindStaticInteractions();
    return function () {
      activeFeature = null;
      if (page.parentElement === host) page.remove();
    };
  });

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', queueTunePages, { once: true });
  else queueTunePages();

  window.addEventListener('hashchange', queueTunePages);

  new MutationObserver(queueTunePages).observe(document.documentElement, { childList: true, subtree: true });
})();
