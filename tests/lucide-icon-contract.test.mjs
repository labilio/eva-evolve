import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import test from 'node:test';

import { createPatchedRuntime } from '../tools/build-runtime.mjs';

const read = path => fs.readFileSync(path, 'utf8');

const walk = directory => fs.readdirSync(directory, { withFileTypes: true }).flatMap(entry => {
  const entryPath = path.join(directory, entry.name);
  return entry.isDirectory() ? walk(entryPath) : [entryPath.replaceAll(path.sep, '/')];
});

const prototypeFiles = walk('prototype');
const allowedSvgAssets = new Set([
  'prototype/assets/my-ai-collaboration.svg',
  'prototype/assets/project-agent-bot.svg',
]);
const allowedSvgImplementationFiles = new Set([
  'prototype/013-jdenticon.js',
  'prototype/014-avatar.js',
  'prototype/050-lucide-dom.js',
]);
const rawSvgPattern = /<\s*\/?\s*(?:svg|path|symbol|use|polyline|polygon|line|circle|rect)\b|(?:React\.)?createElement\(\s*["'`](?:svg|path|symbol|use|polyline|polygon|line|circle|rect)["'`]|createElementNS\([^,\n]+,\s*["'`](?:svg|path|symbol|use|polyline|polygon|line|circle|rect)["'`]/i;
const unicodeIconPattern = /["'`]\s*[×⋮⋯＋－↗↖↘↙‹›⌄⌃⏻●○◆◇▶◀▲▼✓✔✕✖🧵]\s*["'`]/u;

const isAllowedLegacyPatchLine = (file, line) => {
  if (file === 'prototype/009-5-patch-im.js') {
    return (line.includes('wk-category-header__arrow') && line.includes('React.createElement("svg"'))
      || (line.includes('evaFileDownloadStart') && line.includes('lastIndexOf(\'React.createElement("svg",\')'))
      || (line.includes('wk-thread-created-link') && line.includes('"🧵"'));
  }
  if (file === 'prototype/009-7-patch-sider.js') {
    return (line.includes('eva-user-row') && line.includes('"›"'))
      || (line.includes('eva-logout') && line.includes('"⏻"'));
  }
  return false;
};

const iconContractViolations = (file, source) => {
  const violations = [];
  const extension = path.extname(file);

  if (extension === '.svg' && !allowedSvgAssets.has(file)) {
    violations.push(`${file}: 未登记的 SVG 素材`);
  }

  if (extension === '.js') {
    source.split('\n').forEach((line, index) => {
      if (isAllowedLegacyPatchLine(file, line)) return;
      if (!allowedSvgImplementationFiles.has(file) && rawSvgPattern.test(line)) {
        violations.push(`${file}:${index + 1}: 手写 SVG`);
      }
      if (unicodeIconPattern.test(line)) violations.push(`${file}:${index + 1}: Unicode 功能图标`);
    });
  }

  if (extension === '.css') {
    source.split('\n').forEach((line, index) => {
      if (unicodeIconPattern.test(line)) violations.push(`${file}:${index + 1}: CSS 字符图标`);
    });
  }

  return violations;
};

test('Eva DOM 页面统一通过 Lucide 渲染器输出功能图标', () => {
  const modeLayer = read('prototype/020-mode-layer.js');
  const projectFiles = read('prototype/009-1-project-files-ui.js');
  const connectionCenter = read('prototype/029-connection-center-v2-functional.js');
  const legacyPages = read('prototype/025-demo-0902-v2-pages.js');

  for (const source of [modeLayer, projectFiles, connectionCenter, legacyPages]) {
    assert.match(source, /window\.__evaLucide/);
    assert.doesNotMatch(source, /<symbol\b|<use\b|<svg\b/);
  }

  assert.match(modeLayer, /treeButton\('personal', '个人文件库', 'file'/, '个人文件库保留既定文件图标语义');
  assert.match(modeLayer, /treeButton\('trash', '回收站', 'folder'/, '回收站保留既定文件夹图标语义');
  assert.match(modeLayer, /workspace: 'layout-grid'/, '项目文件库应使用项目网格语义图标');
  assert.match(read('prototype/050-lucide-dom.js'), /'minimize-2':/, '退出全屏预览应登记对应 Lucide 图标');
  assert.doesNotMatch(read('prototype/050-file-library.css'), /content\s*:\s*["']↗/);
});

test('IM 构建产物不再输出 Eva 手绘文件与更多操作图标', () => {
  const { source } = createPatchedRuntime();

  assert.match(source, /FileDriveIcon=\(\{action:rt\}\)=>React\.createElement\(rt==="saveDrive"\?Save:EvaDriveIcon/);
  assert.match(source, /React\.createElement\(Download\$5,\{size:18,"aria-hidden":true\}\)/);
  assert.match(source, /EllipsisIcon=\(\{size:rt=20\}\)=>React\.createElement\(Ellipsis,/);
  assert.doesNotMatch(source, /FileDriveIcon=\(\{action:rt\}\)=>React\.createElement\("svg"/);
  assert.doesNotMatch(source, /dangerouslySetInnerHTML:\{__html:window\.EvaFileMessage\.iconBody/);
});

test('文件消息与层级模块不再维护第二套图标路径', () => {
  assert.doesNotMatch(read('prototype/015-file-message.js'), /iconBody|<path|<polyline|<line/);
  assert.doesNotMatch(read('prototype/021-message-hierarchy.js'), /MESSAGE_ACTION_ICONS|messageActionIcon/);
});

test('全局侧栏保留既定入口语义并统一使用 Lucide 功能图标', () => {
  const { source } = createPatchedRuntime();
  const start = source.indexOf('EvaSidebarNavigation=');
  const end = source.indexOf(',Sider=(', start);
  const sidebar = source.slice(start, end);

  assert.match(sidebar, /EvaWorkbenchIcon/);
  assert.match(sidebar, /EvaAutomationIcon/);
  assert.match(sidebar, /React\.createElement\(MessageSquare,/);
  assert.match(sidebar, /React\.createElement\(LayoutGrid,/);
  assert.match(sidebar, /React\.createElement\(Globe,/);
  assert.doesNotMatch(sidebar, /AlarmClock\$4|SiderMessagesEntry|SiderCollabEntry|Earth\$2/);
  assert.match(source, /EvaLogOutIcon=createLucideIcon\("log-out"/);
  assert.match(source, /className:"eva-account-menu__item",onClick:[\s\S]*?React\.createElement\(Settings,\{size:16/);
  assert.match(source, /className:"eva-account-menu__item eva-account-menu__item--danger"[\s\S]*?React\.createElement\(EvaLogOutIcon,\{size:16/);
  assert.doesNotMatch(source, /EvaSiderFooterBase|EvaPowerIcon|className:"eva-logout"|className:"eva-settings-trigger"/);
  assert.doesNotMatch(source, /className:"eva-logout"[^}]+},"⏻"/);
});

test('通讯录与连接中心侧栏图标使用匹配 Lucide 官方名称的节点', () => {
  const patch = read('prototype/009-7-patch-sider.js');
  const domIcons = read('prototype/050-lucide-dom.js');

  assert.match(patch, /EvaContactsIcon=createLucideIcon\("book-user",/);
  assert.match(patch, /\["circle",\{cx:"12",cy:"8",r:"2",key:"book-user-avatar"\}\]/);
  assert.doesNotMatch(patch, /d:"M17 18a5 5 0 0 0-10 0",key:"book-user-profile"/);
  assert.match(patch, /EvaConnectionCenterIcon=createLucideIcon\("cable",/);
  assert.doesNotMatch(patch, /EvaConnectionCenterIcon=createLucideIcon\("unplug",/);
  assert.match(domIcons, /'book-user': \[\["path",\{d:"M15 13a3 3 0 1 0-6 0"[^\n]+\["circle", \{cx:"12", cy:"8", r:"2"\}\]\]/);
  assert.match(domIcons, /'cable': \[\["path",\{d:"M17 19/);
  assert.doesNotMatch(domIcons, /'unplug': \[\["path",\{d:"M17 19/);
});

test('项目维护的 Lucide 节点与 0.577.0 官方定义一致', () => {
  const domIcons = read('prototype/050-lucide-dom.js');
  const sidebar = read('prototype/009-7-patch-sider.js');
  const general = read('prototype/009-6-patch-general.js');
  const im = read('prototype/009-5-patch-im.js');

  assert.match(domIcons, /'chart-column': \[\["path", \{d:"M3 3v16a2 2 0 0 0 2 2h16"\}\]/);
  assert.match(domIcons, /'database': \[\["ellipse", \{cx:"12",cy:"5",rx:"9",ry:"3"\}\], \["path", \{d:"M3 5V19A9 3 0 0 0 21 19V5"\}\]/);
  assert.match(domIcons, /'file-spreadsheet': \[\["path", \{d:"M6 22a2 2 0 0 1-2-2V4/);
  assert.match(domIcons, /'git-branch': \[\["path", \{d:"M15 6a9 9 0 0 0-9 9V3"\}\]/);
  assert.match(domIcons, /'link-2': [^\n]+M15 7h2a5 5 0 1 1 0 10h-2/);
  assert.match(domIcons, /'minimize-2': \[\["path", \{d: "m14 10 7-7"\}\]/);
  assert.match(domIcons, /'zap': \[\["path", \{d:"M4 14a1 1 0 0 1-.78-1.63l9.9-10.2/);
  assert.match(sidebar, /createLucideIcon\("chart-column",\[\["path",\{d:"M3 3v16a2 2 0 0 0 2 2h16"/);
  assert.match(sidebar, /createLucideIcon\("link-2",[^\n]+M15 7h2a5 5 0 1 1 0 10h-2/);
  assert.match(general, /createLucideIcon\("Network",[^\n]+M5 16v-3a1 1 0 0 1 1-1h12/);
  assert.match(im, /createLucideIcon\("Minimize2",\[\["path",\{d:"m14 10 7-7"/);
});

test('全项目禁止新增手写 SVG、Unicode 与 CSS 字符功能图标', () => {
  for (const file of [...allowedSvgAssets, ...allowedSvgImplementationFiles]) {
    assert.ok(prototypeFiles.includes(file), `图标门禁豁免文件不存在：${file}`);
  }

  const checkedFiles = prototypeFiles.filter(file => /\.(?:css|js|svg)$/.test(file));
  const violations = checkedFiles.flatMap(file => iconContractViolations(file, read(file)));
  assert.deepEqual(violations, []);
});

test('图标门禁能拦截新手写实现而允许标准 Lucide 调用', () => {
  assert.deepEqual(
    iconContractViolations('prototype/new-panel.js', 'const Bad = () => React.createElement("svg", {}, React.createElement("path", { d: "M0 0" }));'),
    ['prototype/new-panel.js:1: 手写 SVG'],
  );
  assert.deepEqual(
    iconContractViolations('prototype/new-panel.js', 'button.textContent = "↗";'),
    ['prototype/new-panel.js:1: Unicode 功能图标'],
  );
  assert.deepEqual(
    iconContractViolations('prototype/new-panel.css', '.fake-more::before { content: "⋯"; }'),
    ['prototype/new-panel.css:1: CSS 字符图标'],
  );
  assert.deepEqual(
    iconContractViolations('prototype/new-panel.js', 'React.createElement(ChevronRight, { size: 16, "aria-hidden": true });'),
    [],
  );
  assert.deepEqual(
    iconContractViolations('prototype/new-panel.js', 'React.createElement(Tabs, { type: "line" });'),
    [],
  );
  assert.deepEqual(
    iconContractViolations('prototype/assets/unreviewed.svg', '<svg viewBox="0 0 24 24"><path d="M0 0" /></svg>'),
    ['prototype/assets/unreviewed.svg: 未登记的 SVG 素材'],
  );
});
