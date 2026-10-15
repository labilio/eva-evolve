import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import {loadIdentityEnvironment} from './helpers/identity-environment.mjs';
function setup(saved=null){
 let persisted=saved;
 const window={localStorage:{getItem:()=>persisted,setItem:(_,value)=>{persisted=value;}}};
 loadIdentityEnvironment(window);
 for(const file of ['009-0-demo-time.js','009-1-data-drive.js','009-2-data-supply.js','009-3-data-im.js','009-2-membership.js'])vm.runInNewContext(fs.readFileSync(new URL('../prototype/'+file,import.meta.url),'utf8'),{window});
 const store=window.EvaMembership.bootstrap(window.__EVA_PEOPLE,[{id:'prod',name:'供应链运营协同',members:[]}],{});
 return {store,saved:()=>persisted};
}
test('长姓名消息演示幂等，AI 回复有显式提及，刷新保留用户消息及移除',()=>{
 const first=setup(),id='clone-supply-volume-003';
 const messages=first.store.messagesFor('all:prod','u-wangyilin').filter(m=>m.fixtureId?.startsWith('long-name-chat-v1:'));
 assert.equal(messages.length,4);
 assert.equal(messages[2].mentions[0].uid,id);
 assert.equal(messages[3].sender.uid,id);
 assert.ok(first.store.snapshot().projects.prod.cloneIds.includes(id));
 first.store.sendMessage('all:prod','u-wangyilin','保留我的消息');
 first.store.remove('prod','u-wangyilin','u-supply-volume-003');
 const second=setup(first.saved()),state=second.store.snapshot();
 assert.equal(state.projects.prod.humans.some(p=>p.id==='u-supply-volume-003'),false);
 assert.equal(state.projects.prod.cloneIds.includes(id),false);
 const restored=second.store.messagesFor('all:prod','u-wangyilin');
 assert.equal(restored.filter(m=>m.fixtureId?.startsWith('long-name-chat-v1:')).length,4);
 assert.equal(restored.filter(m=>m.text==='保留我的消息').length,1);
});
