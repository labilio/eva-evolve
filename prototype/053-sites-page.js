(function (root) {
  'use strict';

  var Component;
  var sites = Object.freeze({
    summary: [
      ['已发布', '4'],
      ['编辑中', '2'],
      ['本周访问', '1,284']
    ],
    recent: [
      ['产品发布页', '今天 12:40 更新', '已发布'],
      ['客户方案预览', '昨天 18:20 更新', '编辑中'],
      ['团队知识入口', '8 月 29 日更新', '已发布']
    ]
  });

  root.EvaSitesUI = {
    render: function (deps) {
      Component ||= create(deps);
      return deps.React.createElement(Component);
    }
  };

  function create(deps) {
    var h = deps.React.createElement;
    return function SitesPage() {
      return h('div', { className: 'eva-sites-page' },
        h('header', { className: 'eva-page-header' }, h('h1', null, '站点')),
        h('main', { className: 'eva-sites', 'aria-label': '站点' },
        h('header', { className: 'eva-sites__header' },
          h('p', null, '查看由助理创建和维护的站点')
        ),
        h('section', { className: 'eva-sites__summary', 'aria-label': '站点概览' },
          sites.summary.map(function (item) {
            return h('article', { className: 'eva-sites__metric', key: item[0] },
              h('span', null, item[0]),
              h('strong', null, item[1])
            );
          })
        ),
        h('section', { className: 'eva-sites__recent', 'aria-labelledby': 'eva-sites-recent-title' },
          h('h2', { id: 'eva-sites-recent-title' }, '最近项目'),
          h('div', { className: 'eva-sites__list', role: 'list' },
            sites.recent.map(function (item) {
              return h('article', { className: 'eva-sites__row', role: 'listitem', key: item[0] },
                h('strong', null, item[0]),
                h('time', null, item[1]),
                h('span', { className: 'eva-sites__status' }, item[2])
              );
            })
          )
        )
        )
      );
    };
  }
})(window);
