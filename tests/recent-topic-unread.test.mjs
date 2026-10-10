import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import {readFileSync} from 'node:fs';
const source=readFileSync('prototype/009-5-patch-im.js','utf8');
const helper=source.slice(source.indexOf('function evaRecentUnread('),source.indexOf('function EvaRecentTopicNavigation('));
test('最近的已读状态优先于演示计数，新消息按实际计数',()=>{
 const context={window:{__EVA_RECENT_UNREAD_DEMO:{topic:3}}};vm.runInNewContext(helper,context);
 const record={id:'topic',unread:3};let count=0;
 const store={conversationUnread:(id,actor,seed)=>{assert.equal(actor,'owner');return count;}};
 assert.equal(context.evaRecentUnread(store,'owner',record),0);
 count=7;assert.equal(context.evaRecentUnread(store,'owner',record),7);
 count=0;assert.equal(context.evaRecentUnread(store,'owner',{id:'custom',unread:0}),0);
});
