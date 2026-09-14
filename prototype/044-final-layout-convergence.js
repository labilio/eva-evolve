
(function () {
  'use strict';

  /* 个人 Eva 会话页已由 052-personal-eva-gds.js 按 GDS 六态重建，
     原先这里的头像气泡串（design.md:424 禁止的形态）连同
     personalMessages 假数据一并移除。本模块只剩：
     创建／编辑助理编辑器、数字员工市场页、旧自动化页签校正。 */

  function escapeHTML(value) {
    return String(value == null ? '' : value).replace(/[&<>"']/g, function (char) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[char];
    });
  }

  function tuneLegacyAutomation() {
    document.querySelectorAll('.eva-auto-tabs').forEach(function (tabs) {
      tabs.classList.add('eva-auto-segmented');
      var active = tabs.querySelector('.eva-auto-tab.is-active');
      tabs.dataset.active = active && active.dataset.evaAutoTab === 'history' ? 'history' : 'tasks';
      var buttons = tabs.querySelectorAll('.eva-auto-tab');
      if (buttons[0] && buttons[0].firstChild && buttons[0].firstChild.nodeType === 3 && buttons[0].firstChild.textContent !== '定时任务 ') buttons[0].firstChild.textContent = '定时任务 ';
      if (buttons[1] && buttons[1].textContent !== '运行记录') buttons[1].textContent = '运行记录';
    });
  }

  /* 消息与个人 Eva 共用一个中间栏宽度偏好。宽度归 documentElement 所有，
     页面切换只重新挂载视图，不复制状态；双击分隔线可恢复 260px。 */
  var conversationRailStorageKey = 'eva:conversation-rail-width';
  var conversationRailDefault = 260;
  var conversationRailMin = 220;
  var conversationRailMax = 480;
  var activeConversationRailDrag = null;

  function clampConversationRailWidth(width) {
    return Math.min(conversationRailMax, Math.max(conversationRailMin, Math.round(width)));
  }

  function setConversationRailWidth(width, persist) {
    var next = clampConversationRailWidth(width);
    document.documentElement.style.setProperty('--eva-conversation-rail-current', next + 'px');
    document.querySelectorAll('[data-eva-conversation-rail-resizer]').forEach(function (handle) {
      handle.setAttribute('aria-valuemin', String(conversationRailMin));
      handle.setAttribute('aria-valuemax', String(conversationRailMax));
      handle.setAttribute('aria-valuenow', String(next));
    });
    if (persist) localStorage.setItem(conversationRailStorageKey, String(next));
    return next;
  }

  function restoreConversationRailWidth() {
    var saved = Number(localStorage.getItem(conversationRailStorageKey));
    setConversationRailWidth(Number.isFinite(saved) && saved > 0 ? saved : conversationRailDefault, false);
  }

  document.addEventListener('pointerdown', function (event) {
    var handle = event.target.closest && event.target.closest('[data-eva-conversation-rail-resizer]');
    if (!handle || event.button !== 0) return;
    var rail = handle.closest('.ch-list, .eva-personal-sider-panel, .eva-ai-team__sidebar');
    if (!rail) return;
    event.preventDefault();
    activeConversationRailDrag = { pointerId: event.pointerId, startX: event.clientX, startWidth: rail.getBoundingClientRect().width };
    handle.setPointerCapture(event.pointerId);
    document.documentElement.classList.add('eva-conversation-rail-resizing');
  });

  document.addEventListener('pointermove', function (event) {
    if (!activeConversationRailDrag || event.pointerId !== activeConversationRailDrag.pointerId) return;
    setConversationRailWidth(activeConversationRailDrag.startWidth + event.clientX - activeConversationRailDrag.startX, false);
  });

  function finishConversationRailDrag(event) {
    if (!activeConversationRailDrag || event.pointerId !== activeConversationRailDrag.pointerId) return;
    var width = parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--eva-conversation-rail-current'));
    setConversationRailWidth(width, true);
    activeConversationRailDrag = null;
    document.documentElement.classList.remove('eva-conversation-rail-resizing');
  }

  document.addEventListener('pointerup', finishConversationRailDrag);
  document.addEventListener('pointercancel', finishConversationRailDrag);
  document.addEventListener('dblclick', function (event) {
    if (event.target.closest && event.target.closest('[data-eva-conversation-rail-resizer]')) setConversationRailWidth(conversationRailDefault, true);
  });
  document.addEventListener('keydown', function (event) {
    if (!event.target.matches || !event.target.matches('[data-eva-conversation-rail-resizer]')) return;
    if (event.key !== 'ArrowLeft' && event.key !== 'ArrowRight' && event.key !== 'Home') return;
    event.preventDefault();
    var current = parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--eva-conversation-rail-current')) || conversationRailDefault;
    setConversationRailWidth(event.key === 'Home' ? conversationRailDefault : current + (event.key === 'ArrowLeft' ? -10 : 10), true);
  });

  /* 文件预览宽度由当前布局宿主拥有，不写入全局或 localStorage。
     预览关闭后宿主可在本次挂载期间沿用宽度；页面卸载时自然重置。 */
  var filePreviewWidthProperty = '--eva-file-preview-current';
  var filePreviewMin = 280;
  var filePreviewMax = 664;
  var filePreviewStep = 16;
  var activeFilePreviewDrag = null;

  function filePreviewContext(handle) {
    var panel = handle && handle.closest('.eva-file-preview-sidebar, .ch-right-panel--file-preview, .eva-task-file-preview-pane');
    if (!panel) return null;
    var owner;
    var content;
    var contentMin = 320;
    if (panel.classList.contains('eva-drive-preview-sidebar')) {
      owner = panel.closest('.eva-drive');
      content = owner && owner.querySelector('.eva-drive__main');
      contentMin = 280;
    } else if (panel.classList.contains('eva-project-file-preview-sidebar')) {
      owner = panel.closest('.eva-project-files');
      content = owner && owner.querySelector('.eva-project-files__content');
    } else if (panel.classList.contains('ch-right-panel--file-preview')) {
      owner = panel.closest('.ch-main');
      content = owner && owner.querySelector('.ch-main__col');
    } else {
      owner = panel.closest('.loop-idp');
      content = owner && owner.querySelector('.loop-idp__body');
    }
    return owner ? { handle: handle, panel: panel, owner: owner, content: content, contentMin: contentMin } : null;
  }

  function filePreviewBounds(context) {
    var current = context.panel.getBoundingClientRect().width;
    var contentWidth = context.content ? context.content.getBoundingClientRect().width : 0;
    var layoutMax = contentWidth ? current + contentWidth - context.contentMin : context.owner.getBoundingClientRect().width * 0.66;
    var max = Math.min(filePreviewMax, Math.max(200, Math.floor(layoutMax)));
    var min = Math.min(filePreviewMin, max);
    return { min: min, max: max };
  }

  function syncFilePreviewHandle(context) {
    if (!context) return;
    var bounds = filePreviewBounds(context);
    var width = Math.round(context.panel.getBoundingClientRect().width);
    context.panel.querySelectorAll('[data-eva-file-preview-resizer]').forEach(function (handle) {
      handle.setAttribute('aria-valuemin', String(bounds.min));
      handle.setAttribute('aria-valuemax', String(bounds.max));
      handle.setAttribute('aria-valuenow', String(width));
      handle.setAttribute('aria-valuetext', width + ' 像素');
    });
  }

  function setFilePreviewWidth(context, width) {
    var bounds = filePreviewBounds(context);
    var next = Math.min(bounds.max, Math.max(bounds.min, Math.round(width)));
    context.owner.style.setProperty(filePreviewWidthProperty, next + 'px');
    syncFilePreviewHandle(context);
    return next;
  }

  function resetFilePreviewWidth(context) {
    context.owner.style.removeProperty(filePreviewWidthProperty);
    requestAnimationFrame(function () { syncFilePreviewHandle(context); });
  }

  document.addEventListener('pointerdown', function (event) {
    var handle = event.target.closest && event.target.closest('[data-eva-file-preview-resizer]');
    if (!handle || event.button !== 0) return;
    var context = filePreviewContext(handle);
    if (!context) return;
    event.preventDefault();
    activeFilePreviewDrag = {
      context: context,
      pointerId: event.pointerId,
      startX: event.clientX,
      startWidth: context.panel.getBoundingClientRect().width
    };
    handle.setPointerCapture(event.pointerId);
    document.documentElement.classList.add('eva-file-preview-resizing');
  });

  document.addEventListener('pointermove', function (event) {
    if (!activeFilePreviewDrag || event.pointerId !== activeFilePreviewDrag.pointerId) return;
    setFilePreviewWidth(activeFilePreviewDrag.context, activeFilePreviewDrag.startWidth + activeFilePreviewDrag.startX - event.clientX);
  });

  function finishFilePreviewDrag(event) {
    if (!activeFilePreviewDrag || event.pointerId !== activeFilePreviewDrag.pointerId) return;
    syncFilePreviewHandle(activeFilePreviewDrag.context);
    activeFilePreviewDrag = null;
    document.documentElement.classList.remove('eva-file-preview-resizing');
  }

  document.addEventListener('pointerup', finishFilePreviewDrag);
  document.addEventListener('pointercancel', finishFilePreviewDrag);
  document.addEventListener('dblclick', function (event) {
    var handle = event.target.closest && event.target.closest('[data-eva-file-preview-resizer]');
    var context = filePreviewContext(handle);
    if (!context) return;
    event.preventDefault();
    resetFilePreviewWidth(context);
  });
  document.addEventListener('focusin', function (event) {
    if (event.target.matches && event.target.matches('[data-eva-file-preview-resizer]')) syncFilePreviewHandle(filePreviewContext(event.target));
  });
  document.addEventListener('keydown', function (event) {
    if (!event.target.matches || !event.target.matches('[data-eva-file-preview-resizer]')) return;
    if (event.key !== 'ArrowLeft' && event.key !== 'ArrowRight' && event.key !== 'Home') return;
    var context = filePreviewContext(event.target);
    if (!context) return;
    event.preventDefault();
    if (event.key === 'Home') {
      resetFilePreviewWidth(context);
      return;
    }
    var current = context.panel.getBoundingClientRect().width;
    setFilePreviewWidth(context, current + (event.key === 'ArrowLeft' ? filePreviewStep : -filePreviewStep));
  });
  window.addEventListener('resize', function () {
    document.querySelectorAll('[data-eva-file-preview-resizer]').forEach(function (handle) {
      var context = filePreviewContext(handle);
      if (!context) return;
      if (context.owner.style.getPropertyValue(filePreviewWidthProperty)) setFilePreviewWidth(context, context.panel.getBoundingClientRect().width);
      else syncFilePreviewHandle(context);
    });
  });

  document.addEventListener('click', function (event) {
    var legacyTab = event.target.closest('.eva-auto-tabs .eva-auto-tab');
    if (legacyTab) requestAnimationFrame(tuneLegacyAutomation);
  }, true);

  restoreConversationRailWidth();
  tuneLegacyAutomation();
})();
