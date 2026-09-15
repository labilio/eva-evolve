
      // Set arco-theme on body synchronously (light / dark / system).
      (function () {
        try {
          var mode = localStorage.getItem('__eva_theme_mode')
            || localStorage.getItem('__aionui_theme') || 'system';
          if (mode === 'auto') mode = 'system';
          var resolved = (mode === 'system')
            ? ((window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) ? 'dark' : 'light')
            : mode;
          if (document.body) document.body.setAttribute('arco-theme', resolved);
        } catch (e) {}
      })();

