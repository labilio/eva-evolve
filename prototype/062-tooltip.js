/* Eva 声明式 Tooltip 控制器（原生 DOM 表面）。
 *
 * 唯一职责：把 DOM 事件转成 window.EvaTooltip 的 show/hide 调用。
 * 气泡本体、位置、暗色、role="tooltip" 全部由运行时里的 Semi Tooltip 原语负责，
 * 本文件不重画气泡、不定义配色，避免出现第二套提示实现。
 *
 * 合规依据：W3C WCAG 2.1 SC 1.4.13（可关闭 / 可悬停 / 持续）与 WAI-ARIA APG Tooltip Pattern。
 * 触发标签：
 *   data-eva-tooltip          提示文案（必填）
 *   data-eva-tooltip-position 可选 top|bottom|left|right，默认 top
 *   data-eva-tooltip-clamp    仅当元素真的被裁切时才提示（用于截断文字）
 *
 * 只处理显式标记的元素。提示必须是「有意添加」的：图标按钮、截断文字、状态图例等。
 * 不把页面上任意原生 title 自动转成气泡——表头、单元格、已有可见名称的元素往往也带
 * 原生 title，自动转换会造出大量无意义提示。
 */
(function (root) {
  'use strict';

  var doc = root.document;
  if (!doc) return;

  var OPEN_DELAY = 120;   // 悬停延迟：避免扫过时连续弹出
  var CLOSE_DELAY = 60;   // 离开延迟：允许指针从目标移动到气泡（SC 1.4.13 可悬停）
  var ATTR = 'data-eva-tooltip';
  var CLAMP_ATTR = 'data-eva-tooltip-clamp';
  var POSITION_ATTR = 'data-eva-tooltip-position';
  var SURFACE_SELECTOR = '.eva-tooltip-surface';
  var TARGET_SELECTOR = '[' + ATTR + ']';

  var active = null;
  var openTimer = 0;
  var closeTimer = 0;
  var overSurface = false;

  function api() {
    return root.EvaTooltip || null;
  }

  function targetOf(node) {
    if (!node || node.nodeType !== 1 || typeof node.closest !== 'function') return null;
    var el = node.closest(TARGET_SELECTOR);
    // 同一元素不应同时存在原生 title 与 Eva 提示；显式标记时清掉残留的原生 title。
    if (el && el.hasAttribute('title')) el.removeAttribute('title');
    return el;
  }

  function surfaceOf(node) {
    if (!node || node.nodeType !== 1 || typeof node.closest !== 'function') return null;
    return node.closest(SURFACE_SELECTOR);
  }

  function isClipped(el) {
    return el.scrollWidth > el.clientWidth + 1 || el.scrollHeight > el.clientHeight + 1;
  }

  function contentOf(el) {
    if (el.hasAttribute(CLAMP_ATTR) && !isClipped(el)) return null;
    return el.getAttribute(ATTR);
  }

  function positionOf(el) {
    var value = el.getAttribute(POSITION_ATTR);
    return value === 'bottom' || value === 'left' || value === 'right' ? value : 'top';
  }

  function clearTimers() {
    if (openTimer) { root.clearTimeout(openTimer); openTimer = 0; }
    if (closeTimer) { root.clearTimeout(closeTimer); closeTimer = 0; }
  }

  function openFor(el) {
    var bridge = api();
    if (!bridge) return;
    var content = contentOf(el);
    if (content == null || content === '') return;
    active = el;
    bridge.show(el, content, positionOf(el));
  }

  function scheduleOpen(el) {
    if (active === el) { clearTimers(); return; }
    clearTimers();
    openTimer = root.setTimeout(function () {
      openTimer = 0;
      openFor(el);
    }, OPEN_DELAY);
  }

  function hideNow() {
    clearTimers();
    overSurface = false;
    active = null;
    var bridge = api();
    if (bridge) bridge.hide();
  }

  function scheduleClose() {
    clearTimers();
    closeTimer = root.setTimeout(function () {
      closeTimer = 0;
      if (overSurface) return;
      hideNow();
    }, CLOSE_DELAY);
  }

  doc.addEventListener('pointerover', function (event) {
    if (event.pointerType === 'touch') return;
    if (surfaceOf(event.target)) { overSurface = true; clearTimers(); return; }
    var el = targetOf(event.target);
    if (el) scheduleOpen(el);
  }, true);

  doc.addEventListener('pointerout', function (event) {
    if (event.pointerType === 'touch') return;
    if (surfaceOf(event.target)) { overSurface = false; scheduleClose(); return; }
    var el = targetOf(event.target);
    if (el && !el.contains(event.relatedTarget)) scheduleClose();
  }, true);

  doc.addEventListener('focusin', function (event) {
    var el = targetOf(event.target);
    if (el) { clearTimers(); openFor(el); }
  }, true);

  doc.addEventListener('focusout', function (event) {
    var el = targetOf(event.target);
    if (el && !el.contains(event.relatedTarget)) scheduleClose();
  }, true);

  doc.addEventListener('keydown', function (event) {
    if (event.key === 'Escape') hideNow();
  }, true);

  // 触发元素被 React 重渲染移除后，端口化的气泡不会自动消失；滚动与点击同样让位置失效。
  doc.addEventListener('pointerdown', hideNow, true);
  doc.addEventListener('click', hideNow, true);
  root.addEventListener('scroll', hideNow, true);
  root.addEventListener('resize', hideNow);
  root.addEventListener('hashchange', hideNow);

  root.EvaTooltipController = Object.freeze({ hide: hideNow });
})(window);
