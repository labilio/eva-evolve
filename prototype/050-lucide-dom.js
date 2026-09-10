
(function () {
  'use strict';

  /* ============================================================
     Eva GDS · 纯 DOM 图标渲染器（AGENTS.md:151）
     createLucideIcon 只在打包运行时（vendor/eva-legacy-runtime.js）
     内部可见，009-6／009-7 注入的 React 代码可以裸用，纯 DOM 的
     prototype 模块拿不到。这里把它在 DOM 侧对等实现：

     - node 数组逐条摘自 vendor/eva-legacy-runtime.js 内嵌的
       lucide-react v0.577.0（ISC），不是手写路径；
     - 默认属性与该版本的 defaultAttributes 一致：
       xmlns / viewBox="0 0 24 24" / fill="none" / stroke="currentColor"
       / stroke-linecap="round" / stroke-linejoin="round"；
     - 类名沿用 Lucide 约定 `lucide lucide-<name>`；
     - 描边默认 1.5，即 047-gds-tokens.css 的 --eva-icon-stroke
       （Lucide 原始默认是 2，GDS 统一为 1.5）。

     用法：
       host.innerHTML = '…' + window.__evaLucide('send', { size: 16 }) + '…';
       host.appendChild(window.__evaLucideNode('send', { size: 16 }));
     ============================================================ */

  var NODES = {
    'pin': [["path",{d:"M12 17v5",key:"pin-stem"}],["path",{d:"M9 10.76a2 2 0 0 1-1.11 1.79l-1.78.9A2 2 0 0 0 5 15.24V16a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1v-.76a2 2 0 0 0-1.11-1.79l-1.78-.9A2 2 0 0 1 15 10.76V7a1 1 0 0 1 1-1 2 2 0 0 0 0-4H8a2 2 0 0 0 0 4 1 1 0 0 1 1 1z",key:"pin-head"}]],
    'trash-2': [["path",{d:"M10 11v6",key:"nco0om"}],["path",{d:"M14 11v6",key:"outv1u"}],["path",{d:"M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6",key:"miytrc"}],["path",{d:"M3 6h18",key:"d0wm0j"}],["path",{d:"M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2",key:"e791ji"}]],
    'crosshair': [["circle", {cx:"12", cy:"12", r:"10"}], ["line", {x1:"22", x2:"18", y1:"12", y2:"12"}], ["line", {x1:"6", x2:"2", y1:"12", y2:"12"}], ["line", {x1:"12", x2:"12", y1:"6", y2:"2"}], ["line", {x1:"12", x2:"12", y1:"22", y2:"18"}]],
    'bot': [["path",{d:"M12 8V4H8",key:"hb8ula"}],["rect",{width:"16",height:"12",x:"4",y:"8",rx:"2",key:"enze0r"}],["path",{d:"M2 14h2",key:"vft8re"}],["path",{d:"M20 14h2",key:"4cs60a"}],["path",{d:"M15 13v2",key:"1xurst"}],["path",{d:"M9 13v2",key:"rq6x2g"}]],
    'message-square': [["path",{d:"M22 17a2 2 0 0 1-2 2H6.828a2 2 0 0 0-1.414.586l-2.202 2.202A.71.71 0 0 1 2 21.286V5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2z",key:"18887p"}]],
    'hard-drive': [["path",{d:"M10 16h.01",key:"1ra8yu"}],["path",{d:"M2.212 11.577a2 2 0 0 0-.212.896V18a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-5.527a2 2 0 0 0-.212-.896L18.55 5.11A2 2 0 0 0 16.76 4H7.24a2 2 0 0 0-1.79 1.11z",key:"1jiv2b"}],["path",{d:"M21.946 12.013H2.054",key:"12xlhc"}],["path",{d:"M6 16h.01",key:"1l4qyb"}]],
    'book-user': [["path",{d:"M15 13a3 3 0 1 0-6 0",key:"book-user-avatar"}],["path",{d:"M17 18a5 5 0 0 0-10 0",key:"book-user-profile"}],["path",{d:"M4 19.5v-15A2.5 2.5 0 0 1 6.5 2H19a1 1 0 0 1 1 1v18a1 1 0 0 1-1 1H6.5a1 1 0 0 1 0-5H20",key:"book-user-book"}]],
    'unplug': [["path",{d:"M17 19a1 1 0 0 1-1-1v-2a2 2 0 0 1 2-2h2a2 2 0 0 1 2 2v2a1 1 0 0 1-1 1z",key:"unplug-socket"}],["path",{d:"M17 21v-2",key:"unplug-socket-pin"}],["path",{d:"M19 14V6.5a1 1 0 0 0-7 0v11a1 1 0 0 1-7 0V10",key:"unplug-cable"}],["path",{d:"M21 21v-2",key:"unplug-socket-pin-2"}],["path",{d:"M3 5V3",key:"unplug-plug-pin"}],["path",{d:"M4 10a2 2 0 0 1-2-2V6a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2a2 2 0 0 1-2 2z",key:"unplug-plug"}],["path",{d:"M7 5V3",key:"unplug-plug-pin-2"}]],
    'arrow-left': [["path", {d: "m12 19-7-7 7-7"}], ["path", {d: "M19 12H5"}]],
    'arrow-up': [["path", {d: "m5 12 7-7 7 7"}], ["path", {d: "M12 19V5"}]],
    'at-sign': [["circle", {cx: "12", cy: "12", r: "4"}], ["path", {d: "M16 8v5a3 3 0 0 0 6 0v-1a10 10 0 1 0-4 8"}]],
    'book-open': [["path", {d: "M12 7v14"}], ["path", {d: "M3 18a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1h5a4 4 0 0 1 4 4 4 4 0 0 1 4-4h5a1 1 0 0 1 1 1v13a1 1 0 0 1-1 1h-6a3 3 0 0 0-3 3 3 3 0 0 0-3-3z"}]],
    'brain': [["path", {d: "M12 18V5"}], ["path", {d: "M15 13a4.17 4.17 0 0 1-3-4 4.17 4.17 0 0 1-3 4"}], ["path", {d: "M17.598 6.5A3 3 0 1 0 12 5a3 3 0 1 0-5.598 1.5"}], ["path", {d: "M17.997 5.125a4 4 0 0 1 2.526 5.77"}], ["path", {d: "M18 18a4 4 0 0 0 2-7.464"}], ["path", {d: "M19.967 17.483A4 4 0 1 1 12 18a4 4 0 1 1-7.967-.517"}], ["path", {d: "M6 18a4 4 0 0 1-2-7.464"}], ["path", {d: "M6.003 5.125a4 4 0 0 0-2.526 5.77"}]],
    'briefcase-business': [["path", {d:"M12 12h.01"}], ["path", {d:"M16 6V4a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v2"}], ["path", {d:"M22 13a18.15 18.15 0 0 1-20 0"}], ["rect", {width:"20",height:"14",x:"2",y:"6",rx:"2"}]],
    'calendar-clock': [["path", {d: "M16 14v2.2l1.6 1"}], ["path", {d: "M16 2v4"}], ["path", {d: "M21 7.5V6a2 2 0 0 0-2-2H5a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h3.5"}], ["path", {d: "M3 10h5"}], ["path", {d: "M8 2v4"}], ["circle", {cx: "16", cy: "16", r: "6"}]],
    'bell': [["path", {d:"M10.268 21a2 2 0 0 0 3.464 0"}], ["path", {d:"M3.262 15.326A1 1 0 0 0 4 17h16a1 1 0 0 0 .74-1.673C19.41 13.956 18 12.499 18 8A6 6 0 0 0 6 8c0 4.499-1.411 5.956-2.738 7.326"}]],
    'chart-column': [["path", {d:"M3 3v18h18"}], ["path", {d:"M18 17V9"}], ["path", {d:"M13 17V5"}], ["path", {d:"M8 17v-3"}]],
    'check': [["path", {d: "M20 6 9 17l-5-5"}]],
    'chevron-down': [["path", {d: "m6 9 6 6 6-6"}]],
    'chevron-right': [["path", {d: "m9 18 6-6-6-6"}]],
    'circle': [["circle", {cx: "12", cy: "12", r: "10"}]],
    'circle-check': [["circle", {cx: "12", cy: "12", r: "10"}], ["path", {d: "m9 12 2 2 4-4"}]],
    'circle-slash': [["circle", {cx: "12", cy: "12", r: "10"}], ["line", {x1: "9", x2: "15", y1: "15", y2: "9"}]],
    'clock': [["circle", {cx: "12", cy: "12", r: "10"}], ["path", {d: "M12 6v6l4 2"}]],
    'copy': [["rect", {width: "14", height: "14", x: "8", y: "8", rx: "2", ry: "2"}], ["path", {d: "M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2"}]],
    'database': [["ellipse", {cx:"12",cy:"5",rx:"9",ry:"3"}], ["path", {d:"M3 5v14c0 1.7 4 3 9 3s9-1.3 9-3V5"}], ["path", {d:"M3 12c0 1.7 4 3 9 3s9-1.3 9-3"}]],
    'cpu': [["path", {d: "M12 20v2"}], ["path", {d: "M12 2v2"}], ["path", {d: "M17 20v2"}], ["path", {d: "M17 2v2"}], ["path", {d: "M2 12h2"}], ["path", {d: "M2 17h2"}], ["path", {d: "M2 7h2"}], ["path", {d: "M20 12h2"}], ["path", {d: "M20 17h2"}], ["path", {d: "M20 7h2"}], ["path", {d: "M7 20v2"}], ["path", {d: "M7 2v2"}], ["rect", {x: "4", y: "4", width: "16", height: "16", rx: "2"}], ["rect", {x: "8", y: "8", width: "8", height: "8", rx: "1"}]],
    'download': [["path", {d: "M12 15V3"}], ["path", {d: "M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"}], ["path", {d: "m7 10 5 5 5-5"}]],
    'ellipsis': [["circle", {cx: "12", cy: "12", r: "1"}], ["circle", {cx: "19", cy: "12", r: "1"}], ["circle", {cx: "5", cy: "12", r: "1"}]],
    'external-link': [["path", {d: "M15 3h6v6"}], ["path", {d: "M10 14 21 3"}], ["path", {d: "M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"}]],
    'eye': [["path", {d: "M2.062 12.348a1 1 0 0 1 0-.696 10.75 10.75 0 0 1 19.876 0 1 1 0 0 1 0 .696 10.75 10.75 0 0 1-19.876 0"}], ["circle", {cx: "12", cy: "12", r: "3"}]],
    'file-image': [["path", {d: "M6 22a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h8a2.4 2.4 0 0 1 1.704.706l3.588 3.588A2.4 2.4 0 0 1 20 8v12a2 2 0 0 1-2 2z"}], ["path", {d: "M14 2v5a1 1 0 0 0 1 1h5"}], ["circle", {cx: "10", cy: "12", r: "2"}], ["path", {d: "m20 17-1.296-1.296a2.41 2.41 0 0 0-3.408 0L9 22"}]],
    'file-spreadsheet': [["path", {d:"M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8Z"}], ["path", {d:"M14 2v6h6"}], ["path", {d:"M8 13h2"}], ["path", {d:"M14 13h2"}], ["path", {d:"M8 17h2"}], ["path", {d:"M14 17h2"}]],
    'file-text': [["path", {d: "M6 22a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h8a2.4 2.4 0 0 1 1.704.706l3.588 3.588A2.4 2.4 0 0 1 20 8v12a2 2 0 0 1-2 2z"}], ["path", {d: "M14 2v5a1 1 0 0 0 1 1h5"}], ["path", {d: "M10 9H8"}], ["path", {d: "M16 13H8"}], ["path", {d: "M16 17H8"}]],
    'folder': [["path", {d: "M20 20a2 2 0 0 0 2-2V8a2 2 0 0 0-2-2h-7.9a2 2 0 0 1-1.69-.9L9.6 3.9A2 2 0 0 0 7.93 3H4a2 2 0 0 0-2 2v13a2 2 0 0 0 2 2Z"}]],
    'globe': [["circle", {cx: "12", cy: "12", r: "10"}], ["path", {d: "M12 2a14.5 14.5 0 0 0 0 20 14.5 14.5 0 0 0 0-20"}], ["path", {d: "M2 12h20"}]],
    'git-branch': [["line", {x1:"6",x2:"6",y1:"3",y2:"15"}], ["circle", {cx:"18",cy:"6",r:"3"}], ["circle", {cx:"6",cy:"18",r:"3"}], ["path", {d:"M18 9a9 9 0 0 1-9 9"}]],
    'hexagon': [["path", {d: "M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"}]],
    'layout-grid': [["rect", {width: "7", height: "7", x: "3", y: "3", rx: "1"}], ["rect", {width: "7", height: "7", x: "14", y: "3", rx: "1"}], ["rect", {width: "7", height: "7", x: "14", y: "14", rx: "1"}], ["rect", {width: "7", height: "7", x: "3", y: "14", rx: "1"}]],
    'link-2': [["path", {d: "M9 17H7A5 5 0 0 1 7 7h2"}], ["path", {d: "M15 7h2a5 5 0 0 1 0 10h-2"}], ["line", {x1: "8", x2: "16", y1: "12", y2: "12"}]],
    'list': [["path", {d: "M3 5h.01"}], ["path", {d: "M3 12h.01"}], ["path", {d: "M3 19h.01"}], ["path", {d: "M8 5h13"}], ["path", {d: "M8 12h13"}], ["path", {d: "M8 19h13"}]],
    'list-checks': [["path", {d: "M13 5h8"}], ["path", {d: "M13 12h8"}], ["path", {d: "M13 19h8"}], ["path", {d: "m3 17 2 2 4-4"}], ["path", {d: "m3 7 2 2 4-4"}]],
    'loader-circle': [["path", {d: "M21 12a9 9 0 1 1-6.219-8.56"}]],
    'mail': [["path", {d: "m22 7-8.991 5.727a2 2 0 0 1-2.009 0L2 7"}], ["rect", {x: "2", y: "4", width: "20", height: "16", rx: "2"}]],
    'maximize-2': [["path", {d: "M15 3h6v6"}], ["path", {d: "m21 3-7 7"}], ["path", {d: "m3 21 7-7"}], ["path", {d: "M9 21H3v-6"}]],
    'mic': [["path", {d: "M12 19v3"}], ["path", {d: "M19 10v2a7 7 0 0 1-14 0v-2"}], ["rect", {x: "9", y: "2", width: "6", height: "13", rx: "3"}]],
    'minus': [["path", {d: "M5 12h14"}]],
    'monitor': [["rect", {width: "20", height: "14", x: "2", y: "3", rx: "2"}], ["line", {x1: "8", x2: "16", y1: "21", y2: "21"}], ["line", {x1: "12", x2: "12", y1: "17", y2: "21"}]],
    'paperclip': [["path", {d: "m16 6-8.414 8.586a2 2 0 0 0 2.829 2.829l8.414-8.586a4 4 0 1 0-5.657-5.657l-8.379 8.551a6 6 0 1 0 8.485 8.485l8.379-8.551"}]],
    'pen-line': [["path", {d: "M13 21h8"}], ["path", {d: "M21.174 6.812a1 1 0 0 0-3.986-3.987L3.842 16.174a2 2 0 0 0-.5.83l-1.321 4.352a.5.5 0 0 0 .623.622l4.353-1.32a2 2 0 0 0 .83-.497z"}]],
    'pencil': [["path", {d: "M21.174 6.812a1 1 0 0 0-3.986-3.987L3.842 16.174a2 2 0 0 0-.5.83l-1.321 4.352a.5.5 0 0 0 .623.622l4.353-1.32a2 2 0 0 0 .83-.497z"}], ["path", {d: "m15 5 4 4"}]],
    'play': [["path", {d: "M5 5a2 2 0 0 1 3.008-1.728l11.997 6.998a2 2 0 0 1 .003 3.458l-12 7A2 2 0 0 1 5 19z"}]],
    'plus': [["path", {d: "M5 12h14"}], ["path", {d: "M12 5v14"}]],
    'rotate-ccw': [["path", {d: "M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"}], ["path", {d: "M3 3v5h5"}]],
    'save': [["path", {d: "M15.2 3a2 2 0 0 1 1.4.6l3.8 3.8a2 2 0 0 1 .6 1.4V19a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2z"}], ["path", {d: "M17 21v-7a1 1 0 0 0-1-1H8a1 1 0 0 0-1 1v7"}], ["path", {d: "M7 3v4a1 1 0 0 0 1 1h7"}]],
    'search': [["path", {d: "m21 21-4.34-4.34"}], ["circle", {cx: "11", cy: "11", r: "8"}]],
    'shield': [["path", {d:"M20 13c0 5-3.5 7.5-7.66 8.95a1 1 0 0 1-.67-.01C7.5 20.5 4 18 4 13V6a1 1 0 0 1 1-1c2 0 4.5-1.2 6.24-2.72a1.17 1.17 0 0 1 1.52 0C14.51 3.81 17 5 19 5a1 1 0 0 1 1 1z"}]],
    'settings-2': [["path", {d: "M14 17H5"}], ["path", {d: "M19 7h-9"}], ["circle", {cx: "17", cy: "17", r: "3"}], ["circle", {cx: "7", cy: "7", r: "3"}]],
    'sliders-horizontal': [["path", {d: "M10 5H3"}], ["path", {d: "M12 19H3"}], ["path", {d: "M14 3v4"}], ["path", {d: "M16 17v4"}], ["path", {d: "M21 12h-9"}], ["path", {d: "M21 19h-5"}], ["path", {d: "M21 5h-7"}], ["path", {d: "M8 10v4"}], ["path", {d: "M8 12H3"}]],
    'sparkles': [["path", {d: "M11.017 2.814a1 1 0 0 1 1.966 0l1.051 5.558a2 2 0 0 0 1.594 1.594l5.558 1.051a1 1 0 0 1 0 1.966l-5.558 1.051a2 2 0 0 0-1.594 1.594l-1.051 5.558a1 1 0 0 1-1.966 0l-1.051-5.558a2 2 0 0 0-1.594-1.594l-5.558-1.051a1 1 0 0 1 0-1.966l5.558-1.051a2 2 0 0 0 1.594-1.594z"}], ["path", {d: "M20 2v4"}], ["path", {d: "M22 4h-4"}], ["circle", {cx: "4", cy: "20", r: "2"}]],
    'square': [["rect", {width: "18", height: "18", x: "3", y: "3", rx: "2"}]],
    'star': [["path", {d: "M11.525 2.295a.53.53 0 0 1 .95 0l2.31 4.679a2.123 2.123 0 0 0 1.595 1.16l5.166.756a.53.53 0 0 1 .294.904l-3.736 3.638a2.123 2.123 0 0 0-.611 1.878l.882 5.14a.53.53 0 0 1-.771.56l-4.618-2.428a2.122 2.122 0 0 0-1.973 0L6.396 21.01a.53.53 0 0 1-.77-.56l.881-5.139a2.122 2.122 0 0 0-.611-1.879L2.16 9.795a.53.53 0 0 1 .294-.906l5.165-.755a2.122 2.122 0 0 0 1.597-1.16z"}]],
    'upload': [["path", {d: "M12 3v12"}], ["path", {d: "m17 8-5-5-5 5"}], ["path", {d: "M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"}]],
    'user-round': [["circle", {cx:"12",cy:"8",r:"5"}], ["path", {d:"M20 21a8 8 0 0 0-16 0"}]],
    'users': [["path", {d: "M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"}], ["path", {d: "M16 3.128a4 4 0 0 1 0 7.744"}], ["path", {d: "M22 21v-2a4 4 0 0 0-3-3.87"}], ["circle", {cx: "9", cy: "7", r: "4"}]],
    'zap': [["path", {d:"M4 14a1 1 0 0 1-.78-1.63l9-11a.5.5 0 0 1 .87.45l-1.67 6.68A1 1 0 0 0 12.39 10H20a1 1 0 0 1 .78 1.63l-9 11a.5.5 0 0 1-.87-.45l1.67-6.68A1 1 0 0 0 11.61 14z"}]],
    'x': [["path", {d: "M18 6 6 18"}], ["path", {d: "m6 6 12 12"}]]
  };

  var ATTR_NAME = { strokeWidth: 'stroke-width' };

  function attrText(map) {
    return Object.keys(map).map(function (key) {
      return ' ' + (ATTR_NAME[key] || key) + '="' + String(map[key]).replace(/"/g, '&quot;') + '"';
    }).join('');
  }

  function markup(name, options) {
    var nodes = NODES[name];
    if (!nodes) return '';
    var settings = options || {};
    var size = settings.size == null ? 24 : settings.size;
    var stroke = settings.strokeWidth == null ? 1.5 : settings.strokeWidth;
    var className = settings.className ? 'lucide lucide-' + name + ' ' + settings.className : 'lucide lucide-' + name;
    return '<svg xmlns="http://www.w3.org/2000/svg" class="' + className + '" width="' + size + '" height="' + size
      + '" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="' + stroke
      + '" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">'
      + nodes.map(function (node) { return '<' + node[0] + attrText(node[1]) + '></' + node[0] + '>'; }).join('')
      + '</svg>';
  }

  function node(name, options) {
    var wrapper = document.createElement('div');
    wrapper.innerHTML = markup(name, options);
    return wrapper.firstElementChild;
  }

  window.__evaLucide = markup;
  window.__evaLucideNode = node;
  window.__evaLucideNames = Object.keys(NODES);
})();
