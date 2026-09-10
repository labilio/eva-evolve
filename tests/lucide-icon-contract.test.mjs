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

  assert.match(modeLayer, /treeButton\('personal', '个人空间', 'file'/, '个人空间保留既定文件图标语义');
  assert.match(modeLayer, /treeButton\('trash', '回收站', 'folder'/, '回收站保留既定文件夹图标语义');
  assert.match(modeLayer, /workspace: 'layout-grid'/, '项目空间应使用项目网格语义图标');
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
  assert.match(source, /React\.createElement\(EvaPowerIcon,\{size:16,strokeWidth:1\.8/);
  assert.doesNotMatch(source, /className:"eva-logout"[^}]+},"⏻"/);
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
