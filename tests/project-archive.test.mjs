import {loadIdentityEnvironment} from './helpers/identity-environment.mjs';
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';

function setup(seed){
  const window={};loadIdentityEnvironment(window);
  vm.runInNewContext(fs.readFileSync(new URL('../prototype/009-2-membership.js',import.meta.url),'utf8'),{window});
  const s=window.EvaMembership.create(seed||{people:[{id:'a',name:'甲'},{id:'b',name:'乙'},{id:'c',name:'丙'}]});
  if(!seed){s.setActor('a');s.createProject('p','项目','a',[]);s.addMember('p','a','b');s.setAdmin('p','a','b',true);s.createGroup('g','群','p','a',[]);s.createThread('t','g',{name:'子区',status:2},'a');s.createGroup('other','无项目群',null,'a',[]);}
  return s;
}
test('only project owner can archive and restore; archive survives reload without losing membership or unread',()=>{
  const s=setup();s.sendMessage('g','a','历史消息');
  const before=s.snapshot();
  assert.throws(()=>s.setProjectArchived('p','b',true),/负责人/);
  s.setProjectArchived('p','a',true);
  for(const id of ['p','all:p','g','t'])assert.equal(s.isProjectArchived(id),true);
  assert.equal(s.isProjectArchived('other'),false);
  assert.equal(s.canRead('g','b'),false);
  assert.equal(s.canRead('all:p','b'),true);
  assert.deepEqual(s.snapshot().messages['all:p'].filter(m=>m.kind!=='system'),before.messages['all:p']);
  assert.deepEqual(s.snapshot().messages.g.filter(m=>m.kind!=='system'),before.messages.g);
  assert.deepEqual(s.snapshot().chatPreferences,before.chatPreferences);
  const reloaded=setup(s.snapshot());
  assert.equal(reloaded.isProjectArchived('t'),true);
  reloaded.setProjectArchived('p','a',false);
  assert.equal(reloaded.isProjectArchived('t'),false);
  assert.equal(JSON.stringify(reloaded.snapshot().projects.p.humans),JSON.stringify(before.projects.p.humans));
  assert.equal(reloaded.snapshot().threadDetails.t.status,2);
  assert.equal(reloaded.projectRecord('p').archiveEvents.length,2);
});
test('archived project blocks shared writes at the store boundary but preserves personal preferences and other groups',()=>{
  const s=setup();s.setProjectArchived('p','a',true);
  const writes=[
    ()=>s.sendMessage('all:p','a','不能发送'),()=>s.sendMessage('t','a','不能发送'),
    ()=>s.renameProject('p','a','改名'),()=>s.addMember('p','a','c'),
    ()=>s.createGroup('new','新群','p','a',[]),()=>s.createThread('new','g',{name:'新子区'},'a'),
    ()=>s.updateThread('t',{status:1},'a'),()=>s.setChatSettings('g','a',{notice:'改公告'}),
    ()=>s.setAdmin('p','a','b',false),()=>s.transfer('p','a','b'),
    ()=>s.remove('p','b','b'),()=>s.leaveGroup('g','a'),()=>s.dissolveGroup('g','a'),
    ()=>s.setGroupMd('g','a','新说明'),()=>s.saveProjectRole('p','a',{name:'新角色'})
  ];
  const before=JSON.stringify(s.snapshot());
  for(const write of writes){assert.throws(write,/已归档/);assert.equal(JSON.stringify(s.snapshot()),before);}
  s.setChatPreferences('g','a',{mute:true});s.clearConversationUnread('g','a');
  s.sendMessage('other','a','仍可发送');assert.equal(s.messagesFor('other','a')[0].text,'仍可发送');
  s.setProjectArchived('p','a',false);s.sendMessage('g','a','恢复后发送');
  assert.equal(s.messagesFor('g','a').at(-1).text,'恢复后发送');
});
test('project automation remains paused after recovery until explicitly enabled',()=>{
 const s=setup();assert.equal(s.projectAutomationStatus('p','job','active'),'active');
 s.setProjectArchived('p','a',true);assert.equal(s.projectAutomationStatus('p','job','active'),'paused');
 assert.throws(()=>s.setProjectAutomationStatus('p','a','job','active'),/已归档/);
 s.setProjectArchived('p','a',false);assert.equal(s.projectAutomationStatus('p','job','active'),'paused');
 s.setProjectAutomationStatus('p','a','job','active');assert.equal(s.projectAutomationStatus('p','job','paused'),'active');
 assert.equal(setup(s.snapshot()).projectAutomationStatus('p','job','paused'),'active');
 s.setProjectArchived('p','a',true);s.setProjectArchived('p','a',false);assert.equal(s.projectAutomationStatus('p','job','active'),'paused');
});
test('归档时群与子区协作说明只读，恢复后恢复编辑权',()=>{
 const s=setup();s.setGroupMd('g','a','历史说明');s.setProjectArchived('p','a',true);
 assert.equal(s.groupMd('g','a').content,'历史说明');assert.equal(s.groupMd('g','a').canEdit,false);assert.equal(s.groupMd('t','a').canEdit,false);
 s.setProjectArchived('p','a',false);assert.equal(s.groupMd('g','a').canEdit,true);
});
test('团队草稿按账号和会话保存，归档恢复及刷新后保留且不自动发送',()=>{
 const s=setup(),before=JSON.stringify(s.messagesFor('g','a'));s.setConversationDraft('g','a','未发送');s.setConversationDraft('t','a','子区草稿');
 s.setProjectArchived('p','a',true);const restored=setup(s.snapshot());
 assert.equal(restored.conversationDraft('g','a'),'未发送');assert.equal(restored.conversationDraft('t','a'),'子区草稿');assert.equal(restored.conversationDraft('g','b'),'');
 assert.throws(()=>restored.setConversationDraft('g','b','非法'),/访问/);
 restored.setProjectArchived('p','a',false);assert.equal(restored.conversationDraft('g','a'),'未发送');assert.equal(JSON.stringify(restored.messagesFor('g','a').filter(m=>m.kind!=='system')),before);
});

test('独立归档的自动化在项目归档恢复后保持归档',()=>{
 const s=setup();s.setProjectAutomationStatus('p','a','job','archived');
 for(const archived of [true,false]){s.setProjectArchived('p','a',archived);assert.equal(s.projectAutomationStatus('p','job','active'),'archived');assert.equal(s.projectAutomationStatus('p','seed','archived'),'archived');}
 assert.equal(setup(s.snapshot()).projectAutomationStatus('p','job','active'),'archived');
});
test('删除仅允许负责人对已归档项目输入准确名称，清理所有会话与个人痕迹',()=>{
 const s=setup();s.sendMessage('g','a','历史');s.setConversationDraft('t','a','草稿');s.setChatPreferences('g','a',{mute:true});
 assert.throws(()=>s.deleteProject('p','a','项目'),/归档/);
 s.setProjectArchived('p','a',true);
 assert.throws(()=>s.deleteProject('p','b','项目'),/负责人/);
 assert.throws(()=>s.deleteProject('p','a','错误'),/名称/);
 s.deleteProject('p','a','项目');
 const state=s.snapshot();assert.equal(s.projectRecord('p'),null);assert.equal(s.canRead('all:p','a'),false);assert.equal(s.canRead('t','a'),false);
 assert.equal(state.messages.g,undefined);assert.equal(state.threads.t,undefined);assert.equal(state.conversationDrafts.a.t,undefined);assert.equal(state.chatPreferences.a.g,undefined);
 assert.equal(s.isProjectDeleted('p'),true);assert.ok(s.groupRecord('other'));assert.equal(setup(state).isProjectDeleted('p'),true);
 assert.throws(()=>s.createProject('p','复用已删除 ID','a',[]),/已删除/);
});

test('归档恢复生成操作者系统记录，持久化且不改变任何成员未读或提及',()=>{
  const s=setup();s.initializeUnreadBaseline();
  const before=['a','b'].map(uid=>[s.conversationUnread('all:p',uid,3),s.conversationMentioned('all:p',uid)]);
  s.setProjectArchived('p','a',true);s.setProjectArchived('p','a',true);s.setProjectArchived('p','a',false);
  const rows=s.messagesFor('all:p','b').filter(m=>m.eventType==='project-archived'||m.eventType==='project-restored');
  assert.equal(rows.length,2);
  for(const scope of ['g','t'])assert.equal(s.messagesFor(scope,'a').filter(m=>m.eventType).length,2);
  assert.equal(s.messagesFor('other','a').filter(m=>m.eventType).length,0);
  assert.equal(rows[0].text,'甲归档了项目');assert.equal(rows[1].text,'甲恢复了项目');
  assert.equal(JSON.stringify(rows.map(m=>m.kind)),JSON.stringify(['system','system']));
  assert.equal(JSON.stringify(rows.map(m=>m.actorId)),JSON.stringify(['a','a']));
  assert.ok(rows[0].text.includes('甲归档了项目'));assert.ok(rows[1].text.includes('甲恢复了项目'));
  assert.ok(rows.every(m=>m.createdAt&&!m.text.includes(' · ')&&!m.sender));
  assert.deepEqual(['a','b'].map(uid=>[s.conversationUnread('all:p',uid,3),s.conversationMentioned('all:p',uid)]),before);
  const reloaded=setup(s.snapshot());assert.equal(reloaded.messagesFor('all:p','b').filter(m=>m.eventType).length,2);
  s.clearConversationUnread('all:p','b');s.sendMessage('all:p','a','普通消息');assert.equal(s.conversationUnread('all:p','b'),1);
});

test('旧版只在全员群写入的归档记录，加载后补齐所有项目群与子区且不重复',()=>{
 const s=setup();s.setProjectArchived('p','a',true);const saved=s.snapshot();
 for(const event of saved.projects.p.archiveEvents)delete event.messageScopeIds;
 for(const scope of ['g','t'])saved.messages[scope]=(saved.messages[scope]||[]).filter(m=>!m.eventType);
 const restored=setup(saved);
 for(const scope of ['all:p','g','t'])assert.equal(restored.messagesFor(scope,'a').filter(m=>m.eventType==='project-archived').length,1,scope);
 const twice=setup(restored.snapshot());
 for(const scope of ['all:p','g','t'])assert.equal(twice.messagesFor(scope,'a').filter(m=>m.eventType==='project-archived').length,1,scope);
 assert.equal(twice.messagesFor('other','a').filter(m=>m.eventType).length,0);
});
