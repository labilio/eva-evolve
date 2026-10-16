import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import {loadIdentityEnvironment} from './helpers/identity-environment.mjs';
function setup(){
 const window={};loadIdentityEnvironment(window);
 for(const file of ['009-2-membership','009-3-chat-notifications'])vm.runInNewContext(fs.readFileSync('prototype/'+file+'.js','utf8'),{window});
 const membership=window.EvaMembership.create({actorId:'a',people:[{id:'a',name:'甲'},{id:'b',name:'乙'}],groups:{g:{id:'g',name:'群',ownerId:'a',humans:[{id:'a'},{id:'b'}],cloneIds:[]}},threads:{t:'g'}});
 const messages={g:[{id:'history',timestamp:1},{id:'incoming',timestamp:2}],t:[{id:'mention',timestamp:3,mentioned:true}]};
 let calls=0;
 const connect=()=>window.EvaChatNotifications.connect({membership,conversations:()=>{calls++;return [{id:'g',seed:1},{id:'t',parentId:'g',seed:1}];},events:id=>messages[id]});
 const provider=connect();
 return {membership,messages,provider,connect,calls:()=>calls};
}
test('退出动态汇集后IM保留历史已读、独立子区、提及及新消息未读',()=>{
 const s=setup(),m=s.membership;
 assert.equal(m.conversationUnread('g','a'),1);
 assert.equal(m.conversationNotifications('g','a')[0].unread,false);
 assert.equal(m.conversationMentioned('t','a'),true);
 m.clearConversationUnread('g','a');
 assert.equal(m.conversationUnread('g','a'),0);
 assert.equal(m.conversationUnread('t','a'),1);
 s.connect();
 assert.equal(m.conversationUnread('g','a'),0);
 s.messages.g.push({id:'later',timestamp:4});
 assert.equal(m.conversationUnread('g','a'),1);
 m.clearConversationUnread('t','a');
 assert.equal(m.conversationMentioned('t','a'),false);
 m.markConversationUnread('t','a');
 assert.equal(m.conversationUnread('t','a'),1);
 assert.equal(s.provider.supports('g','other'),false);
 assert.equal(s.provider.events('g','other').length,0);
});
test('同轮IM查询共享目录，版本变化后刷新，未知会话不接管',()=>{
 const s=setup(),m=s.membership;
 m.conversationUnread('g','a');m.conversationMentioned('t','a');
 assert.equal(s.calls(),1);
 m.setChatPreferences('g','a',{mute:true});
 m.conversationUnread('g','a');
 assert.equal(s.calls(),2);
 assert.equal(s.provider.supports('missing','a'),false);
 assert.equal(s.provider.events('missing','a').length,0);
});
