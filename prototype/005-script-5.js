
      // Synchronously restore theme appearance from localStorage to prevent theme flash.
      // 支持三档：light / dark / system（system 依据 prefers-color-scheme 解析）。
      (function () {
        try {
          var mode = localStorage.getItem('__eva_theme_mode')
            || localStorage.getItem('__aionui_theme') || 'system';
          if (mode === 'auto') mode = 'system';
          var resolved = (mode === 'system')
            ? ((window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) ? 'dark' : 'light')
            : mode;
          document.documentElement.setAttribute('data-theme', resolved);
        } catch (e) {}
      })();

