import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import fs from 'node:fs';
function setup(saved){
 const root={};vm.runInNewContext(fs.readFileSync('prototype/062-task-subscriptions.js','utf8'),{window:root});
 let actor='me',allowed=true;const storage=saved||{value:null,getItem(){return this.value},setItem(k,v){this.value=v}};
 const membership={actorId:()=>actor,canRead:(p,u)=>allowed&&p==='prod'&&['me','other','clone'].includes(u),cloneRecords:()=>[{id:'clone',ownerId:'me'}],subscribe:()=>()=>{}};
 const store=root.EvaTaskSubscriptions.createStore({storage,membership});
 return{store,storage,setAllowed:v=>allowed=v,setActor:v=>actor=v};
}
const task=(id,extra={})=>({id,workspace_id:'prod',creator_id:'other',...extra});
test('backfill roles, structured mentions and clone comments once; unrelated can be followed',()=>{
 const {store}=setup(),a=task('a'),b=task('b',{description:'[@我](mention://member/me)'});
 store.seed('prod',[a,b],{a:[{author_id:'clone'}]});
 assert.ok(store.has(a));assert.ok(store.has(b));assert.ok(!store.has(task('c')));
 store.set(task('c'),true);assert.ok(store.has(task('c')));
 store.seed('prod',[task('d',{creator_id:'me'})],{});assert.ok(!store.has(task('d')));
});
test('explicit off persists and defeats automatic events; resubscribe restores',()=>{
 const s=setup(),t=task('t',{assignee_id:'me'});s.store.seed('prod',[t],{});s.store.set(t,false);
 s.store.record(t,[{author_id:'clone'}]);assert.ok(!s.store.has(t));
 const next=setup(s.storage);next.store.record(t);assert.ok(!next.store.has(t));
 next.store.set(t,true);assert.ok(next.store.has(t));
});
test('transfer and comment deletion retain subscription; parent and child are independent',()=>{
 const {store}=setup(),t=task('t',{assignee_id:'me'});store.record(t);t.assignee_id='other';store.record(t);
 assert.ok(store.has(t));assert.ok(!store.has(task('child',{parent_issue_id:'t'})));
});
test('access removal clears subscriptions and prevents backfill resurrection on rejoin',()=>{
 const s=setup(),t=task('t',{creator_id:'me'});s.store.seed('prod',[t],{});s.setAllowed(false);s.store.reconcile();assert.ok(!s.store.has(t));
 assert.throws(()=>s.store.set(t,true));s.setAllowed(true);s.store.seed('prod',[t],{});assert.ok(!s.store.has(t));
});
test('plain names and foreign AI owners grant nothing; account and project isolated',()=>{
 const s=setup(),t=task('t',{description:'@me',creator_id:'employee'});s.store.record(t);assert.ok(!s.store.has(t));s.store.set(t,true);s.setActor('other');assert.ok(!s.store.has(t));assert.ok(!s.store.has({...t,workspace_id:'private'}));
});

test('failed manual persistence reports failure without changing the effective subscription',()=>{
 const s=setup(),t=task('t',{creator_id:'me'});s.store.record(t);s.storage.setItem=()=>{throw new Error('quota')};
 assert.throws(()=>s.store.set(t,false),/未能保存/);assert.ok(s.store.has(t));
 // Automatic delivery must not break task creation or the page when local storage is unavailable.
 s.store.record(task('new',{creator_id:'me'}));assert.ok(s.store.has(task('new')));
});
