import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import {loadIdentityEnvironment} from './helpers/identity-environment.mjs';

function bootstrap(saved = null) {
  let persisted = saved;
  const window = {
    localStorage: {
      getItem: () => persisted,
      setItem: (_key, value) => { persisted = value; }
    }
  };
  loadIdentityEnvironment(window);
  for (const file of ['009-0-demo-time.js', '009-3-data-im.js', '009-2-membership.js']) {
    vm.runInNewContext(fs.readFileSync(new URL('../prototype/' + file, import.meta.url), 'utf8'), {window});
  }
  const people = [
    {id: 'u-wangyilin', uid: 'u-wangyilin', name: '王宜林'},
    {id: 'u-linxiao', uid: 'u-linxiao', name: '林晓'},
    {id: 'u-hejing', uid: 'u-hejing', name: '何静'}
  ];
  const store = window.EvaMembership.bootstrap(people, [], {}, []);
  return {store, saved: () => persisted};
}

test('最近页预置一个无项目大群及有内容的子区', () => {
  const {store} = bootstrap();
  const group = store.channels(null, 'u-wangyilin').find(channel => channel.id === 'community-product-co-creation');
  assert.ok(group);
  assert.equal(store.snapshot().groups[group.id].projectId, null);
  assert.equal(group.name, '产品共创交流群');
  const thread = group.threads.find(item => item.id === 'community-feedback-roundup');
  assert.equal(thread.name, '近期体验反馈整理');
  const messages = store.messagesFor(thread.id, 'u-wangyilin');
  assert.ok(messages.length >= 3);
  assert.ok(messages.every(message => message.sender?.uid && message.text));
});

test('无项目会话预置只增量初始化一次', () => {
  const first = bootstrap();
  first.store.sendMessage('community-feedback-roundup', 'u-wangyilin', '我手动补充的内容');
  const second = bootstrap(first.saved());
  const messages = second.store.messagesFor('community-feedback-roundup', 'u-wangyilin');
  assert.equal(messages.filter(message => message.text === '我手动补充的内容').length, 1);
  assert.equal(messages.filter(message => String(message.fixtureId || '').startsWith('non-project-recent-v1:')).length, 3);
});
