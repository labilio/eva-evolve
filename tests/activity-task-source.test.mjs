import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
function setup(options = {}) {
  const window = {}, storage = new Map();
  vm.runInNewContext(fs.readFileSync('prototype/009-2-data-supply.js', 'utf8').split('// Canonical human account fixtures.')[0], {window, localStorage: {getItem: key => storage.get(key) || null, setItem: (key, value) => storage.set(key, value)}});
  if (fs.existsSync('prototype/064-activity-task-source.js')) vm.runInNewContext(fs.readFileSync('prototype/064-activity-task-source.js', 'utf8'), {window});
  assert.equal(typeof window.EvaActivityTasks?.createSource, 'function');
  const task = {id: 'live', workspace_id: 'prod', title: '原任务', identifier: 'SC-999', activity_log: [{id: 'change', actor_id: 'other', action: 'assignee_changed', details: {from_name: '甲', to_name: '乙'}, created_at: '2026-10-16T09:00:00Z'}]};
  const comments = [{id: 'comment', author_id: 'other', content: '请确认', created_at: '2026-10-16T09:10:00Z'}];
  let allowed = true, followed = options.followed ?? true;
  const membership = {actorId: () => 'me', canRead: () => allowed, subscribe: () => () => {}};
  const source = window.EvaActivityTasks.createSource({storage: {getItem: key => storage.get(key) || null, setItem: (key, value) => storage.set(key, value)}, reminders: window.EvaProjectReminderDemo, membership, projects: () => [{id: 'prod', name: '供应链'}], tasks: () => [task], comments: () => comments, subscriptions: {has: () => followed, subscribe: () => () => {}}, subscribeChanges: () => () => {}});
  return {source, task, comments, reminders: window.EvaProjectReminderDemo, setAllowed: value => {allowed = value;}, setFollowed: value => {followed = value;}};
}
test('真实任务日志和评论进入同一任务，不复制任务数据；源修改即时反映', () => {
  const s = setup();
  let row = s.source.list('me')[0];
  assert.equal(row.events.length, 2);
  assert.match(row.events[0].text, /负责人/);
  assert.equal(row.events[1].commentId, 'comment');
  s.task.title = '已修改';
  s.comments.push({id: 'reply', author_id: 'other', content: '补充', created_at: '2026-10-16T09:20:00Z'});
  row = s.source.list('me')[0];
  assert.equal(row.title, '已修改');
  assert.equal(row.events.length, 3);
  s.source.markRead(row, ['reply'], true, 'me');
  assert.equal(s.reminders.record('prod', 'live', 'me').events.find(e => e.id === 'reply').unread, false);
});
test('本人操作不提醒，未订阅只保留显式提及，普通@文本不产生提醒', () => {
  const s = setup();
  s.comments.push({id: 'self', author_id: 'me', content: '本人操作'});
  assert.equal(s.source.list('me')[0].events.length, 2);
  const off = setup({followed: false});
  off.comments.push({id: 'plain', author_id: 'other', content: '@me 请确认'});
  assert.equal(off.source.list('me').length, 0);
  off.comments.push({id: 'mention', author_id: 'other', content: '[@我](mention://member/me) 请确认'});
  assert.equal(off.source.list('me')[0].events[0].id, 'mention');
});

test('退订保留已投递提醒，重新订阅不补发退订期间的旧事件', () => {
  const s = setup();
  assert.equal(s.source.list('me')[0].events.length, 2);
  s.setFollowed(false);
  s.comments.push({id: 'unsubscribed', author_id: 'other', content: '退订期间'});
  assert.equal(s.source.list('me')[0].events.length, 2);
  s.setFollowed(true);
  assert.equal(s.source.list('me')[0].events.length, 2);
  s.comments.push({id: 'new', author_id: 'other', content: '重新订阅以后'});
  assert.equal(s.source.list('me')[0].events.length, 3);
});
test('无权限对象不读评论，来源读写都复核权限及当前账号', () => {
  const s = setup(), row = s.source.list('me')[0];
  s.setAllowed(false);
  assert.equal(s.source.list('me').length, 0);
  assert.throws(() => s.source.markRead(row, ['change'], true, 'me'), /访问/);
  s.setAllowed(true);
  assert.equal(s.source.list('someone-else').length, 0);
  assert.throws(() => s.source.markRead(row, ['change'], true, 'someone-else'), /账号/);
});

test('没有任务日志或评论的任务，不产生独立演示提醒', () => {
  const s = setup();
  s.task.id = 'supply-20';
  s.task.activity_log = [];
  s.comments.length = 0;
  // This historical fixture task used to receive a fabricated mention.
  assert.equal(s.reminders.allItems('prod', 'u-wangyilin').length, 0);
  s.task.assignee_id = 'me';
  s.task.id = 'supply-15';
  assert.equal(s.source.list('me').length, 0);
});
