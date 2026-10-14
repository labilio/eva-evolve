/* Task drawer presentation is owned by EvaTaskDetailHost in 009-6.
 * This adapter only keeps the existing project accent in sync. */
(function () {
  "use strict";

  var accentIcon = null, accentKey = null;
  function syncAccent() {
    var frame = document.querySelector(".collab-frame");
    if (!frame) return;
    var icon = frame.querySelector(".eva-project-switcher__icon");
    if (!icon) return;
    var key = icon.getAttribute("style") + "|" + icon.className + "|" + document.documentElement.getAttribute("data-theme");
    if (accentIcon === icon && accentKey === key) return;
    accentIcon = icon; accentKey = key;
    var c = getComputedStyle(icon).color;
    if (c) frame.style.setProperty("--eva-project-accent", c);
  }

  function scan() {
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
