(function (root) {
  'use strict';

  var renderers = new Map();
  var active = new Map();

  function hostId(pageId) {
    return 'eva-native-page-' + pageId;
  }

  function unmount(pageId, host) {
    var mounted = active.get(pageId);
    if (!mounted || (host && mounted.host !== host)) return;
    if (typeof mounted.cleanup === 'function') mounted.cleanup();
    active.delete(pageId);
  }

  function mount(pageId, host, services) {
    if (!host) return;
    var renderer = renderers.get(pageId);
    if (!renderer) return;
    var mounted = active.get(pageId);
    if (mounted && mounted.host === host && mounted.services === services) return;
    unmount(pageId);
    var cleanup = renderer(host, services);
    active.set(pageId, { host: host, services: services, cleanup: cleanup });
  }

  function register(pageId, renderer) {
    if (typeof pageId !== 'string' || typeof renderer !== 'function') {
      throw new TypeError('EVA native page registration is invalid');
    }
    renderers.set(pageId, renderer);
    mount(pageId, document.getElementById(hostId(pageId)));
    return function () {
      unmount(pageId);
      renderers.delete(pageId);
    };
  }

  root.__evaNativePages = Object.freeze({ register: register, mount: mount, unmount: unmount, hostId: hostId });
})(window);
