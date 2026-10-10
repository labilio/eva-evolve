import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import {loadIdentityEnvironment} from './helpers/identity-environment.mjs';
function fixture(){
 const window={};loadIdentityEnvironment(window);
 const serialized=[];const traversed=[];
 vm.runInNewContext(fs.readFileSync(new URL('../prototype/009-2-membership.js',import.meta.url),'utf8'),{window,JSON:{parse:JSON.parse,stringify(value,...args){if((value?.messages||value)?.g?.some?.(m=>m.text==='历史'))traversed.push('messages');return JSON.stringify(value,...args);}}});
 const seed={actorId:'a',people:[{id:'a',name:'甲'},{id:'b',name:'乙'}],groups:{g:{id:'g',name:'群',ownerId:'a',humans:[{id:'a'},{id:'b'}],cloneIds:[]}},messages:{g:[{text:'历史',sender:{uid:'a',name:'甲'}}]},threads:{t:'g'}};
 const s=window.EvaMembership.create(seed,undefined,undefined,json=>serialized.push(json));
 return {s,serialized,traversed,create:window.EvaMembership.create};
}
test('任免只更新治理，消息和会话来源版本稳定，权限立即生效',()=>{
 const {s}=fixture();const source=s.revisionFor('source'),messages=s.revisionFor('messages','g'),list=s.revisionFor('list');let notifications=0;s.subscribe(()=>notifications++);
 for(const enabled of [true,false]){s.setGroupManager('g','a','b',enabled);assert.equal(s.manager('t','b'),enabled);assert.equal(s.revisionFor('source'),source);assert.equal(s.revisionFor('messages','g'),messages);assert.equal(s.revisionFor('list'),list);}
 assert.equal(notifications,2);
});
test('消息仅使目标会话失效，偏好不重新读取历史，成员移除立即使权限缓存失效',()=>{
 const {s}=fixture();const other=s.revisionFor('messages','g'),before=s.revisionFor('messages','t');
 s.sendMessage('t','a','新消息');assert.ok(s.revisionFor('messages','t')>before);assert.equal(s.revisionFor('messages','g'),other);
 const latest=s.revisionFor('messages','t');s.setChatPreferences('t','a',{mute:true});assert.equal(s.revisionFor('messages','t'),latest);
 s.remove('g','a','b');assert.equal(s.canRead('t','b'),false);assert.ok(s.revisionFor('messages','t')>latest);
});
test('同步持久化保留原格式，治理变更不再遍历历史，刷新和事务保持数据',()=>{
 const {s,serialized,traversed,create}=fixture();s.setGroupManager('g','a','b',true);traversed.length=0;
 s.setGroupManager('g','a','b',false);assert.deepEqual(traversed,[]);
 assert.equal(serialized.length,2);let saved=JSON.parse(serialized.at(-1));assert.equal(saved.messages.g[0].text,'历史');assert.deepEqual(saved.groupGovernance.g.managerIds,[]);
 const reopened=create(saved);assert.equal(reopened.manager('g','b'),false);assert.equal(reopened.messagesFor('g','a')[0].text,'历史');
 s.transaction(t=>t.sendMessage('t','a','事务消息'));saved=JSON.parse(serialized.at(-1));assert.equal(saved.messages.t[0].text,'事务消息');
 const before=serialized.length;assert.throws(()=>s.transaction(t=>{t.sendMessage('t','a','不应保存');throw Error('取消');}));assert.equal(serialized.length,before);assert.equal(s.messagesFor('t','a').length,1);
});
test('定向保存与权威状态一致，清空、免打扰、改名、私聊草稿和消息可恢复',()=>{
 const {s,serialized}=fixture();
 const check=()=>assert.equal(JSON.stringify(JSON.parse(serialized.at(-1))),JSON.stringify(s.snapshot()));
 const actions=[()=>s.setGroupManager('g','a','b',true),()=>s.setChatPreferences('t','a',{mute:true,top:true}),()=>s.setChatPreferences('t','a',{mute:null,top:false,clearedCount:1}),()=>s.setChatSettings('g','a',{name:'改名',notice:'公告'}),()=>s.setGroupMd('t','a','子区独立说明'),()=>s.deleteGroupMd('t','a'),()=>s.sendMessage('t','a','保留内容'),()=>s.clearConversationUnread('t','a'),()=>s.hideRecentConversation('g','a'),()=>s.setActor('b'),()=>s.setActor('a'),()=>s.openDirect('a','b')];
 for(const action of actions){action();check();}
 const id=s.directChannels('a')[0].id;s.setDirectDraft(id,'a','私聊草稿');check();s.sendDirect(id,'a','私聊内容');check();
 s.remove('g','a','b');check();assert.equal(s.canRead('t','b'),false);
});
test('兼容对象持久化回调仍收到隔离副本，失败授权不触发保存',()=>{
 const {s,create}=fixture();let calls=0;
 const store=create(s.snapshot(),value=>{calls++;value.groups.g.name='外部篡改';});
 store.setGroupManager('g','a','b',true);assert.equal(store.groupRecord('g').name,'群');
 assert.throws(()=>store.setGroupManager('g','b','a',true));assert.equal(calls,1);
});
test('调整关注顺序不使消息历史失效',()=>{
 const {s}=fixture(),before=s.revisionFor('messages','g');
 s.setFollowOrder('a','categories',['scope:other']);assert.equal(s.revisionFor('messages','g'),before);
});
