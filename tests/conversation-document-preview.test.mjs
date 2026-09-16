import assert from 'node:assert/strict';
import { readFile, stat } from 'node:fs/promises';
import test from 'node:test';

const read = path => readFile(new URL('../' + path, import.meta.url), 'utf8');

test('全员群提供连续的四类文档决策对话', async () => {
  const source = await read('prototype/009-2-data-supply.js');
  for (const name of [
    'A-2409现场复核清单.md',
    'A-2409排产影响测算.html',
    'A-2409临时放行评审纪要.docx',
    'A-2409来料异常分析报告.pdf'
  ]) assert.match(source, new RegExp(name.replace('.', '\\.')));
  assert.match(source, /@Eva 项目管理专员 请按/);
  assert.match(source, /最终仍需王宜林[\s\S]*人工确认/);
});

test('成员消息种子兼容文本数组和文件对象', async () => {
  const source = await read('prototype/009-2-membership.js');
  assert.match(source, /Array\.isArray\(entry\)/);
  assert.match(source, /kind:payload\.kind\|\|'text'/);
  assert.match(source, /record\.fixtureId\|\|/);
});

test('消息右栏注册 Markdown、HTML、Word 和 PDF 阅读器', async () => {
  const patch = await read('prototype/009-5-patch-im.js');
  const runtime = await read('vendor/eva-legacy-runtime.js');
  assert.match(runtime, /extensions:\["md","markdown"\]/);
  assert.match(runtime, /extensions:\["pdf"\]/);
  assert.match(runtime, /showOpenExternal:xt==="html"\|\|xt==="htm"/);
  assert.match(patch, /extensions:\[\"html\",\"htm\"\]/);
  assert.match(patch, /extensions:\[\"doc\",\"docx\"\].*EvaWordPreviewRenderer/);
  assert.match(patch, /EvaHtmlPreviewDocument\(jt,rt\.url\)/);
  assert.match(patch, /Escape/);
  assert.match(patch, /\.\.\.ci,url:Zi/);
  assert.match(patch, /ch-right-panel--file-preview/);
  assert.match(patch, /data-eva-file-preview-resizer/);
  assert.match(patch, /EvaFilePreviewEnterFullscreenIcon=createLucideIcon\("Maximize2"/);
  assert.match(patch, /EvaFilePreviewExitFullscreenIcon=createLucideIcon\("Minimize2"/);
  assert.match(patch, /aria-label":evaFullscreen\?"退出全屏预览":"进入全屏预览"/);
  assert.match(patch, /className:"wk-file-preview-panel"\+\(evaFullscreen\?" is-fullscreen":""\)/);
  assert.match(patch, /if\(evaFullscreen\)\{evaEvent\.preventDefault\(\);evaEvent\.stopPropagation\(\);evaSetFullscreen\(!1\)/);
  assert.match(patch, /addEventListener\("keydown",evaOnKeyDown,!0\)/);
});

test('四类演示文件均有本地可读内容', async () => {
  for (const path of [
    'prototype/assets/file-samples/A-2409现场复核清单.md',
    'prototype/assets/file-samples/A-2409排产影响测算.html',
    'prototype/assets/file-samples/A-2409临时放行评审纪要.docx.html',
    'prototype/assets/file-samples/a-2409-demo.pdf'
  ]) assert.ok((await stat(new URL('../' + path, import.meta.url))).size > 100, path);
});

test('预览样式保持右栏推开布局', async () => {
  const css = await read('prototype/054-conversation-document-preview.css');
  const layout = await read('prototype/044-final-layout-convergence.js');
  assert.match(css, /\.ch-right-panel--preview:not\(\.ch-right-panel--file-preview\)\s*\{[\s\S]*?position:\s*absolute/);
  assert.match(css, /\.ch-right-panel--file-preview\s*\{[\s\S]*?position:\s*relative[\s\S]*?flex:\s*0 0 var\(--eva-file-preview-current/);
  assert.match(css, /\.loop-idp\.eva-task-file-preview-open\s*\{[\s\S]*?display:\s*grid/);
  assert.match(css, /\.eva-task-file-preview-pane\s*\{[\s\S]*?grid-column:\s*2/);
  assert.match(css, /\.eva-file-preview-resizer\s*\{[\s\S]*?cursor:\s*col-resize/);
  assert.match(css, /\.ch-right-panel--file-preview:has\(> \.wk-file-preview-panel\.is-fullscreen\)[\s\S]*?position:\s*fixed[\s\S]*?inset:\s*var\(--topbar-height, 37px\) 0 0 var\(--eva-sider-w, 180px\)/);
  assert.match(css, /\.eva-task-file-preview-pane:has\(> \.wk-file-preview-panel\.is-fullscreen\)/);
  assert.match(css, /\.wk-file-preview-header \.eva-file-preview-fullscreen-button > svg\s*\{[\s\S]*?display:\s*block/);
  assert.match(layout, /filePreviewMin = 280/);
  assert.match(layout, /filePreviewMax = 664/);
  assert.match(layout, /startWidth \+ activeFilePreviewDrag\.startX - event\.clientX/);
  assert.match(layout, /event\.key === 'Home'/);
  assert.doesNotMatch(css, /backdrop-filter/);
});

test('文件库独立预览提供同一全屏状态与退出规则', async () => {
  const source = await read('prototype/020-mode-layer.js');
  const css = await read('prototype/050-file-library.css');
  assert.match(source, /previewFullscreen:\s*false/);
  assert.match(source, /data-drive-action="preview-fullscreen"/);
  assert.match(source, /state\.previewFullscreen \? '退出全屏预览' : '进入全屏预览'/);
  assert.match(source, /state\.previewId && state\.previewFullscreen/);
  assert.match(css, /\.eva-file-preview-sidebar\.is-fullscreen\s*\{[\s\S]*?position:\s*fixed[\s\S]*?inset:\s*var\(--topbar-height, 37px\) 0 0 var\(--eva-sider-w, 180px\)/);
  assert.match(css, /\.eva-project-file-preview-sidebar:has\(\.wk-file-preview-panel\.is-fullscreen\)/);
});

test('任务附件接入统一预览并挂载在任务详情右栏', async () => {
  const patch = await read('prototype/009-6-patch-general.js');
  const supply = await read('prototype/009-2-data-supply.js');
  assert.match(patch, /function LoopAttachments\(\{attachments:rt,workspaceSlug:ct,onPreview:evaOnPreview,onDownload:evaOnDownload,onSave:evaOnSave/);
  assert.match(patch, /uploadAttachment=\(rt,ct\)=>evaRegisterLoopAttachment\(rt,ct\)/);
  assert.match(patch, /evaOpenTaskAttachment=async/);
  assert.match(patch, /saveTaskAttachment\(evaTaskFileActor,evaTaskSpaceId,ki,xt\)/);
  assert.match(patch, /eva-task-file-preview-pane/);
  assert.match(patch, /data-eva-file-preview-resizer/);
  assert.match(supply, /task-file-a2409-checklist[\s\S]*?A-2409现场复核清单\.md/);
  assert.match(supply, /task-file-cost-variance-analysis[\s\S]*?核心品类采购成本偏差\.csv/);
  const {createPatchedRuntime} = await import('../tools/build-runtime.mjs');
  const {source} = createPatchedRuntime();
  assert.match(source, /className:"eva-task-attachment-card"/);
  assert.match(source, /className:"eva-task-attachment-card__filetype "\+fileKind/);
  assert.match(source, /React\.createElement\(Archive,\{size:24/);
  assert.match(source, /React\.createElement\(Download\$5,\{size:24/);
  assert.match(source, /"保存到项目文件库"/);
  assert.match(source, /"前往项目文件库"/);
  assert.match(source, /uploadAttachment=\(rt,ct\)=>evaRegisterLoopAttachment\(rt,ct\)/);
  assert.match(source, /evaTaskFilePreview\?" eva-task-file-preview-open"/);
  assert.match(source, /className:"eva-task-file-preview-pane"[\s\S]*?React\.createElement\(FilePreviewHost/);
});

test('文档预览令牌只作用于预览右栏，不覆盖全局 Octo 表面令牌', async () => {
  const tokens = await read('prototype/document-preview/tokens.css');
  assert.match(tokens, /^\.eva-msg \.ch-right-panel--preview\s*\{/);
  assert.doesNotMatch(tokens, /:root\s*\{/);
  assert.match(tokens, /--wk-bg-surface:\s*var\(--semi-color-bg-0\)/);
});
