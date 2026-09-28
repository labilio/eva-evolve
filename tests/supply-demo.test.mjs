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
 return {s,files:window.EvaFileSharing.create(s),window};
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

test('项目管家按任务事实回复问题，旧链接演示升级且保留手动消息',()=>{
 const {s,window}=setup();s.loadSupplyDemo();
 const id='all:prod',state=s.snapshot();
 const request=state.messages[id].find(m=>m.fixtureId==='supply-chat-v4:all:prod:task-link-request');
 const reply=state.messages[id].find(m=>m.fixtureId==='supply-chat-v4:all:prod:task-link-response');
 assert.match(request.text,/采购问 A-2409/);
 assert.match(reply.text,/负责人 \*\*周远\*\*/);
 assert.match(reply.text,/\n\n\[查看任务\]/);
 assert.match(reply.text,/隔离措施、8D 根因分析和长期整改证据/);
 assert.match(reply.text,/evaTask=SC-103/);
 request.text='@Eva 项目管理专员 请把 SC-103 的任务链接发到群里，方便大家进入任务核对进展。';
 reply.text='查到 SC-103 当前**进行中**，负责人是**周远**。任务要求复核 A-2409 的隔离措施、8D 根因分析和长期整改证据；群里还没有质量放行结论，暂不能向供应商承诺恢复时间。可从这里查看任务并继续跟进：[SC-103](#/collab?evaProject=prod&evaTab=tasks&evaTask=SC-103)';
 const restored=window.EvaMembership.create(state);
 restored.sendMessage(id,'u-wangyilin','我的手动补充');
 restored.seedSupplyChatContent();
 const messages=restored.snapshot().messages[id];
 assert.equal(messages.find(m=>m.fixtureId===request.fixtureId).text,window.__EVA_SUPPLY_CHAT_CONTENT[0].messages.find(m=>m.fixtureId===request.fixtureId).text);
 assert.equal(messages.find(m=>m.fixtureId===reply.fixtureId).text,window.__EVA_SUPPLY_CHAT_CONTENT[0].messages.find(m=>m.fixtureId===reply.fixtureId).text);
 assert.ok(messages.some(m=>m.text==='我的手动补充'));
});

test('跨项目任务链接预置消息用真实换行分隔正文与链接',()=>{
 const {s}=setup();s.loadSupplyDemo();
 const messages=s.messagesFor('all:prod','u-wangyilin');
 for(const fixtureId of [
  'supply-chat-v5:all:prod:deleted-project-task-link',
  'supply-chat-v5:all:prod:cross-project-accessible',
 ]){
  const message=messages.find(item=>item.fixtureId===fixtureId);
  assert.ok(message,fixtureId+' 应存在');
  assert.match(message.text,/\n\n\[/,fixtureId+' 的链接应另起一段');
  assert.equal(message.text.includes('\\n'),false,fixtureId+' 不应显示转义字符');
 }
});

test('旧预置消息的可见转义字符只升级一次并保留用户改写',()=>{
 const {s,window}=setup();s.loadSupplyDemo();
 const fixtureIds=[
  'supply-chat-v5:all:prod:deleted-project-task-link',
  'supply-chat-v5:all:prod:cross-project-accessible',
 ];
 const state=s.snapshot();
 for(const id of fixtureIds){
  const message=state.messages['all:prod'].find(item=>item.fixtureId===id);
  message.text=message.text.replace('\n\n','\\n\\n');
 }
 const restored=window.EvaMembership.create(state);
 restored.seedSupplyChatContent();
 for(const id of fixtureIds){
  const message=restored.snapshot().messages['all:prod'].find(item=>item.fixtureId===id);
  assert.match(message.text,/\n\n\[/);
  assert.equal(message.text.includes('\\n'),false);
 }
 const editedState=s.snapshot();
 const edited=editedState.messages['all:prod'].find(item=>item.fixtureId===fixtureIds[0]);
 edited.text='我自行补充的说明\\n\\n不要覆盖';
 const preserved=window.EvaMembership.create(editedState);
 preserved.seedSupplyChatContent();
 assert.equal(preserved.snapshot().messages['all:prod'].find(item=>item.fixtureId===fixtureIds[0]).text,edited.text);
});

test('旧失效任务演示文案升级为正常任务标题，保留链接目标',()=>{
 const {s,window}=setup();s.loadSupplyDemo();
 const fixtureId='supply-chat-v5:all:prod:deleted-project-task-link';
 const state=s.snapshot();
 const message=state.messages['all:prod'].find(item=>item.fixtureId===fixtureId);
 message.text='这里放一条项目已删除后的模拟失效链接，用来检查提示与原会话是否保留。编号与供应链项目里的任务相同，也不能误打开那个任务：\\n\\n[已删除项目的 SC-103（模拟）](#/collab?evaProject=deleted-project&evaTab=tasks&evaTask=SC-103)';
 const restored=window.EvaMembership.create(state);
 restored.seedSupplyChatContent();
 const upgraded=restored.snapshot().messages['all:prod'].find(item=>item.fixtureId===fixtureId).text;
 assert.match(upgraded,/\[SC-103 复核物料替代方案\]/);
 assert.match(upgraded,/evaProject=deleted-project&evaTab=tasks&evaTask=SC-103/);
 assert.doesNotMatch(upgraded,/模拟|用于检查/);
});
