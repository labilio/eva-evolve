(function (root) {
  'use strict';
  // UI checkpoints only. Message text, membership, permissions and the current
  // route remain in their existing owners. Callers validate IDs before reuse.
  const cache = new Map();
  const clone = value => value === undefined ? undefined : JSON.parse(JSON.stringify(value));
  const key = (actor, scope) => 'eva:workspace-memory:v1:' + JSON.stringify([actor, scope]);
  function record(actor, scope) {
    const id = key(actor, scope);
    if (!cache.has(id)) {
      let value;
      try { value = JSON.parse(root.localStorage.getItem(id)); } catch (_) {}
      cache.set(id, value && typeof value === 'object' && !Array.isArray(value) ? value : {});
    }
    return cache.get(id);
  }
  function read(actor, scope, field, fallback) {
    const data = record(actor, scope);
    return clone(Object.hasOwn(data, field) ? data[field] : fallback);
  }
  function write(actor, scope, field, value) {
    const data = record(actor, scope), next = clone(value);
    if (JSON.stringify(data[field]) === JSON.stringify(next)) return;
    data[field] = next;
    try { root.localStorage.setItem(key(actor, scope), JSON.stringify(data)); } catch (_) {}
  }
  function seed(actor, version, scopes) {
    if (read(actor, 'demo', version, false)) return false;
    for (const [scope, fields] of Object.entries(scopes)) {
      for (const [field, value] of Object.entries(fields)) {
        if (!Object.hasOwn(record(actor, scope), field)) write(actor, scope, field, value);
      }
    }
    write(actor, 'demo', version, true);
    return true;
  }
  function bindScroll(node, actor, scope, options = {}) {
    if (!node) return () => {};
    const saved = read(actor, scope, 'scroll', null);
    let bottom = saved ? !!saved.bottom : !!options.bottom;
    function restore() {
      if (bottom) node.scrollTop = Math.max(0, node.scrollHeight - node.clientHeight);
      else if (saved) node.scrollTop = Math.max(0, Number(saved.top) || 0);
      if (saved) node.scrollLeft = Math.max(0, Number(saved.left) || 0);
    }
    if (options.restore !== false) restore();
    function save() {
      bottom = options.followBottom !== false && node.scrollHeight - node.clientHeight - node.scrollTop < 32;
      write(actor, scope, 'scroll', {top:node.scrollTop, left:node.scrollLeft, bottom});
    }
    save();
    node.addEventListener('scroll', save, {passive:true});
    // Image/layout growth follows the bottom only when the user was already there.
    const observer = root.ResizeObserver ? new root.ResizeObserver(() => {
      if (bottom) node.scrollTop = Math.max(0, node.scrollHeight - node.clientHeight);
    }) : null;
    if (observer) { observer.observe(node); if (node.firstElementChild) observer.observe(node.firstElementChild); }
    // Cleanup can run after React has rendered a different, shorter conversation.
    // The last observed scroll is authoritative, not the outgoing DOM geometry.
    return () => { node.removeEventListener('scroll', save); observer?.disconnect(); };
  }
  function bindCursor(node, actor, scope) {
    if (!node) return () => {};
    const doc = node.ownerDocument;
    const plain = 'selectionStart' in node;
    let restoring = false;
    function save() {
      if (restoring || doc.activeElement !== node) return;
      let start, end;
      if (plain) { start = node.selectionStart; end = node.selectionEnd; }
      else {
        const selection = doc.getSelection();
        if (!selection?.rangeCount || !node.contains(selection.anchorNode) || !node.contains(selection.focusNode)) return;
        const range = selection.getRangeAt(0), before = range.cloneRange();
        before.selectNodeContents(node); before.setEnd(range.startContainer, range.startOffset);
        start = before.toString().length; end = start + range.toString().length;
      }
      write(actor, scope, 'cursor', {start, end, scrollTop:node.scrollTop});
    }
    function restore() {
      const saved = read(actor, scope, 'cursor', null);
      if (!saved) return;
      restoring = true;
      try {
        if (plain) node.setSelectionRange(Math.min(saved.start, node.value.length), Math.min(saved.end, node.value.length));
        else {
          const walker = doc.createTreeWalker(node, 4), points = []; let current, length = 0;
          while ((current = walker.nextNode())) { points.push({node:current, start:length}); length += current.textContent.length; }
          if (points.length) {
            const point = offset => { offset = Math.max(0, Math.min(offset, length)); const p = [...points].reverse().find(p => p.start <= offset) || points[0]; return [p.node, offset - p.start]; };
            const range = doc.createRange(); range.setStart(...point(saved.start)); range.setEnd(...point(saved.end));
            const selection = doc.getSelection(); selection.removeAllRanges(); selection.addRange(range);
          }
        }
        node.scrollTop = saved.scrollTop || 0;
      } finally { restoring = false; }
    }
    // Do not steal focus from navigation, menus or another input.
    function onFocus() {
      // Native textarea keeps its selection while blurred. Contenteditable may
      // already have an intentional mouse or select-all range; do not replace it.
      const selection=doc.getSelection();
      if (plain || (node.contains(selection?.anchorNode) && !selection.isCollapsed)) return;
      restore();
    }
    node.addEventListener('focus', onFocus);
    for (const event of ['input','keyup','mouseup','select','blur']) node.addEventListener(event, save);
    if (plain) restore();
    return () => { save(); node.removeEventListener('focus', onFocus); for (const event of ['input','keyup','mouseup','select','blur']) node.removeEventListener(event, save); };
  }
  root.EvaWorkspaceMemory = Object.freeze({read, write, seed, bindScroll, bindCursor});
})(window);
