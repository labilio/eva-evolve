import {loadIdentityEnvironment} from './helpers/identity-environment.mjs';
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';

const SOURCE = fs.readFileSync(new URL('../prototype/009-2-membership.js', import.meta.url), 'utf8');

function setup() {
  const window = {};
  loadIdentityEnvironment(window);
  vm.runInNewContext(SOURCE, {window});
  return window.EvaMembership.create({
    people: [{id: 'a', name: '甲', active: true}, {id: 'b', name: '乙', active: true}],
    clones: []
  });
}

function restore(store) {
  const window = {};
  loadIdentityEnvironment(window);
  vm.runInNewContext(SOURCE, {window});
  return window.EvaMembership.create(store.snapshot());
}

test('新建非项目会话默认关注，取消后重新关注可归入分组并持久化', () => {
  const s = setup();
  s.createGroup('g', '非项目群', null, 'a', []);
  assert.equal(s.conversationFollowed('g', 'a'), true);
  assert.equal(s.conversationFollowed('g', 'b'), false);
  s.unfollowConversation('g', 'a');
  assert.equal(s.conversationFollowed('g', 'a'), false);
  const categoryId = s.saveConversationCategory('a', {name: '我的分组', channelIds: [], availableChannels: [{id: 'g', category: 'scope:other'}]});
  s.followConversation('g', 'a', categoryId);
  assert.equal(s.conversationFollowed('g', 'a'), true);
  assert.equal(s.conversationCategory('a', {id: 'g'}), categoryId);
  assert.equal(restore(s).conversationFollowed('g', 'a'), true);
});

test('取消关注按账号隔离，其他账号不受影响', () => {
  const s = setup();
  s.createGroup('g', '非项目群', null, 'a', []);
  s.addMember('g', 'a', 'b');
  s.followConversation('g', 'b');
  s.unfollowConversation('g', 'a');
  assert.equal(s.conversationFollowed('g', 'a'), false);
  assert.equal(s.conversationFollowed('g', 'b'), true);
});

test('项目群关注等同置顶整个项目，取消关注即取消置顶', () => {
  const s = setup();
  s.createProject('p', '项目', 'a', []);
  assert.equal(s.conversationFollowed('all:p', 'a'), false);
  s.followConversation('all:p', 'a');
  assert.deepEqual(Array.from(s.pinnedProjects('a')), ['p']);
  assert.equal(s.conversationFollowed('all:p', 'a'), true);
  s.unfollowConversation('all:p', 'a');
  assert.deepEqual(Array.from(s.pinnedProjects('a')), []);
  assert.equal(s.conversationFollowed('all:p', 'a'), false);
});

test('子区跟随父群关注，取关子区不影响父群，取消父群关注级联子区', () => {
  const s = setup();
  s.createGroup('g', '非项目群', null, 'a', []);
  s.createThread('t', 'g', {name: '子区'}, 'a');
  assert.equal(s.conversationFollowed('g', 'a'), true);
  assert.equal(s.conversationFollowed('t', 'a'), true);
  s.unfollowConversation('t', 'a');
  assert.equal(s.conversationFollowed('t', 'a'), false);
  assert.equal(s.conversationFollowed('g', 'a'), true);
  s.followConversation('t', 'a', 'scope:other');
  assert.equal(s.conversationFollowed('t', 'a'), true);
  s.unfollowConversation('g', 'a');
  assert.equal(s.conversationFollowed('g', 'a'), false);
  assert.equal(s.conversationFollowed('t', 'a'), false);
});

test('未关注子区时关注会把父群一并加入并归入所选分组', () => {
  const s = setup();
  s.createGroup('g', '非项目群', null, 'a', []);
  s.createThread('t', 'g', {name: '子区'}, 'a');
  s.unfollowConversation('g', 'a');
  const categoryId = s.saveConversationCategory('a', {name: '分组一', channelIds: [], availableChannels: [{id: 'g', category: 'scope:other'}]});
  s.followConversation('t', 'a', categoryId);
  assert.equal(s.conversationFollowed('g', 'a'), true);
  assert.equal(s.conversationFollowed('t', 'a'), true);
  assert.equal(s.conversationCategory('a', {id: 'g'}), categoryId);
});

test('通过新建分组归入的会话同时进入关注', () => {
  const s = setup();
  s.createGroup('g', '非项目群', null, 'a', []);
  s.unfollowConversation('g', 'a');
  const categoryId = s.saveConversationCategory('a', {name: '归入分组', channelIds: ['g'], availableChannels: [{id: 'g', category: 'scope:other'}]});
  assert.equal(s.conversationCategory('a', {id: 'g'}), categoryId);
  assert.equal(s.conversationFollowed('g', 'a'), true);
});

test('随包演示会话首次加载标记为已关注并可持久化', () => {
  let saved = null;
  const makeWindow = () => ({
    __EVA_IM_DEMO: {channels: [{id: 'im-demo', threads: [{id: 'im-demo-thread'}]}]},
    __EVA_LEGACY_DM_IDS: ['dm-legacy'],
    __EVA_MEMBERSHIP_CLONES: [],
    localStorage: {getItem: () => saved, setItem: (_key, value) => {saved = value;}}
  });
  const first = makeWindow();
  loadIdentityEnvironment(first);
  vm.runInNewContext(SOURCE, {window: first});
  const store = first.EvaMembership.bootstrap([{uid: 'u-wangyilin', name: '王宜林'}], [], {});
  assert.equal(store.conversationFollowed('im-demo', 'u-wangyilin'), true);
  assert.equal(store.conversationFollowed('im-demo-thread', 'u-wangyilin'), true);
  assert.equal(store.conversationFollowed('dm-legacy', 'u-wangyilin'), true);
  store.unfollowConversation('im-demo', 'u-wangyilin');
  const second = makeWindow();
  loadIdentityEnvironment(second);
  vm.runInNewContext(SOURCE, {window: second});
  const restored = second.EvaMembership.bootstrap([{uid: 'u-wangyilin', name: '王宜林'}], [], {});
  assert.equal(restored.conversationFollowed('im-demo', 'u-wangyilin'), false);
  assert.equal(restored.conversationFollowed('im-demo-thread', 'u-wangyilin'), false);
  assert.equal(restored.conversationFollowed('dm-legacy', 'u-wangyilin'), true);
});
