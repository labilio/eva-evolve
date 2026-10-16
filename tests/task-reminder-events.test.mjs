import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import fs from 'node:fs';
const source = fs.readFileSync('prototype/009-2-data-supply.js', 'utf8').split('// Canonical human account fixtures.')[0];
function setup(values = new Map()) {
  const window = {__EVA_SUPPLY_CHAIN_DEMO: {issues: [{id: 'supply-15', assignee_id: 'u-wangyilin'}]}};
  const localStorage = {getItem: key => values.get(key) || null, setItem: (key, value) => values.set(key, value)};
  vm.runInNewContext(source, {window, localStorage});
  return {window, store: window.EvaProjectReminderDemo, values, localStorage};
}
test('读过任务后新增事件重新未读，按事件标已读不吞新事件', () => {
  const s = setup();
  s.store.markRead('prod', 'supply-15');
  s.window.__EVA_TASK_REMINDER_EVENTS.prod.push({id: 'fresh', taskId: 'supply-15', kind: 'mentioned', actorId: 'u-hejing', recipientId: 'u-wangyilin', text: '请再次确认'});
  assert.equal(s.store.count('prod'), 1);
  const row = s.store.record('prod', 'supply-15');
  assert.equal(row.events.filter(e => e.unread).length, 1);
  s.store.markRead('prod', 'supply-15', 'u-wangyilin', [row.events[0].id]);
  assert.equal(s.store.count('prod'), 1);
});
test('任务已读按账号隔离并支持标未读，持久化后保持', () => {
  const s = setup();
  s.window.__EVA_TASK_REMINDER_EVENTS.prod.push({id: 'other', taskId: 'supply-15', kind: 'mentioned', actorId: 'u-hejing', recipientId: 'u-zhouyuan', text: '请确认'});
  s.store.markRead('prod', 'supply-15');
  assert.equal(s.store.count('prod', 'u-zhouyuan'), 1);
  s.store.markUnread('prod', 'supply-15');
  assert.equal(s.store.count('prod'), 1);
  assert.equal(setup(s.values).store.count('prod'), 1);
});
test('任务读状态保存失败保持未读，权限撤销后不能读取或写入', () => {
  const s = setup();
  s.localStorage.setItem = () => {throw Error('quota');};
  assert.throws(() => s.store.markRead('prod', 'supply-15'), /保存/);
  assert.equal(s.store.count('prod'), 1);
  s.window.__evaGetFileContext = () => ({store: {actorId: () => 'u-wangyilin', canRead: () => false}});
  assert.equal(s.store.count('prod'), 0);
  assert.throws(() => s.store.markRead('prod', 'supply-15'), /访问/);
});
test('旧任务级已读只迁移预置事件，后续新增不会永久已读', () => {
  const s = setup(new Map([['eva:task-reminder-read:v1', '["prod:supply-15"]']]));
  assert.equal(s.store.count('prod'), 0);
  s.window.__EVA_TASK_REMINDER_EVENTS.prod.push({id: 'later', taskId: 'supply-15', kind: 'assigned', actorId: 'u-hejing', text: '更新'});
  assert.equal(s.store.count('prod'), 1);
});
