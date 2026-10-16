import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import {loadIdentityEnvironment} from './helpers/identity-environment.mjs';
function setup(){
 const window={};loadIdentityEnvironment(window);
 for(const file of ['009-2-membership','064-activity-chat-source','064-activity-store'])vm.runInNewContext(fs.readFileSync('prototype/'+file+'.js','utf8'),{window});
 const membership=window.EvaMembership.create({actorId:'a',people:[{id:'a',name:'甲'},{id:'b',name:'乙'}],groups:{g:{id:'g',name:'群',ownerId:'a',humans:[{id:'a'},{id:'b'}],cloneIds:[]}},threads:{t:'g'}});
 const values=new Map(),storage={getItem:k=>values.get(k),setItem:(k,v)=>values.set(k,v)};
 const messages={g:[{id:'history',timestamp:1},{id:'incoming',timestamp:2}],t:[{id:'mention',timestamp:3,mentioned:true}]};
 const source=window.EvaActivityChats.createSource({storage,membership,conversations:()=>[{id:'g',title:'群聊',seed:1},{id:'t',parentId:'g',title:'子区',seed:1}],events:id=>messages[id]});
 const inbox=window.EvaActivity.createStore({storage,actorId:()=>membership.actorId(),sources:[source]});
 return {inbox,source,membership,messages,values};
}
test('群与子区独立聚合，已有历史不冒充提醒，原聊天已读同步保留收件记录',async()=>{
 const s=setup();const rows=s.inbox.items();assert.equal(rows.length,2);assert.equal(rows[1].events.length,1);
 s.membership.clearConversationUnread('g','a');
 assert.equal(s.inbox.items().find(row=>row.id==='g').unreadCount,0);
 assert.equal(s.inbox.items().find(row=>row.id==='t').unreadCount,1);
 const key=rows[0].key;await s.inbox.clear(key);assert.equal(s.membership.conversationUnread('t','a'),0);
 s.messages.t.push({id:'new',timestamp:4});
 assert.equal(s.inbox.items().find(row=>row.id==='t').events.length,1);
 s.inbox.restore(key);assert.equal(s.inbox.items().find(row=>row.id==='t').events.length,2);
 assert.equal(s.membership.conversationMentioned('t','a'),false);
});

test('同轮聚合与权限检查共享目录，原数据版本变化后重新读取',()=>{
 const s=setup();const window={};vm.runInNewContext(fs.readFileSync('prototype/064-activity-chat-source.js','utf8'),{window});
 let calls=0;const storage={getItem:()=>null,setItem:()=>{}};
 const source=window.EvaActivityChats.createSource({storage,membership:s.membership,conversations:()=>{calls++;return [{id:'g',seed:1},{id:'t',parentId:'g',seed:1}];},events:id=>s.messages[id]});
 const rows=source.list('a');rows.forEach(row=>source.canRead(row,'a'));
 assert.equal(calls,1,'每条事件和权限检查不得重建整个目录');
 s.membership.setChatPreferences('g','a',{mute:true});source.canRead(rows[0],'a');
 assert.equal(calls,2,'目录不得跨原数据版本复用');
});
