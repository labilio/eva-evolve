(function (root) {
  'use strict';

  /* Eva 外观设置页（2.1.0）：主题选择器（浅色 / 深色 / 跟随系统）+ 保留字号行。
   * 由 009-7-patch-sider.js 在设置弹窗内以 pages.appearance 挂载，
   * 通过 create({React}) 注入运行时 React，避免依赖运行时内部私有组件。
   * 主题读写统一走 window.EvaTheme（059-theme-controller.js）。 */

  root.EvaAppearanceUI = {
    create: function (deps) {
      var R = deps.React;
      var h = R.createElement;
      var OPTIONS = [
        ['light', '浅色'],
        ['dark', '深色'],
        ['system', '跟随系统']
      ];

      return function EvaAppearance() {
        var init = root.EvaTheme ? root.EvaTheme.current() : { mode: 'system', resolved: 'light' };
        var s = R.useState(init);
        var state = s[0], setState = s[1];
        var fontUi = R.useState('中');
        var fontCode = R.useState('13');

        R.useEffect(function () {
          if (!root.EvaTheme) return undefined;
          return root.EvaTheme.subscribe(function (mode, resolved) {
            setState({ mode: mode, resolved: resolved });
          });
        }, []);

        function pick(mode) {
          if (root.EvaTheme) root.EvaTheme.apply(mode);
          else setState({ mode: mode, resolved: mode });
        }

        function themeCard(opt) {
          var value = opt[0], label = opt[1], active = state.mode === value;
          return h('button', {
            key: value,
            type: 'button',
            role: 'radio',
            'aria-checked': active ? 'true' : 'false',
            className: 'eva-appearance__theme' + (active ? ' is-active' : '') + ' eva-appearance__theme--' + value,
            onClick: function () { pick(value); }
          },
            h('span', { className: 'eva-appearance__preview', 'aria-hidden': 'true' },
              h('span', { className: 'eva-appearance__preview-side' }),
              h('span', { className: 'eva-appearance__preview-main' },
                h('i', null), h('i', null), h('b', null))),
            h('span', { className: 'eva-appearance__label' }, label),
            value === 'system' && active
              ? h('small', { className: 'eva-appearance__hint' }, '当前：' + (state.resolved === 'dark' ? '深色' : '浅色'))
              : null
          );
        }

        function selectRow(label, hook, options) {
          return h('div', { className: 'eva-appearance__row' },
            h('span', { className: 'eva-appearance__row-label' }, label),
            h('select', {
              className: 'eva-appearance__select',
              value: hook[0],
              onChange: function (e) { hook[1](e.target.value); }
            }, options.map(function (v) { return h('option', { key: v, value: v }, v); }))
          );
        }

        return h('div', { className: 'eva-appearance' },
          h('section', { className: 'eva-appearance__group' },
            h('h3', { className: 'eva-appearance__group-title' }, '主题'),
            h('div', { className: 'eva-appearance__themes', role: 'radiogroup', 'aria-label': '主题' },
              OPTIONS.map(themeCard))
          ),
          h('section', { className: 'eva-appearance__group' },
            h('h3', { className: 'eva-appearance__group-title' }, '显示'),
            selectRow('UI 字号', fontUi, ['小', '中', '大']),
            selectRow('代码字体大小', fontCode, ['12', '13', '14', '16'])
          )
        );
      };
    }
  };
})(window);
