import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';

function setup(saved) {
  const root = {};
  const path = 'prototype/064-activity-store.js';
  if (fs.existsSync(path)) vm.runInNewContext(fs.readFileSync(path, 'utf8'), {window: root});
  assert.equal(typeof root.EvaActivity?.createStore, 'function', 'activity store must exist');
  let actor = 'me', allowed = true;
  const values = saved || new Map();
  const storage = {getItem: k => values.get(k), setItem: (k, v) => values.set(k, v)};
  const groups = [
    {id: 'same', projectId: 'prod', type: 'task', title: '供应商报价', events: [event('one', 1), event('two', 2)]},
    {id: 'same', projectId: 'other', type: 'task', events: [event('three', 3)]},
    {id: 'chat', projectId: 'prod', type: 'chat', events: [event('four', 4)]}
  ];
  const writes = [];
  const source = {
    id: 'native', list: () => groups, canRead: () => allowed,
    markRead(group, ids, read, account) {
      writes.push({ids, account});
      for (const item of group.events) if (ids.includes(item.id)) item.unread = !read;
    }
  };
  const store = root.EvaActivity.createStore({storage, actorId: () => actor, sources: [source]});
  return {store, groups, source, writes, storage, values, setActor: v => {actor = v;}, setAllowed: v => {allowed = v;}};
}
const event = (id, timestamp) => ({id, timestamp, unread: true});

test('全部跨类型聚合，跨项目同 ID 隔离，按最新事件排序', () => {
  const s = setup(), rows = s.store.items();
  assert.deepEqual(Array.from(rows, r => r.type), ['chat', 'task', 'task']);
  assert.equal(new Set(rows.map(r => r.key)).size, 3);
  assert.equal(rows[2].unreadCount, 2);
  assert.equal(s.store.items({type: 'task'}).length, 2);
});

test('原来源已读同步但仍留在收件箱，重新标记未读写回同一来源', async () => {
  const s = setup(), row = s.store.items()[2];
  await s.store.markRead(row.key, true);
  assert.equal(s.store.items().find(r => r.key === row.key).unreadCount, 0);
  assert.equal(s.groups[0].events[0].unread, false);
  await s.store.markRead(row.key, false);
  assert.equal(s.store.items().find(r => r.key === row.key).unreadCount, 2);
  assert.equal(s.writes[0].account, 'me');
});

test('清除推进源已读位置但不改业务内容，同时间戳新事件仍出现', async () => {
  const s = setup(), row = s.store.items()[2];
  await s.store.clear(row.key);
  assert.equal(s.store.items().length, 2);
  assert.equal(s.groups[0].title, '供应商报价');
  assert.equal(s.groups[0].events.length, 2);
  assert.equal(s.groups[0].events[0].unread, false);
  s.groups[0].events.push(event('new', 2));
  const restored = s.store.items().find(r => r.key === row.key);
  assert.equal(restored.events.length, 1);
  assert.equal(restored.events[0].id, 'new');
  assert.equal(s.writes.length, 1);
});

test('清除元数据按账号隔离并可刷新恢复，不存源消息内容', async () => {
  const s = setup(), key = s.store.items()[2].key;
  await s.store.clear(key);
  assert.equal(setup(s.values).store.items().length, 2);
  s.setActor('other');
  assert.equal(s.store.items().length, 3);
  assert.ok(!Array.from(s.values.values()).join('').includes('供应商报价'));
});

test('权限撤销立即隐藏对象并拒绝旧列表上的操作', async () => {
  const s = setup(), key = s.store.items()[0].key;
  s.setAllowed(false);
  assert.equal(s.store.items().length, 0);
  await assert.rejects(s.store.clear(key), /无法访问/);
  await assert.rejects(s.store.markRead(key), /无法访问/);
  assert.equal(s.writes.length, 0);
});

test('清除保存失败不假装成功，不丢失当前提醒', async () => {
  const s = setup(), key = s.store.items()[0].key;
  s.storage.setItem = () => {throw Error('quota');};
  await assert.rejects(s.store.clear(key), /保存/);
  assert.equal(s.store.items().length, 3);
});

test('预览最多三组，默认提供全部对象给惰性列表；全部归档覆盖所有对象', async () => {
  const s = setup();
  s.groups[0].events.push(event('five', 5), event('six', 6));
  for (let i = 0; i < 25; i++) s.groups.push({id: `more-${i}`, type: 'chat', events: [event(`e-${i}`, i + 10)]});
  assert.equal(s.store.items().length, 28);
  assert.equal(s.store.items({limit: 40}).length, 28);
  assert.equal(s.store.items({limit: 40}).find(r => r.id === 'same' && r.projectId === 'prod').preview.length, 3);
  await s.store.clearAll();
  assert.equal(s.store.items().length, 0);
  assert.equal(s.groups.length, 28);
});

test('全部已读覆盖全部来源，读操作失败传播，迟到新事件不被批量吞掉', async () => {
  const s = setup();
  const original = s.source.markRead;
  s.source.markRead = async (...args) => {
    original(...args);
    if (args[0].id === 'chat') s.groups[0].events.push(event('arriving', 9));
  };
  await s.store.markAllRead();
  assert.equal(s.groups[0].events.find(e => e.id === 'arriving').unread, true);
  s.source.markRead = () => {throw Error('write failed');};
  await assert.rejects(s.store.markRead(s.store.items()[0].key), /write failed/);
});

test('归档可查看和恢复，恢复不伪造未读，新事件和归档事件分别显示', async () => {
  const s = setup(), key = s.store.items()[2].key;
  await s.store.clear(key);
  assert.equal(s.store.items({archived: true}).length, 1);
  s.groups[0].events.push(event('after-archive', 12));
  assert.equal(s.store.items().find(row => row.key === key).events.length, 1);
  assert.equal(s.store.items({archived: true})[0].events.length, 2);
  s.store.restore(key);
  assert.equal(s.store.items({archived: true}).length, 0);
  const restored = s.store.items().find(row => row.key === key);
  assert.equal(restored.events.length, 3);
  assert.equal(restored.unreadCount, 1);
});

test('未读筛选保留当前阅读项，全部标未读不影响已归档提醒', async () => {
  const s = setup(), row = s.store.items()[2];
  await s.store.markAllRead();
  assert.equal(s.store.items({unreadOnly: true}).length, 0);
  assert.equal(s.store.items({unreadOnly: true, selectedKey: row.key}).length, 1);
  await s.store.clear(row.key);
  await s.store.markAllUnread();
  assert.equal(s.store.items({unreadOnly: true}).length, 2);
  assert.equal(s.store.items({archived: true})[0].unreadCount, 0);
});

test('摘要按相邻同人聊天聚合，字段变更中断聚合，计数保留所有未读', () => {
  const s = setup();
  s.groups[2].events = [
    {...event('m1', 10), actorId: 'other', groupable: true},
    {...event('m2', 9), actorId: 'other', groupable: true},
    {...event('change', 8), actorId: 'other'},
    {...event('m3', 7), actorId: 'other', groupable: true},
    {...event('m4', 6), actorId: 'third', groupable: true}
  ];
  const row = s.store.items()[0];
  assert.deepEqual(Array.from(row.preview, entry => entry.id), ['m1', 'change', 'm3']);
  assert.equal(row.preview[0].groupedEvents.length, 2);
  assert.equal(row.unreadCount, 5);
});

test('同时间提醒保留来源顺序，不按对象或事件 ID 重排', () => {
  const s = setup();
  s.groups.splice(0, s.groups.length,
    {id: 'z', events: [event('z', 1), event('a', 1)]},
    {id: 'a', events: [event('a', 1)]});
  assert.deepEqual(Array.from(s.store.items(), row => row.id), ['z', 'a']);
  assert.deepEqual(Array.from(s.store.items()[0].events, row => row.id), ['z', 'a']);
});

test('置顶按账号持久化，仅调整动态顺序，取消后回到时间顺序', async () => {
  const s = setup(), key = s.store.items()[2].key;
  s.store.setPinned(key, true);
  assert.equal(s.store.items()[0].key, key);
  assert.equal(s.store.items()[0].pinned, true);
  assert.equal(s.store.items()[0].unreadCount, 2);
  assert.equal(s.writes.length, 0);
  assert.equal(setup(s.values).store.items()[0].key, key);
  s.setActor('other');
  assert.notEqual(s.store.items()[0].key, key);
  s.setActor('me');
  await s.store.clear(key);
  assert.ok(!s.store.items().some(row => row.key === key));
  s.store.restore(key);
  assert.equal(s.store.items()[0].key, key);
  s.store.setPinned(key, false);
  assert.equal(s.store.items()[2].key, key);
});

test('置顶失败不改变顺序，失去权限拒绝置顶', () => {
  const s = setup(), key = s.store.items()[2].key;
  s.storage.setItem = () => {throw Error('quota');};
  assert.throws(() => s.store.setPinned(key, true), /保存/);
  assert.equal(s.store.items()[2].key, key);
  s.setAllowed(false);
  assert.throws(() => s.store.setPinned(key, true), /无法访问/);
});
