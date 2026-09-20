/* ============================================================
   060 · 任务详情抽屉 · 交互控制器（不改内容，只挂容器级交互）
   ------------------------------------------------------------
   职责：
   1) 熔断：卡片过窄（漏出 < 300px）时把抽屉铺满为整屏（.eva-drawer-full）。
   2) 把当前项目主题色写成 .collab-frame 的 --eva-project-accent，
      供顶栏（B3）与按钮 hover tint（B2/B4）在暗色下取用。
   顶栏的「全屏切换 / 关闭」按钮与「折叠菜单」由运行时（009-6）在
   React 内渲染；全屏态经按钮直接在 .collab-route-right.eva-route-drawer
   上切换 .eva-drawer-expanded，本控制器不介入。
   ============================================================ */
(function () {
  "use strict";

  function syncAccent() {
    var frame = document.querySelector(".collab-frame");
    if (!frame) return;
    var icon = frame.querySelector(".eva-project-switcher__icon");
    if (!icon) return;
    var c = getComputedStyle(icon).color;
    if (c) frame.style.setProperty("--eva-project-accent", c);
  }

  function updateFull(host) {
    // 熔断：卡片宽 < 1000px 时漏出 < 300px，抽屉铺满为整屏。
    // （clamp(640, 卡片×0.7, 900) 下，卡片<1000 恒有 漏出<300）
    var card = host.clientWidth || 0;
    host.classList.toggle("eva-drawer-full", card > 0 && card < 1000);
  }

  function scan() {
    var host = document.querySelector(".collab-route-right.eva-route-drawer");
    if (host) {
      updateFull(host);
      if (!host.__evaRO && typeof ResizeObserver !== "undefined") {
        host.__evaRO = new ResizeObserver(function () { updateFull(host); });
        host.__evaRO.observe(host);
      }
    }
    syncAccent();
  }

  var mo = new MutationObserver(function () {
    scan();
  });

  function start() {
    mo.observe(document.body, { childList: true, subtree: true });
    scan();
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", start);
  } else {
    start();
  }
})();
