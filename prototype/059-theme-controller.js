(function (root) {
  'use strict';

  /* Eva 主题控制器（2.1.0）
   * 单一数据源：
   *   __eva_theme_mode  = 用户选择的档位 light|dark|system（含 system）
   *   __aionui_theme    = 解析后的 light|dark（运行时 / Arco 消费，永不写 system）
   * 落点：documentElement[data-theme] + body[arco-theme]，两者始终为解析值。
   */

  var STORAGE_MODE = '__eva_theme_mode';
  var STORAGE_RESOLVED = '__aionui_theme';
  var MODES = ['light', 'dark', 'system'];
  var listeners = new Set();
  var mql = null;

  function prefersDark() {
    return !!(root.matchMedia && root.matchMedia('(prefers-color-scheme: dark)').matches);
  }

  function getMode() {
    try {
      var m = localStorage.getItem(STORAGE_MODE);
      if (m === 'auto') m = 'system';
      if (MODES.indexOf(m) >= 0) return m;
      var legacy = localStorage.getItem(STORAGE_RESOLVED);
      if (legacy === 'light' || legacy === 'dark') return legacy;
    } catch (e) {}
    return 'system'; // 默认跟随系统
  }

  function resolve(mode) {
    return mode === 'system' ? (prefersDark() ? 'dark' : 'light') : mode;
  }

  function paint(resolved) {
    try {
      document.documentElement.setAttribute('data-theme', resolved);
      if (document.body) document.body.setAttribute('arco-theme', resolved);
    } catch (e) {}
  }

  function notify(mode, resolved) {
    listeners.forEach(function (fn) { try { fn(mode, resolved); } catch (e) {} });
  }

  function bindSystem(mode) {
    if (mql) { mql.onchange = null; mql = null; }
    if (mode === 'system' && root.matchMedia) {
      mql = root.matchMedia('(prefers-color-scheme: dark)');
      mql.onchange = function () {
        var r = resolve('system');
        try { localStorage.setItem(STORAGE_RESOLVED, r); } catch (e) {}
        paint(r);
        notify('system', r);
      };
    }
  }

  function apply(mode) {
    if (MODES.indexOf(mode) < 0) mode = 'system';
    var resolved = resolve(mode);
    try {
      localStorage.setItem(STORAGE_MODE, mode);
      localStorage.setItem(STORAGE_RESOLVED, resolved);
    } catch (e) {}
    paint(resolved);
    bindSystem(mode);
    notify(mode, resolved);
    return resolved;
  }

  function current() {
    var m = getMode();
    return { mode: m, resolved: resolve(m) };
  }

  function subscribe(fn) {
    listeners.add(fn);
    return function () { listeners.delete(fn); };
  }

  // 初始化（幂等于 bootstrap 005/019），并在 system 档挂载系统偏好监听。
  // 必须同时持久化「档位」：否则 getMode 的 legacy 回退会把已写入的
  // __aionui_theme（解析值）误判为用户显式选择，使 system 档在下次加载退化。
  var init = current();
  try {
    localStorage.setItem(STORAGE_MODE, init.mode);
    localStorage.setItem(STORAGE_RESOLVED, init.resolved);
  } catch (e) {}
  paint(init.resolved);
  bindSystem(init.mode);

  // 运行时在 React 挂载时会按其默认主题写一次 data-theme（覆盖我们的首屏值）。
  // 作为 token 层的权威：监听并把 DOM 纠回用户档位。运行时自身也监听 data-theme，
  // 因此纠正后其主题上下文会随之同步，最终收敛，不会持续抖动。
  try {
    var enforcing = false;
    var enforce = function () {
      if (enforcing) return;
      var want = resolve(getMode());
      var htmlNow = document.documentElement.getAttribute('data-theme');
      var bodyNow = document.body && document.body.getAttribute('arco-theme');
      if (htmlNow !== want || bodyNow !== want) {
        enforcing = true;
        paint(want);
        enforcing = false;
      }
    };
    var mo = new MutationObserver(enforce);
    mo.observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] });
    var observeBody = function () {
      if (document.body) mo.observe(document.body, { attributes: true, attributeFilter: ['arco-theme'] });
    };
    if (document.body) observeBody();
    else document.addEventListener('DOMContentLoaded', observeBody, { once: true });
  } catch (e) {}

  root.EvaTheme = {
    MODES: MODES,
    getMode: getMode,
    resolve: resolve,
    apply: apply,
    current: current,
    subscribe: subscribe
  };
})(window);
