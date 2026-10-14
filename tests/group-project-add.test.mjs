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
test('群候选按实际项目归属标记联系人和数字员工，不包括停用或他人私有身份',()=>{
 const {s}=setup(),rows=s.groupAddCandidates('g','owner');
 assert.equal(rows.find(p=>p.id==='outside').needsProjectMembership,true);
 assert.equal(rows.find(p=>p.id==='inside').needsProjectMembership,false);
 assert.equal(rows.find(p=>p.id==='employee').needsProjectMembership,true);
 assert.equal(rows.some(p=>['private','inactive','owner'].includes(p.id)),false);
});
test('一次提交加入项目、全员群和目标群；不带分身、不加入其他群，重复请求幂等',()=>{
 const {s}=setup();s.addGroupMembers('g','owner',[human,employee]);
 for(const id of ['p','all:p','g','t'])for(const member of ['outside','employee'])assert.equal(s.canRead(id,member),true,id+member);
 assert.equal(s.canRead('other','outside'),false);assert.equal(s.canRead('g','other-clone'),false);
 const before=JSON.stringify(s.snapshot());s.addGroupMembers('g','owner',[human,employee]);assert.equal(JSON.stringify(s.snapshot()),before);
 assert.equal(s.groupAddCandidates('g','owner').find(p=>p.id==='outside').needsProjectMembership,false);
});
test('混合批量任一失败整体回滚，并拒绝伪造类别',()=>{
 const {s}=setup(),before=JSON.stringify(s.snapshot());
 assert.throws(()=>s.addGroupMembers('g','owner',[human,{id:'private',kind:'employee',needsProjectMembership:true}]),/不可用/);
 assert.equal(JSON.stringify(s.snapshot()),before);
 assert.throws(()=>s.addGroupMembers('g','owner',[human,{id:'employee',kind:'unknown'}]),/类型/);
 assert.equal(JSON.stringify(s.snapshot()),before);
});
test('复核群和项目权限、归档、分身归属以及未告知的项目加入',()=>{
 const {s}=setup(),before=JSON.stringify(s.snapshot());
 assert.throws(()=>s.addGroupMembers('g','inside',[human]),/加入/);
 assert.throws(()=>s.addGroupMembers('t','owner',[human]),/群聊/);
 assert.throws(()=>s.addGroupMembers('g','owner',[{...human,needsProjectMembership:false}]),/重新选择/);
 assert.throws(()=>s.addGroupMembers('g','owner',[human,{id:'other-clone',kind:'clone'}]),/自己的/);
 assert.equal(JSON.stringify(s.snapshot()),before);
 s.setProjectArchived('p','owner',true);assert.throws(()=>s.addGroupMembers('g','owner',[human]),/归档/);
});
test('非项目群保持直接添加且不附带项目权限',()=>{
 const {s}=setup();s.createGroup('org','非项目群',null,'owner',[]);
 assert.equal(s.groupAddCandidates('org','owner').some(p=>p.needsProjectMembership),false);
 s.addGroupMembers('org','owner',[human,employee]);assert.equal(s.canRead('org','outside'),true);assert.equal(s.canRead('p','outside'),false);assert.equal(s.canRead('p','employee'),false);
});

test('全员群添加直接写入项目，自动继承且不加入普通群；支持本人分身并保持原子校验',()=>{
 const {s}=setup();s.removeClone('p','owner','clone');
 assert.equal(s.groupAddCandidates('all:p','owner').find(p=>p.id==='outside').needsProjectMembership,true);
 const before=JSON.stringify(s.snapshot());
 assert.throws(()=>s.addGroupMembers('all:p','owner',[human,{id:'other-clone',kind:'clone',needsProjectMembership:true}]),/自己的/);
 assert.equal(JSON.stringify(s.snapshot()),before);
 assert.throws(()=>s.addGroupMembers('all:p','outside',[human]),/加入/);
 s.addGroupMembers('all:p','owner',[human,employee,{id:'clone',kind:'clone',needsProjectMembership:true}]);
 for(const id of ['p','all:p'])for(const member of ['outside','employee','clone'])assert.equal(s.canRead(id,member),true);
 assert.equal(s.canRead('g','outside'),false);assert.equal(s.canRead('g','employee'),false);
 assert.equal(s.groupAddCandidates('all:p','owner').find(p=>p.id==='outside').disabled,true);
 s.setProjectArchived('p','owner',true);assert.throws(()=>s.addGroupMembers('all:p','owner',[human]),/归档/);
});
