import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const source = await readFile(new URL('../review/comments.js', import.meta.url), 'utf8');
const styles = await readFile(new URL('../review/comments.css', import.meta.url), 'utf8');
const projectNavigationSource = await readFile(new URL('../prototype/009-6-patch-general.js', import.meta.url), 'utf8');

test('review comments use an independent hidden launcher instead of Eva feedback UI', () => {
  assert.match(source, /data-review-launcher/);
  assert.doesNotMatch(source, /label === ['"]反馈问题['"]/);
  assert.match(source, /<aside[^>]*class="eva-review-panel"[^>]*hidden[^>]*aria-label="原型批注"/);
  assert.match(source, /role="switch" data-review-markers/);
  assert.doesNotMatch(source, /data-review-pin-mode/);
  assert.match(source, /class="eva-review-picker-shield"/);
  assert.match(source, /document\.elementFromPoint\(x, y\)/);
  assert.doesNotMatch(source, /stopImmediatePropagation/);
});

test('comment cards use compact reply, status lights, and shared deletion controls', () => {
  assert.match(source, /data-review-reply-toggle/);
  assert.match(source, /eva-review-status-light/);
  assert.match(source, /data-review-delete/);
  assert.match(source, /store\.remove/);
  assert.match(source, /state\.replyingId === row\.id/);
});

test('comments can be completed and completed cards render below a divider', () => {
  assert.match(source, /done:\s*'原型已改完'/);
  assert.match(source, /data-review-complete/);
  assert.match(source, /eva-review-completed-divider/);
  assert.match(source, /partitionCommentsByCompletion/);
  assert.match(source, /store\.updateStatus\([^,]+,\s*'done',\s*getReviewAuthor\(\)\)/);
});

test('new comment body receives focus and Enter submits while Shift Enter adds a line', () => {
  assert.match(source, /eva-review-card \[name=body\][^\n]+\.focus\(\)/);
  assert.match(source, /event\.key === 'Enter' && !event\.shiftKey/);
  assert.match(source, /\.form\.requestSubmit\(\)/);
});

test('human author name is optional and visibly falls back to anonymous colleague', () => {
  assert.match(source, /你的名字（选填）/);
  assert.match(source, /placeholder="不填则显示匿名同事"/);
  assert.doesNotMatch(source, /placeholder="例如：周羽枫" required/);
  assert.match(source, /匿名同事/);
});

test('basically finalized is a comment type while workflow status stays separate', () => {
  assert.match(source, /批注类型<select name="kind"/);
  assert.match(source, /<option value="ready">已基本定稿<\/option>/);
  assert.doesNotMatch(source, /name="ready"/);
  assert.match(source, /doing:\s*'原型修改中'/);
  assert.doesNotMatch(source, /ready:\s*'已基本定稿'/);
  assert.match(source, /kind:form\.kind\.value,\s*status:'open'/);
});

test('route refresh discards stale page requests', () => {
  assert.match(source, /createPageRequestGate/);
  assert.match(source, /requestGate\.start\(\)/);
  assert.match(source, /requestGate\.isCurrent/);
  assert.match(source, /createPageChangeDetector/);
  assert.match(source, /currententrychange/);
});

test('review sidebar is global while pins and locating remain page-aware', () => {
  assert.match(source, /store\.list\(\)/);
  assert.match(source, /data-review-page/);
  assert.match(source, /row\.page_path !== currentPage\(\)/);
  assert.match(source, /location\.hash = row\.page_path/);
  assert.match(source, /isVisiblePin\(row, currentPage\(\), state\.pinMode\)/);
  assert.doesNotMatch(source, /state\.rows = \[\][\s\S]{0,180}refresh\(\{ quiet:true \}\)/);
});

test('new anchors calculate coordinates from the same element their selector restores', () => {
  assert.match(source, /const selector = selectorOf\(element\)/);
  assert.match(source, /document\.querySelector\(selector\)/);
  assert.match(source, /pointWithinRect\(rect, clientX, clientY\)/);
});

test('project comment locating restores nested project view before resolving the anchor', () => {
  assert.match(source, /view: currentViewContext\(\)/);
  assert.match(source, /new CustomEvent\(['"]eva:open-project-view['"]/);
  assert.match(source, /detail:\s*\{\s*projectId:\s*context\.projectId,\s*tab:\s*context\.tab\s*\}/);
  assert.match(source, /await restoreViewContext\(row\)/);
  assert.match(source, /await waitForAnchor\(row\.anchor\)/);
  assert.match(projectNavigationSource, /data-eva-project-id/);
  assert.match(projectNavigationSource, /data-eva-project-tab/);
  assert.match(projectNavigationSource, /eva:open-project-view/);
});

test('cross-page locating waits for the destination route surface before restoring nested state', () => {
  const locateBody = source.slice(source.indexOf('async function locateComment'), source.indexOf('const ROUTE_SURFACES'));
  assert.ok(locateBody.indexOf('location.hash = row.page_path') < locateBody.indexOf('await waitForRouteSurface(row)'));
  assert.ok(locateBody.indexOf('await waitForRouteSurface(row)') < locateBody.indexOf('await restoreViewContext(row)'));
  assert.match(source, /['"]#\/collab['"]:\s*['"]\.eva-project-directory, \.collab-frame['"]/);
  assert.match(source, /currentPage\(\) === row\.page_path/);
  assert.match(source, /surface\.isConnected && surface\.getClientRects\(\)\.length > 0/);
  assert.match(source, /if \(!await waitForRouteSurface\(row\)\) return toast\(['"]页面切换未完成，请重试['"]\)/);
});

test('review panel and launcher can move and collapse with one close action without changing shared data', () => {
  assert.match(source, /data-review-drag-handle/);
  assert.doesNotMatch(source, /data-review-hide/);
  assert.doesNotMatch(source, /data-review-restore/);
  assert.match(source, /eva-review-panel-position/);
  assert.match(source, /eva-review-launcher-position/);
  assert.match(source, /eva-review-entry-hidden/);
  assert.match(source, /bindFloatingDrag/);
  assert.match(source, /element !== handle && event\.target\.closest\('button,select,input,textarea,a'\)/);
  assert.doesNotMatch(source, /store\.(?:create|update|remove)\([^)]*position/);
});

test('review launcher starts below the top bar at the right edge without a comment count', () => {
  assert.match(styles, /\.eva-review-launcher\{[^}]*right:0;bottom:50%;/);
  assert.doesNotMatch(source, /data-review-badge/);
  assert.match(source, /eva-review-launcher-position-v3/);
  assert.doesNotMatch(source, /['"]eva-review-launcher-position['"]/);
});
