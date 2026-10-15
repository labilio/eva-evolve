import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import {loadIdentityEnvironment} from './helpers/identity-environment.mjs';
function setup(){
 const agents=[{id:'employee',kind:'staff',ownership:'organization',name:'供应链员工'}, {id:'private',kind:'staff',ownership:'personal',by:'outside',name:'私有员工'}];
 const window={EvaDigitalEmployeesStore:{agents:()=>agents,get:id=>agents.find(a=>a.id===id),appearance:()=>({})}};
 loadIdentityEnvironment(window);vm.runInNewContext(fs.readFileSync(new URL('../prototype/009-2-membership.js',import.meta.url),'utf8'),{window});
 const s=window.EvaMembership.create({people:[{id:'owner',name:'负责人'},{id:'inside',name:'项目成员'},{id:'outside',name:'项目外联系人'},{id:'inactive',active:false}],clones:[{id:'clone',ownerId:'owner'},{id:'other-clone',ownerId:'outside'}]});
 s.createProject('p','供应链运营协同','owner',['clone']);s.addMember('p','owner','inside');s.createGroup('g','采购群','p','owner',[]);s.createGroup('other','其他群','p','owner',[]);s.createThread('t','g');
 return {s,agents};
}
const human={id:'outside',kind:'human',needsProjectMembership:true}, employee={id:'employee',kind:'employee',needsProjectMembership:true};
test('项目群联系人候选只来自项目，数字员工仍可来自项目外',()=>{
 const {s}=setup(),rows=s.groupAddCandidates('g','owner');
 assert.equal(rows.some(p=>p.id==='outside'),false);
 assert.equal(rows.find(p=>p.id==='inside').needsProjectMembership,false);
 assert.equal(rows.find(p=>p.id==='employee').needsProjectMembership,true);
 assert.equal(rows.some(p=>['private','inactive','owner'].includes(p.id)),false);
});
test('联系人先入项目再入群，数字员工仍同时加入项目，重复请求幂等',()=>{
 const {s}=setup();s.addMember('p','owner','outside');s.addGroupMembers('g','owner',[human,employee]);
 for(const id of ['p','all:p','g','t'])for(const member of ['outside','employee'])assert.equal(s.canRead(id,member),true,id+member);
 assert.equal(s.canRead('other','outside'),false);assert.equal(s.canRead('g','other-clone'),false);
 const before=JSON.stringify(s.snapshot());s.addGroupMembers('g','owner',[human,employee]);assert.equal(JSON.stringify(s.snapshot()),before);
});
test('伪造项目外联系人选择或选择后退出项目均拒绝，整批回滚',()=>{
 const {s}=setup(),before=JSON.stringify(s.snapshot());
 for(const flag of [true,false])assert.throws(()=>s.addGroupMembers('g','owner',[employee,{...human,needsProjectMembership:flag}]),/先将联系人加入项目/);
 assert.equal(JSON.stringify(s.snapshot()),before);
 s.addMember('p','owner','outside');const selected=s.groupAddCandidates('g','owner').find(p=>p.id==='outside');s.remove('p','owner','outside');
 assert.throws(()=>s.addGroupMembers('g','owner',[selected]),/先将联系人加入项目/);
 assert.equal(s.canRead('g','outside'),false);
});
test('复核权限、归档、分身归属、员工告知与无效类型，失败整批回滚',()=>{
 const {s}=setup(),inside={id:'inside',kind:'human'},before=JSON.stringify(s.snapshot());
 assert.throws(()=>s.addGroupMembers('g','inside',[inside]),/加入/);
 assert.throws(()=>s.addGroupMembers('t','owner',[inside]),/群聊/);
 assert.throws(()=>s.addGroupMembers('g','owner',[inside,{...employee,needsProjectMembership:false}]),/重新选择/);
 assert.throws(()=>s.addGroupMembers('g','owner',[inside,{id:'private',kind:'employee',needsProjectMembership:true}]),/不可用/);
 assert.throws(()=>s.addGroupMembers('g','owner',[inside,{id:'other-clone',kind:'clone'}]),/自己的/);
 assert.throws(()=>s.addGroupMembers('g','owner',[inside,{id:'employee',kind:'unknown'}]),/类型/);
 assert.equal(JSON.stringify(s.snapshot()),before);
 s.setProjectArchived('p','owner',true);assert.throws(()=>s.addGroupMembers('g','owner',[inside]),/归档/);
});
test('非项目群保持直接添加且不附带项目权限',()=>{
 const {s}=setup();s.createGroup('org','非项目群',null,'owner',[]);
 assert.equal(s.groupAddCandidates('org','owner').some(p=>p.needsProjectMembership),false);
 s.addGroupMembers('org','owner',[human,employee]);assert.equal(s.canRead('org','outside'),true);assert.equal(s.canRead('p','outside'),false);assert.equal(s.canRead('p','employee'),false);
});

test('全员群不提供候选或添加命令，项目成员管理仍自动同步',()=>{
 const {s}=setup(),before=JSON.stringify(s.snapshot());
 assert.throws(()=>s.groupAddCandidates('all:p','owner'),/项目成员管理/);
 for(const item of [human,employee,{id:'clone',kind:'clone'}])assert.throws(()=>s.addGroupMembers('all:p','owner',[item]),/项目成员管理/);
 assert.equal(JSON.stringify(s.snapshot()),before);
 s.addMember('p','owner','outside');assert.equal(s.canRead('all:p','outside'),true);assert.equal(s.canRead('g','outside'),false);
});
