import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import {readFileSync} from 'node:fs';
function setup(storage, data=true){
 const ctx={window:{localStorage:storage},setTimeout,clearTimeout,console,TextEncoder};
 for(const file of ['003-my-assistant-identity.js','009-0-demo-time.js',...(data?['009-3-data-im.js']:[]),'009-3-ai-team-store.js'])vm.runInNewContext(readFileSync(new URL('../prototype/'+file,import.meta.url),'utf8'),ctx);
 return ctx.window.EvaAITeam;
}
function memory(){let value;return{getItem(){return value},setItem(_,v){value=v}}}
test('review stories cover every seeded AI with concise human requests and useful responses',()=>{
 const s=setup(memory()).getSnapshot(); assert.equal(s.sessions.length,3);
 for(const i of s.identities)assert.ok(s.sessions.some(x=>x.identityId===i.id&&x.messages.length>=4));
 const cloud=s.sessions.find(x=>x.identityId==='persona-initial');assert.ok(cloud.messages.some(x=>x.text.includes('复测')));assert.ok(cloud.messages.some(x=>x.text.includes('不提前承诺')));assert.ok(cloud.messages.every(x=>!Number.isNaN(Date.parse(x.time))));
});
test('story upgrade preserves user conversations and drafts; deleted examples stay deleted',()=>{
 const storage=memory();const old=setup(storage,false);old.sendMessage('ai-general','team-assistant-welcome','保留我的原始安排');old.setDraft('team-assistant-welcome','尚未发送');
 const upgraded=setup(storage);const snapshot=upgraded.getSnapshot();assert.ok(snapshot.sessions.find(x=>x.id==='team-assistant-welcome').messages.some(x=>x.text==='保留我的原始安排'));assert.equal(snapshot.drafts['team-assistant-welcome'],'尚未发送');
 assert.ok(snapshot.sessions.some(x=>x.id==='team-assistant-welcome-example'));upgraded.deleteSession('team-rd-review');const next=setup(storage).getSnapshot();assert.ok(!next.sessions.some(x=>x.id==='team-rd-review'));assert.equal(next.sessions.length,snapshot.sessions.length-1);
});
