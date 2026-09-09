
(function () {
  'use strict';

  var DEFAULT_SPACE_NAMES = (window.__EVA_PROJECTS || []).map(function (project) { return project.name; });
  var SPACE_IDS = (window.__EVA_PROJECTS || []).reduce(function (ids, project) {
    ids[project.name] = project.id;
    return ids;
  }, {});

  var spaceTreeExpanded = true;

  var MESSAGE_ACTION_ICONS = {
    reply: '<path d="M21 15a4 4 0 0 1-4 4H8l-5 3V7a4 4 0 0 1 4-4h10a4 4 0 0 1 4 4z"></path><path d="M8 10h.01M12 10h.01M16 10h.01"></path>',
    copy: '<rect width="14" height="14" x="8" y="8" rx="2" ry="2"></rect><path d="M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2"></path>',
    forward: '<path d="m15 17 5-5-5-5"></path><path d="M4 18v-2a4 4 0 0 1 4-4h12"></path>',
    multi: '<path d="M11 12H3M16 6H3M16 18H3"></path><path d="m16 12 2 2 4-4"></path>',
    revoke: '<path d="M9 14 4 9l5-5"></path><path d="M4 9h11a5 5 0 0 1 5 5v0a5 5 0 0 1-5 5H9"></path>',
    createThread: '<path d="M8 12h.01M12 12h.01M16 12h.01"></path><path d="M21 15a4 4 0 0 1-4 4H8l-5 3V7a4 4 0 0 1 4-4h10a4 4 0 0 1 4 4z"></path><path d="M19 2v4M17 4h4"></path>',
    driveNav: '<path d="M10 16h.01"></path><path d="M2.212 11.577a2 2 0 0 0-.212.896V18a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-5.527a2 2 0 0 0-.212-.896L18.55 5.11A2 2 0 0 0 16.76 4H7.24a2 2 0 0 0-1.79 1.11z"></path><path d="M21.946 12.013H2.054"></path><path d="M6 16h.01"></path>'
  };

  function messageActionIcon(name, className) {
    var iconBody = window.EvaFileMessage.iconBody(name) || MESSAGE_ACTION_ICONS[name] || '';
    return '<svg class="' + (className || '') + '" viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' + iconBody + '</svg>';
  }

  function directText(element) {
    if (!element) return '';
    return String(element.textContent || '').trim();
  }

  function labelText(element) {
    if (!element) return '';
    var node = Array.from(element.childNodes).find(function (item) {
      return item.nodeType === Node.TEXT_NODE && String(item.textContent || '').trim();
    });
    return node ? String(node.textContent || '').trim() : directText(element);
  }

  function nativeNavItem(container, label) {
    if (!container) return null;
    return Array.from(container.children).find(function (child) {
      return Array.from(child.querySelectorAll('span')).some(function (span) {
        return directText(span) === label;
      });
    }) || null;
  }

  function contactsIsOpen() {
    return String(location.hash || '').indexOf('#/contacts') === 0;
  }

  function buildSpaceTree() {
    var tree = document.getElementById('eva-space-tree');
    if (tree) tree.remove();
    var driveNav = document.getElementById('eva-drive-nav');
    var container = driveNav && driveNav.parentElement;
    var spaceNav = nativeNavItem(container, '项目') || nativeNavItem(container, '空间');
    if (!spaceNav) return;
    spaceNav.classList.remove('eva-space-tree-parent', 'eva-space-tree-parent--child-active');
    spaceNav.removeAttribute('data-eva-space-tree-parent');
    spaceNav.removeAttribute('aria-expanded');
    var chevron = spaceNav.querySelector('.eva-space-tree-parent__chevron');
    if (chevron) chevron.remove();
  }

  function syncSpaceTreeSelection() {
    var root = document.getElementById('eva-drive-root');
    var driveOpen = Boolean(root && !root.hidden);
    var contactsOpen = contactsIsOpen();
    var currentName = directText(document.querySelector('.collab-sp-chip .nm'));
    var spaceParent = document.querySelector('[data-eva-space-tree-parent]');
    var childIsActive = Boolean(!driveOpen && !contactsOpen && currentName && DEFAULT_SPACE_NAMES.indexOf(currentName) >= 0);

    if (spaceParent) {
      spaceParent.classList.toggle('eva-space-tree-parent--child-active', childIsActive);
      if (childIsActive) {
        if (!Object.prototype.hasOwnProperty.call(spaceParent.dataset, 'evaSpaceTreePreviousAriaCurrent')) {
          spaceParent.dataset.evaSpaceTreePreviousAriaCurrent = spaceParent.getAttribute('aria-current') || '';
        }
        spaceParent.setAttribute('aria-current', 'false');
      } else if (Object.prototype.hasOwnProperty.call(spaceParent.dataset, 'evaSpaceTreePreviousAriaCurrent')) {
        var previous = spaceParent.dataset.evaSpaceTreePreviousAriaCurrent;
        if (previous) spaceParent.setAttribute('aria-current', previous);
        else spaceParent.removeAttribute('aria-current');
        delete spaceParent.dataset.evaSpaceTreePreviousAriaCurrent;
      }
    }

    document.querySelectorAll('[data-eva-space-child]').forEach(function (button) {
      var selected = !driveOpen && !contactsOpen && currentName && button.dataset.evaSpaceChild === currentName;
      button.setAttribute('aria-current', selected ? 'page' : 'false');
    });
  }

  function tuneDriveView() {
    var root = document.getElementById('eva-drive-root');
    if (!root || root.hidden) return;
    root.querySelectorAll('[data-drive-action="bridge"]').forEach(function (button) {
      if (!button.hidden) button.hidden = true;
      button.setAttribute('aria-hidden', 'true');
    });
  }

  function fileNameFromCard(card) {
    return directText(card && card.querySelector('.wk-message-file-name'));
  }

  function openDrive(record) {
    if (record && typeof window.__evaOpenDriveFile === 'function' && window.__evaOpenDriveFile(record)) return;
    if (typeof window.__evaOpenDrive === 'function') {
      window.__evaOpenDrive('global', null, 'personal');
      return;
    }
    var driveNav = document.getElementById('eva-drive-nav');
    if (driveNav) driveNav.click();
  }

  window.EvaFileMessage.setOpenDriveHandler(openDrive);

  window.EvaIMConversation = Object.freeze({
    open: function (conversationId) {
      if (!conversationId) return;
      window.dispatchEvent(new CustomEvent('eva-im:open', { detail: { conversationId: conversationId } }));
    }
  });

  function tuneMessageView() {
    document.body.classList.add('eva-message-hierarchy-ready');
    buildSpaceTree();
    syncSpaceTreeSelection();
    tuneDriveView();

    document.querySelectorAll('.eva-msg .wk-sidebar-tabbar').forEach(function (tabbar) {
      if (tabbar.dataset.evaProjectRecentSwitcher === 'true') return;
      if (!tabbar.hidden) tabbar.hidden = true;
      if (tabbar.getAttribute('aria-hidden') !== 'true') tabbar.setAttribute('aria-hidden', 'true');
    });

    document.querySelectorAll('.eva-msg input[placeholder="搜索"]').forEach(function (input) {
      input.placeholder = '搜索群聊、子区或联系人';
      input.setAttribute('aria-label', '搜索群聊、子区或联系人');
    });

    document.querySelectorAll('.wk-category-section').forEach(function (section) {
      var header = section.querySelector(':scope > .wk-category-header');
      var nameNode = header && header.querySelector('.wk-category-header__name');
      var name = labelText(nameNode);
      var expanded = Boolean(section.querySelector(':scope > .wk-category-section__content--expanded'));
      section.classList.toggle('eva-dm-scope', name === '私聊消息');
      section.classList.toggle('eva-org-scope', name === '全员沟通');
      if (header) {
        header.setAttribute('role', 'button');
        header.setAttribute('tabindex', '0');
        header.setAttribute('aria-expanded', expanded ? 'true' : 'false');
        header.setAttribute('aria-label', (expanded ? '收起' : '展开') + name);
      }
    });

    document.querySelectorAll('.eva-msg').forEach(function (messageRoot) {
      var selected = messageRoot.querySelector('.wk-conv-compact-item--selected');
      var privateSection = selected && selected.closest('.eva-dm-scope');
      messageRoot.classList.toggle('eva-private-chat-selected', Boolean(privateSection));
      if (privateSection) {
        var threadButton = messageRoot.querySelector('.ch-head .op[title="子区"]');
        if (threadButton && threadButton.classList.contains('is-on')) threadButton.click();
      }
    });

    document.querySelectorAll('.wk-conv-compact-item').forEach(function (item) {
      item.setAttribute('role', 'button');
      if (!item.hasAttribute('tabindex')) item.setAttribute('tabindex', '0');
    });
  }

  document.addEventListener('keydown', function (event) {
    if (event.key !== 'Enter' && event.key !== ' ') return;
    var target = event.target.closest('.wk-category-header, .wk-conv-compact-item');
    if (!target) return;
    event.preventDefault();
    target.click();
  });

  document.addEventListener('click', function (event) {
    var spaceChild = event.target.closest('[data-eva-space-child]');
    if (spaceChild) {
      event.preventDefault();
      event.stopPropagation();
      spaceTreeExpanded = true;
      var workspaceId = SPACE_IDS[spaceChild.dataset.evaSpaceChild];
      if (workspaceId && typeof window.__evaOpenWorkspaceFromTree === 'function') {
        window.__evaOpenWorkspaceFromTree(workspaceId);
      }
      queueTune();
      return;
    }
  }, true);

  var queued = false;
  function queueTune() {
    if (queued) return;
    queued = true;
    requestAnimationFrame(function () {
      queued = false;
      tuneMessageView();
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', queueTune, { once: true });
  } else {
    queueTune();
  }

  function mutationNeedsTune(mutation) {
    var target = mutation.target && mutation.target.nodeType === 1
      ? mutation.target
      : mutation.target && mutation.target.parentElement;
    if (!target) return true;
    return !target.closest('#eva-contacts-root, [data-eva-my-assistant-identity="true"]');
  }

  new MutationObserver(function (mutations) {
    if (mutations.some(mutationNeedsTune)) queueTune();
  }).observe(document.documentElement, {
    childList: true,
    subtree: true
  });
})();
