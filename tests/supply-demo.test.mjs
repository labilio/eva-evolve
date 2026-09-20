import {loadIdentityEnvironment} from './helpers/identity-environment.mjs';
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
function setup(){
 const window={};
 loadIdentityEnvironment(window);
 for(const file of ['009-0-demo-time.js','009-1-data-drive.js','009-2-data-supply.js','009-2-membership.js','009-1-file-sharing.js'])vm.runInNewContext(fs.readFileSync(new URL('../prototype/'+file,import.meta.url),'utf8'),{window});
 const people=['wangyilin','linxiao','zhouyuan','hejing','suhang','tangwei','yanbo','huiling'].map(id=>({id:'u-'+id,name:id}));
 const s=window.EvaMembership.create({people,clones:window.__EVA_MEMBERSHIP_CLONES});
 s.createProject('prod','供应链运营协同','u-wangyilin',[]);s.createProject('other','其他项目','u-wangyilin',[]);
 for(const [id,name] of [['c-eva','采购与招投标'],['c-review','质量与排产'],['c-weekly','合规与合同'],['im-bubble-lab','IM 气泡验证']])s.createGroup(id,name,'prod','u-wangyilin',[]);
 return {s,files:window.EvaFileSharing.create(s)};
}
test('供应链教程闭环：直接添加、主人带入分身、文件共享不泄漏群、独立进群、退出级联、重复载入',()=>{
 const {s,files}=setup();const before=JSON.stringify(s.snapshot().projects.other);s.loadSupplyDemo();
 assert.ok(s.channels('prod','u-wangyilin').every(c=>typeof c.lastAt==='string'&&c.threads.every(t=>typeof t.updated_at==='string')));assert.equal(s.snapshot().projects.prod.humans.length,8);assert.equal(s.canRead('prod','u-hejing'),true);
 assert.equal(s.snapshot().invitations,undefined);assert.equal(s.canRead('prod','clone-hejing'),true);
 assert.equal(s.groupMembers('all:prod').length,15);assert.equal(s.canRead('supply-demo-rectification','u-hejing'),false);
 const file=s.messagesFor('supply-demo-rectification','u-wangyilin').find(m=>m.kind==='file').file;
 files.transfer('u-wangyilin','prod',file,{groupId:'supply-demo-rectification',groupName:'供应商整改协同'});
 assert.equal(files.list('prod','u-hejing').length,1);assert.equal(s.canRead('supply-demo-evidence','u-hejing'),false);
 s.addMember('supply-demo-rectification','u-wangyilin','u-hejing');s.addClone('supply-demo-rectification','u-hejing','clone-hejing');
 assert.equal(s.canRead('supply-demo-evidence','clone-hejing'),true);
 s.remove('prod','u-hejing','u-hejing');assert.equal(files.list('prod','u-hejing').length,0);assert.equal(s.canRead('supply-demo-evidence','clone-hejing'),false);
 s.loadSupplyDemo();files.resetProjectDemo('prod');
 assert.equal(s.snapshot().invitations,undefined);assert.equal(s.snapshot().projects.prod.humans.length,8);assert.equal(files.list('prod','u-wangyilin').length,0);
 assert.equal(JSON.stringify(s.snapshot().projects.other),before);
});

test('供应链项目预设保留联系人和负责人 AI 分身可同时拉入普通群',()=>{
 const {s}=setup();s.loadSupplyDemo();const state=s.snapshot(),project=state.projects.prod;
 assert.equal(state.actorId,'u-wangyilin');
 assert.equal(project.ownerId,'u-wangyilin');
 assert.equal(project.humans.length,8);
 assert.equal(project.cloneIds.length,6);
 assert.ok(project.cloneIds.includes('b-wangyilin'));
 for(const id of ['c-eva','c-review','c-weekly','supply-demo-rectification']){
   const group=state.groups[id];
   assert.ok(group.humans.length<project.humans.length,id+'应保留未入群的项目联系人');
   assert.equal(group.cloneIds.includes('b-wangyilin'),false,id+'应保留王宜林的 AI 分身可拉入');
   assert.ok(s.candidates(id,'u-wangyilin').length>0,id+'应存在联系人候选');
 }
 assert.equal(s.groupMembers('all:prod').filter(member=>member.kind==='human').length,8);
 assert.equal(s.groupMembers('all:prod').filter(member=>member.kind==='clone').length,6);
});

test('浏览器初次加载供应链项目时直接得到可测试的成员分布',()=>{
 let saved=null;const window={localStorage:{getItem:()=>saved,setItem:(_,value)=>{saved=value;}}};loadIdentityEnvironment(window);
 for(const file of ['009-0-demo-time.js','009-1-data-drive.js','009-2-data-supply.js','009-2-membership.js'])vm.runInNewContext(fs.readFileSync(new URL('../prototype/'+file,import.meta.url),'utf8'),{window});
 const channels={prod:[{id:'c-eva',name:'采购与招投标',threads:[]},{id:'c-review',name:'质量与排产',threads:[]},{id:'c-weekly',name:'合规与合同',threads:[]}]};
 const s=window.EvaMembership.bootstrap(window.__EVA_PEOPLE,[{id:'prod',name:'供应链运营协同',members:[]}],channels);
 const state=s.snapshot();assert.equal(state.projects.prod.humans.length,8);assert.equal(state.projects.prod.cloneIds.length,6);
 assert.equal(Object.keys(state.projects.prod.memberRoleIds||{}).length,6,'供应链项目的 8 位成员中应有 6 位配置项目角色');
 assert.equal(Array.from(state.projects.prod.memberRoleIds['u-suhang']).join(','),'supply-role-front');
 assert.equal(Array.from(state.projects.prod.memberRoleIds['u-tangwei']).join(','),'supply-role-product');
 assert.ok(s.candidates('c-eva','u-wangyilin').length>0);
 assert.equal(state.groups['c-eva'].cloneIds.includes('b-wangyilin'),false);
 assert.ok(state.projects.prod.cloneIds.includes('b-wangyilin'));
});

test('群聊预设增量加载不重复、不覆盖成员与手动消息',()=>{
 const {s}=setup();s.loadSupplyDemo();s.sendMessage('supply-demo-rectification','u-wangyilin','手动补充');
 const before=JSON.stringify(s.snapshot());s.seedSupplyChatContent();s.seedSupplyChatContent();assert.equal(JSON.stringify(s.snapshot()),before);
 assert.equal(s.messagesFor('all:prod','u-wangyilin').filter(m=>m.fixtureId?.startsWith('supply-chat-v2:')).length,10);
 assert.equal(s.messagesFor('supply-demo-rectification','u-wangyilin').filter(m=>m.fixtureId).length,6);
 assert.equal(s.messagesFor('supply-demo-evidence','u-wangyilin').filter(m=>m.fixtureId).length,4);
 const messages=s.messagesFor('all:prod','u-wangyilin');
 const projectAgentName=s.projectAgent('prod').name;
 for(const [index,message] of messages.entries()){if(message.fixtureId?.startsWith('supply-chat-v2:')&&message.sender.uid==='project-agent:prod')assert.ok(messages[index-1].text.includes('@'+projectAgentName));}
 assert.equal(s.canRead('prod','u-hejing'),true);
});
