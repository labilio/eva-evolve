import assert from 'node:assert/strict';
import test from 'node:test';

import { afterBrowserPaint, buildAnchorRecord, createPageChangeDetector, createPageRequestGate, isVisiblePin, normalizeStatus, pageLabel, pointWithinRect } from '../review/comments-domain.mjs';
import * as commentsDomain from '../review/comments-domain.mjs';

const rows = [
  { id: '1', status: 'open', page_path: '#/messages' },
  { id: '2', status: 'doing', page_path: '#/messages' },
  { id: '6', status: 'approved', page_path: '#/messages' },
  { id: '7', status: 'approved', kind: 'ready', page_path: '#/messages' },
  { id: '3', status: 'open', page_path: '#/contacts' },
];

test('completed comments are partitioned after unfinished comments', () => {
  const result = commentsDomain.partitionCommentsByCompletion([
    { id: 'done-1', status: 'done' },
    { id: 'open-1', status: 'open' },
    { id: 'done-2', status: 'done' },
    { id: 'doing-1', status: 'doing' },
  ]);
  assert.deepEqual(result.pending.map(row => row.id), ['open-1', 'doing-1']);
  assert.deepEqual(result.completed.map(row => row.id), ['done-1', 'done-2']);
});

test('page marker mode shows all, approved-only, or no comments', () => {
  assert.equal(isVisiblePin(rows[0], '#/messages', 'all'), true);
  assert.equal(isVisiblePin(rows[4], '#/messages', 'all'), false);
  assert.equal(isVisiblePin(rows[2], '#/messages', 'approved'), true);
  assert.equal(isVisiblePin(rows[3], '#/messages', 'approved'), true);
  assert.equal(isVisiblePin(rows[0], '#/messages', 'approved'), false);
  assert.equal(isVisiblePin(rows[2], '#/messages', 'off'), false);
});

test('page markers default to hidden while preserving an explicit user choice', () => {
  assert.equal(typeof commentsDomain.normalizePinMode, 'function');
  assert.equal(commentsDomain.normalizePinMode(null), 'off');
  assert.equal(commentsDomain.normalizePinMode('off'), 'off');
  assert.equal(commentsDomain.normalizePinMode('all'), 'all');
  assert.equal(commentsDomain.normalizePinMode('approved'), 'all');
});

test('unknown persisted statuses fall back to open', () => {
  assert.equal(normalizeStatus('doing'), 'doing');
  assert.equal(normalizeStatus('approved'), 'approved');
  assert.equal(normalizeStatus('ready'), 'open');
  assert.equal(normalizeStatus('unexpected'), 'open');
});

test('anchor records preserve machine-readable context for a future AI handoff', () => {
  assert.deepEqual(buildAnchorRecord({
    page: '#/messages',
    selector: '[data-message-id="m1"]',
    anchorId: 'message-one',
    quote: '旧版文案',
    tag: 'button',
    role: 'button',
    label: '提交',
    placeholder: '',
    inputType: 'button',
    heading: '项目设置',
    rx: 1.2,
    ry: -1,
  }), {
    version: 1,
    page: '#/messages',
    selector: '[data-message-id="m1"]',
    anchorId: 'message-one',
    quote: '旧版文案',
    target: { tag: 'button', role: 'button', label: '提交', placeholder: '', inputType: 'button', heading: '项目设置' },
    point: { rx: 1, ry: 0 },
  });
});

test('only the latest request for the current page may replace comment state', () => {
  let page = '#/guid';
  const gate = createPageRequestGate(() => page);
  const oldRequest = gate.start();
  page = '#/contacts';
  const currentRequest = gate.start();
  assert.equal(gate.isCurrent(oldRequest), false);
  assert.equal(gate.isCurrent(currentRequest), true);
  page = '#/guid';
  assert.equal(gate.isCurrent(currentRequest), false);
});

test('page changes are detected even when a router does not emit hashchange', () => {
  let page = '#/guid';
  const changes = [];
  const detect = createPageChangeDetector(() => page, next => changes.push(next));
  assert.equal(detect(), false);
  page = '#/contacts';
  assert.equal(detect(), true);
  assert.deepEqual(changes, ['#/contacts']);
  assert.equal(detect(), false);
});

test('project restoration waits two browser frames before sending an event to newly mounted listeners', async () => {
  const callbacks = [];
  const waiting = afterBrowserPaint(callback => callbacks.push(callback));
  assert.equal(callbacks.length, 1);
  callbacks.shift()();
  assert.equal(callbacks.length, 1);
  let resolved = false;
  waiting.then(() => { resolved = true; });
  await Promise.resolve();
  assert.equal(resolved, false);
  callbacks.shift()();
  await waiting;
  assert.equal(resolved, true);
});

test('global review feed gives product labels to stored page paths', () => {
  assert.equal(pageLabel('#/guid'), '个人 · Eva同学');
  assert.equal(pageLabel('#/messages?evaIM=my-ai'), '团队 · 我的AI');
  assert.equal(pageLabel('#/eva-stub/%E6%95%B0%E5%AD%97%E5%91%98%E5%B7%A5?evaMode=personal'), '数字员工');
});

test('stored pin coordinates use the rectangle of the persisted locator target', () => {
  assert.deepEqual(pointWithinRect({ left: 100, top: 50, width: 400, height: 200 }, 300, 100), { rx: 0.5, ry: 0.25 });
  assert.deepEqual(pointWithinRect({ left: 100, top: 50, width: 0, height: 0 }, 999, -20), { rx: 1, ry: 0 });
});

test('project comments preserve the project and active tab needed to restore the view', () => {
  assert.equal(typeof commentsDomain.buildProjectViewContext, 'function');
  const view = commentsDomain.buildProjectViewContext({
    pagePath: '#/collab',
    projectId: 'prod',
    projectName: '供应链运营协同',
    tabLabel: '任务',
  });
  assert.deepEqual(view, {
    kind: 'project',
    projectId: 'prod',
    projectName: '供应链运营协同',
    tab: 'tasks',
  });
  assert.deepEqual(buildAnchorRecord({ page: '#/collab', view }).view, view);
  assert.equal(commentsDomain.buildProjectViewContext({ pagePath: '#/guid', projectId: 'prod', tabLabel: '任务' }), null);
});

test('legacy project comments can infer the task tab from their quoted target', () => {
  assert.equal(typeof commentsDomain.inferProjectTab, 'function');
  assert.equal(commentsDomain.inferProjectTab('看板 分组 列表 筛选 新建任务'), 'tasks');
  assert.equal(commentsDomain.inferProjectTab('没有项目页特征的普通文案'), '');
});

test('floating review controls remain inside the viewport and distinguish drag from click', () => {
  assert.equal(typeof commentsDomain.clampFloatingPosition, 'function');
  assert.deepEqual(commentsDomain.clampFloatingPosition({ x: 980, y: -20, width: 400, height: 600, viewportWidth: 1200, viewportHeight: 800, margin: 12 }), { x: 788, y: 12 });
  assert.equal(commentsDomain.hasDragMoved({ x: 10, y: 10 }, { x: 12, y: 13 }), false);
  assert.equal(commentsDomain.hasDragMoved({ x: 10, y: 10 }, { x: 18, y: 10 }), true);
});

test('dragged review controls release their original right and bottom insets', () => {
  assert.equal(typeof commentsDomain.floatingPositionStyle, 'function');
  assert.deepEqual(commentsDomain.floatingPositionStyle({ x: 24, y: 36 }), {
    left: '24px',
    top: '36px',
    right: 'auto',
    bottom: 'auto',
  });
});
