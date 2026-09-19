/* Eva 浮层失焦关闭统一控制器
   ------------------------------------------------------------------
   全站唯一的「点击内容区空白处收起」实现。菜单、选择器、面板与弹层仍然
   各自拥有自己的开关状态，只把「是否打开 / 怎么关闭 / 哪些区域算浮层内部」
   注册到这里；由本文件里同一个 document 级 pointerdown 捕获监听器判定
   外部点击，再调用对应入口自己的 close()。

   watch({id, isOpen, close, keep, token})：
     - id    入口标识，便于排查重复注册
     - isOpen () => boolean，读取该入口当前的打开状态
     - close  () => void，由入口自己实现关闭（可能是 React state，也可能是重绘 DOM）
     - keep   () => Element|NodeList|Array，点击落在这些元素内不算「外部」
     - token  () => any，当前打开实例的标识（可选）

   关闭统一延后到当前这次点击处理完之后执行：入口的 close() 往往会重绘
   宿主 DOM，若在捕获阶段同步重绘，本次点击后续的委托处理器拿到的就是已
   脱离文档的目标节点，会把「点另一行打开菜单」误判成什么都没点。延后
   执行前用 token 复检，保证不会关掉这次点击刚刚打开的另一个实例。

   入口不得再各写一套 document 监听器、也不得靠 DOM 补丁互相兜底。
   ------------------------------------------------------------------ */
(function (global) {
  var surfaces = [];
  var installed = false;

  function toNodes(value) {
    if (!value) return [];
    var items = typeof value === 'function' ? value() : value;
    if (!items) return [];
    if (items.nodeType === 1) return [items];
    return Array.prototype.filter.call(items, function (node) { return node && node.nodeType === 1; });
  }

  function hits(nodes, target) {
    for (var i = 0; i < nodes.length; i += 1) {
      if (nodes[i].isConnected && nodes[i].contains(target)) return true;
    }
    return false;
  }

  function read(surface, name, fallback) {
    try { return surface[name](); } catch (error) { return fallback; }
  }

  function scheduleClose(surface, tokenBefore) {
    setTimeout(function () {
      if (!read(surface, 'isOpen', false)) return;
      if (tokenBefore !== undefined && !Object.is(tokenBefore, read(surface, 'token', undefined))) return;
      try { surface.close(); } catch (error) { /* 单个入口关闭失败不影响其它浮层 */ }
    }, 0);
  }

  function handlePointerDown(event) {
    if (!surfaces.length) return;
    // 只认主键：右键菜单由 contextmenu 自己打开，拖拽滚动条不应收起浮层。
    if (event.pointerType === 'mouse' && event.button !== 0) return;
    for (var i = surfaces.length - 1; i >= 0; i -= 1) {
      var surface = surfaces[i];
      if (!read(surface, 'isOpen', false)) continue;
      if (hits(toNodes(surface.keep), event.target)) continue;
      scheduleClose(surface, surface.token ? read(surface, 'token', undefined) : undefined);
    }
  }

  function install() {
    if (installed || typeof document === 'undefined') return;
    installed = true;
    document.addEventListener('pointerdown', handlePointerDown, true);
  }

  install();

  global.EvaPopupDismiss = {
    watch: function (surface) {
      if (!surface || typeof surface.isOpen !== 'function' || typeof surface.close !== 'function') {
        throw new Error('EvaPopupDismiss.watch 需要 isOpen 与 close');
      }
      install();
      var entry = { id: surface.id || 'popup-' + (surfaces.length + 1), isOpen: surface.isOpen, close: surface.close, keep: surface.keep || null, token: surface.token || null };
      surfaces.push(entry);
      return function unwatch() {
        var index = surfaces.indexOf(entry);
        if (index >= 0) surfaces.splice(index, 1);
      };
    }
  };
})(window);