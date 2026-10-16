import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
function setup(){
 const window={};for(const name of ['ai-source','store'])vm.runInNewContext(fs.readFileSync('prototype/064-activity-'+name+'.js','utf8'),{window});
 let actor='owner';const values=new Map(),listeners=new Set();const storage={getItem:k=>values.get(k),setItem:(k,v)=>values.set(k,v)};
 const groups=['assistant','employee','squad'].map((id,index)=>({id,type:'message',events:[{id:id+'-history',unread:false,timestamp:1},{id:id+'-new',unread:true,timestamp:index+2}]}));
 const records=a=>a==='owner'?groups.map(g=>({...g,notifications:()=>g.events,markNotifications:(ids,read)=>{g.events.forEach(e=>{if(ids.includes(e.id))e.unread=!read;});listeners.forEach(fn=>fn());}})):[];
 const source=window.EvaActivityAI.createSource({storage,actorId:()=>actor,records,subscribeChanges:fn=>{listeners.add(fn);return()=>listeners.delete(fn);}});
 const store=window.EvaActivity.createStore({storage,actorId:()=>actor,sources:[source]});
 return {store,source,groups,records,setActor:a=>{actor=a;},emit:()=>listeners.forEach(fn=>fn())};
}
test('三个AI原来源独立聚合，原已读同步且归档不影响新到回复',async()=>{
 const s=setup();assert.equal(s.store.items().length,3);assert.ok(s.store.items().every(row=>row.events.length===1));
 const row=s.store.items().find(row=>row.id==='assistant');s.records('owner')[0].markNotifications(['assistant-new'],true);
 assert.equal(s.store.items().find(row=>row.id==='assistant').unreadCount,0);
 await s.store.clear(row.key);s.groups[0].events.push({id:'later',unread:true,timestamp:8});s.emit();
 assert.equal(s.store.items().find(row=>row.id==='assistant').events[0].id,'later');
 s.store.restore(row.key);assert.equal(s.store.items().find(row=>row.id==='assistant').events.length,2);
});
test('移除身份和账号切换立即拒绝原来源写入',async()=>{
 const s=setup(),row=s.store.items().find(row=>row.id==='employee');s.groups.splice(1,1);
 assert.equal(s.source.canRead(row,'owner'),false);await assert.rejects(s.store.markRead(row.key),/无法访问/);
 s.setActor('other');assert.equal(s.store.items().length,0);assert.equal(s.source.canRead(s.groups[0],'owner'),false);
});

test('右侧可查看没有新提醒的原会话，不为其补造收件项',()=>{
 const s=setup();s.groups.push({id:'quiet',type:'message',events:[]});
 const key=JSON.stringify(['ai','','quiet']);
 assert.equal(s.store.items().some(row=>row.id==='quiet'),false);
 assert.equal(s.store.context(key).id,'quiet');assert.equal(s.store.context(key).events.length,0);
 s.setActor('other');assert.equal(s.store.context(key),undefined);
});
