import {loadIdentityEnvironment} from './helpers/identity-environment.mjs';
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
function setup(){const window={};loadIdentityEnvironment(window);vm.runInNewContext(fs.readFileSync(new URL('../prototype/009-2-membership.js',import.meta.url),'utf8'),{window});return window.EvaMembership.create({people:[{id:'a',name:'甲',active:true},{id:'b',name:'乙',active:true},{id:'c',name:'丙',active:true},{id:'inactive',active:false}],clones:[{id:'aa',ownerId:'a',name:'甲分身'},{id:'bb',ownerId:'b',name:'乙分身'}]});}
test('直接添加同步全员群且不会代带分身',()=>{const s=setup();s.createProject('p','项目','a',['aa']);assert.equal(s.members('p').length,3);s.addMember('p','a','b');assert.equal(s.canRead('all:p','b'),true);assert.equal(s.canRead('p','bb'),false);assert.throws(()=>s.addClone('p','a','bb'));s.addClone('p','b','bb');assert.equal(s.members('p').length,5);assert.equal(s.groupMembers('all:p').length,5);});
test('普通成员直接添加且重复提交幂等',()=>{const s=setup();s.createProject('p','项目','a',[]);s.addMember('p','a','b');s.addMember('p','b','c');assert.equal(s.canRead('p','c'),true);const before=JSON.stringify(s.snapshot());s.addMember('p','b','c');assert.equal(JSON.stringify(s.snapshot()),before);assert.equal(s.snapshot().invitations,undefined);assert.throws(()=>s.addMember('p','aa','inactive'));});
test('普通群独立加入，管理员未加入也不可读；子区继承群',()=>{const s=setup();s.createProject('p','项目','a',[]);s.addMember('p','a','b');s.addClone('p','b','bb');s.createGroup('g','小群','p','b',['bb']);assert.equal(s.canRead('g','a'),false);s.createThread('t','g');assert.equal(s.canRead('t','a'),false);assert.equal(s.canRead('t','bb'),true);assert.throws(()=>s.addMember('t','b','a'));assert.throws(()=>s.addClone('g','a','bb'));});
test('移除联系人级联移除分身和普通群关系；全员群不能独立修改',()=>{const s=setup();s.createProject('p','项目','a',[]);s.addMember('p','a','b');s.addClone('p','b','bb');s.createGroup('g','小群','p','a',[]);s.addMember('g','a','b');s.addClone('g','b','bb');assert.throws(()=>s.remove('all:p','a','b'));s.remove('p','a','b');assert.equal(s.canRead('g','bb'),false);assert.equal(s.canRead('p','b'),false);s.addMember('p','a','b');assert.equal(s.canRead('g','b'),false);assert.equal(s.canRead('p','bb'),false);});
test('项目负责人退出前仍须转让负责人',()=>{const s=setup();s.createProject('p','项目','a',[]);assert.throws(()=>s.remove('p','a','a'));s.addMember('p','a','b');s.transfer('p','a','b');s.remove('p','a','a');assert.equal(s.canRead('p','a'),false);});
test('群主直接退出时自动转让给稳定顺序中的其他联系人',()=>{const s=setup();s.createProject('p','项目','a',['aa']);s.addMember('p','a','b');s.addClone('p','b','bb');s.createGroup('g','小群','p','a',['aa']);s.addMember('g','a','b');s.addClone('g','b','bb');s.createThread('t','g',{name:'子区'},'a');const result=s.leaveGroup('g','a');assert.equal(result.type,'left');assert.equal(result.successorId,'b');assert.equal(s.snapshot().groups.g.ownerId,'b');assert.equal(s.canRead('g','a'),false);assert.equal(s.canRead('t','aa'),false);assert.equal(s.canRead('t','b'),true);assert.equal(s.canRead('t','bb'),true);});
test('群主没有其他可接任联系人时退出并解散父群及全部子区',()=>{const s=setup();s.createProject('p','项目','a',['aa']);s.createGroup('g','单人群','p','a',['aa']);s.createThread('t','g',{name:'子区'},'a');const result=s.leaveGroup('g','a');assert.equal(result.type,'dissolved');assert.equal(s.snapshot().groups.g,undefined);assert.equal(s.snapshot().threads.t,undefined);assert.equal(s.canRead('g','a'),false);assert.equal(s.canRead('t','a'),false);});
test('普通成员退出群聊不改变群主并同步退出全部子区',()=>{const s=setup();s.createProject('p','项目','a',[]);s.addMember('p','a','b');s.addClone('p','b','bb');s.createGroup('g','小群','p','a',[]);s.addMember('g','a','b');s.addClone('g','b','bb');s.createThread('t','g',{name:'子区'},'a');const result=s.leaveGroup('g','b');assert.equal(result.type,'left');assert.equal(result.successorId,undefined);assert.equal(s.snapshot().groups.g.ownerId,'a');assert.equal(s.canRead('t','b'),false);assert.equal(s.canRead('t','bb'),false);assert.equal(s.canRead('t','a'),true);});
test('演示身份只允许已激活联系人；重新添加不恢复分身与角色',()=>{const s=setup();s.setActor('b');assert.equal(s.snapshot().actorId,'b');assert.throws(()=>s.setActor('bb'));s.createProject('p','项目','a',[]);s.addMember('p','a','b');s.addClone('p','b','bb');s.setAdmin('p','a','b',true);s.remove('p','a','b');assert.equal(s.canRead('p','b'),false);s.addMember('p','a','b');assert.equal(s.canRead('p','bb'),false);assert.equal(s.manager('p','b'),false);});

test('现有通讯录的 AI 条目不进入联系人候选人或演示身份',()=>{const window={__EVA_MEMBERSHIP_CLONES:[],localStorage:{getItem:()=>null,setItem:()=>{}}};loadIdentityEnvironment(window);vm.runInNewContext(fs.readFileSync(new URL('../prototype/009-2-membership.js',import.meta.url),'utf8'),{window});const s=window.EvaMembership.bootstrap([{uid:'u-wangyilin',name:'王宜林'},{uid:'u-b',name:'乙'},{uid:'b-b',name:'分身',ai:true},{uid:'x-b',name:'专家',ai:true}],[{id:'p',name:'项目',members:[]}],{});assert.equal(s.snapshot().people.length,2);assert.equal(s.candidates('p','u-wangyilin').length,1);assert.throws(()=>s.setActor('b-b'));});
test('项目群列表派生唯一全员群，全员群默认名称为项目名且默认在首位，普通群按成员访问且人数实时同步',()=>{const s=setup();s.createProject('p','项目','a',['aa']);s.createGroup('g','普通群','p','a',[]);s.addMember('p','a','b');s.addClone('p','b','bb');assert.equal(s.channels('p','b',[]).length,1);assert.equal(s.channels('p','b',[])[0].id,'all:p');assert.equal(s.channels('p','b',[])[0].name,'项目');assert.equal(s.channels('p','b',[])[0].humanCount,2);assert.equal(s.channels('p','b',[])[0].cloneCount,2);assert.equal(s.channels('p','c',[]).length,0);s.addMember('g','a','b');assert.equal(s.channels('p','b',[]).length,2);s.remove('p','a','b');assert.equal(s.channels('p','a',[])[0].humanCount,1);assert.equal(s.channels('p','b',[]).length,0);});

test('全员群名称跟随项目改名，且关注列表可把全员群拖到普通群之后',()=>{const s=setup();s.createProject('p','项目甲','a',[]);s.createGroup('g','工作群','p','a',[]);assert.equal(s.channels('p','a',[])[0].name,'项目甲');s.renameProject('p','a','项目乙');assert.equal(s.channels('p','a',[])[0].name,'项目乙');assert.equal(s.conversationContext('all:p','a').groupName,'项目乙');const all=s.channels('p','a',[]).map(c=>c.id),reordered=['g','all:p'];s.setFollowOrder('a','channels:space:p',reordered);assert.deepEqual(Array.from(s.followOrder('a','channels:space:p',s.channels('p','a',[])).map(c=>c.id)),reordered);assert.deepEqual(Array.from(all),[ 'all:p','g' ]);});
test('移除项目成员须一次性指定其群主接任者；独自所在群自动解散',()=>{const s=setup();s.createProject('p','项目','a',[]);s.addMember('p','a','b');s.addClone('p','b','bb');s.addMember('p','a','c');s.createGroup('g','工作群','p','b',[]);s.addMember('g','b','c');s.createGroup('solo','个人工作群','p','b',[]);assert.throws(()=>s.remove('p','a','b'));assert.equal(s.canRead('p','b'),true);s.remove('p','a','b',{g:'c'});assert.equal(s.snapshot().groups.g.ownerId,'c');assert.equal(s.snapshot().groups.solo,undefined);assert.equal(s.canRead('g','b'),false);});
test('非项目群按本人加入范围显示，消息和子区历史在重新进入后保留',()=>{const s=setup();s.createGroup('g','非项目群',null,'a',[]);assert.equal(s.channels(null,'b').length,0);s.addMember('g','a','b');s.addClone('g','b','bb');s.createThread('t','g',{name:'子区',status:1},'a');s.sendMessage('t','b','已收到');assert.equal(s.messagesFor('t','a')[0].text,'已收到');s.remove('g','a','b');assert.equal(s.messagesFor('t','b').length,0);assert.equal(s.messagesFor('t','a').length,1);assert.equal(s.channels(null,'a')[0].threads[0].name,'子区');assert.deepEqual(Array.from(s.mentionCandidates('g').map(p=>p.id)),['a']);});
test('@所有人只记录联系人通知目标；删除子区后不可再读取',()=>{const s=setup();s.createProject('p','项目','a',['aa']);s.createThread('t','all:p',{name:'子区'},'a');s.sendMessage('t','a','@所有人 请确认');assert.deepEqual(Array.from(s.messagesFor('t','a')[0].notifiedHumanIds),['a']);s.updateThread('t',{deleted:true},'a');assert.equal(s.canRead('t','a'),false);assert.equal(s.messagesFor('t','a').length,0);});

test('分身空选不阻止创建项目、建群及直接添加',()=>{const s=setup();s.createProject('p','项目','a',[]);s.addMember('p','a','b');s.createGroup('g','项目群','p','a',[]);s.addMember('g','a','b');s.createGroup('o','非项目群',null,'a',[]);s.addMember('o','a','b');for(const id of ['p','g','o']){assert.equal(s.canRead(id,'b'),true);assert.equal(s.members(id).filter(p=>p.kind==='clone').length,0);}assert.equal(s.groupMembers('all:p').length,3);});

test('批量添加整体校验，失败不创建群或留下部分成员',()=>{const s=setup();s.createProject('p','项目','a',[]);s.addMember('p','a','b');const before=JSON.stringify(s.snapshot());assert.throws(()=>s.transaction(t=>{t.createGroup('g','群','p','a',[]);t.addMember('g','a','b');t.addMember('g','a','c');}));assert.equal(JSON.stringify(s.snapshot()),before);s.transaction(t=>{t.createGroup('g','群','p','a',[]);t.addMember('g','a','b');});assert.equal(s.canRead('g','b'),true);assert.equal(s.snapshot().memberAdditions.filter(i=>i.scopeId==='g').length,1);});

test('群设置只允许已加入的群主或有效管理员修改，分身不能治理',()=>{const s=setup();s.createProject('p','项目','a',['aa']);s.addMember('p','a','b');s.setAdmin('p','a','b',true);s.createGroup('g','群','p','a',[]);assert.throws(()=>s.setChatSettings('g','b',{notice:'不应写入'}));assert.throws(()=>s.setChatSettings('g','aa',{notice:'不应写入'}));s.addMember('g','a','b');s.setChatSettings('g','b',{name:'整改群',notice:'新公告'});assert.equal(s.snapshot().groups.g.name,'整改群');assert.equal(s.chatSettings('g').notice,'新公告');assert.throws(()=>s.setChatSettings('g','a',{name:' '}));assert.throws(()=>s.setChatSettings('g','a',{notice:'字'.repeat(401)}));});
test('群管理权限实时继承项目角色且与手动授予互不覆盖',()=>{
 const s=setup();s.createProject('p','项目','a',[]);s.addMember('p','a','b');s.addMember('p','a','c');s.setAdmin('p','a','b',true);s.createGroup('g','群','p','a',[]);s.addMember('g','a','b');s.addMember('g','a','c');
 assert.deepEqual(Array.from(s.groupGovernance('g').managerIds),['a','b']);assert.equal(s.manager('g','b'),true);
 assert.ok(s.groupGovernance('g').inheritedManagerIds.includes('b'));
 assert.equal(s.snapshot().groupGovernance?.g,undefined,'读取继承权限不创建群授权记录');
 s.setAdmin('p','a','b',false);assert.equal(s.manager('g','b'),false);
 s.setGroupManager('g','a','c',true);assert.equal(s.manager('g','c'),true);
 s.setAdmin('p','a','c',true);s.setGroupManager('g','a','c',false);assert.equal(s.manager('g','c'),true);
 s.setGroupManager('g','a','c',true);s.setAdmin('p','a','c',false);assert.equal(s.manager('g','c'),true);
 s.setGroupManager('g','a','c',false);assert.equal(s.manager('g','c'),false);
});
test('继承不自动加群、不扩大群主权限，子区和刷新读取当前项目角色',()=>{
 const s=setup();s.createProject('p','项目','a',[]);s.addMember('p','a','b');s.addMember('p','a','c');s.setAdmin('p','a','b',true);s.createGroup('g','群','p','c',[]);s.createThread('t','g');
 assert.equal(s.canRead('g','b'),false);assert.equal(s.manager('g','b'),false);
 assert.equal(s.manager('g','a'),false,'项目负责人也须先加入群');
 assert.throws(()=>s.setChatSettings('g','b',{notice:'越权'}));
 s.addMember('g','c','b');assert.equal(s.manager('t','b'),true);
 assert.throws(()=>s.transfer('g','b','c'));assert.throws(()=>s.dissolveGroup('g','b'));
 assert.throws(()=>s.setGroupManager('g','b','b',true));
 s.setGroupManager('g','c','b',true);s.setAdmin('p','a','b',false);
 const restored=windowlessRestore(s.snapshot());assert.equal(restored.manager('t','b'),true);
 restored.setGroupManager('g','c','b',false);assert.equal(restored.manager('t','b'),false);
 restored.setAdmin('p','a','b',true);assert.equal(restored.manager('t','b'),true);
 restored.leaveGroup('g','b');assert.equal(restored.manager('t','b'),false);
 restored.createGroup('other','非项目群',null,'c',[]);restored.addMember('other','c','b');assert.equal(restored.manager('other','b'),false);
});
test('群主设置群管理员，群管理员可维护 Bot 管理员、回复规则和 GROUP.md',()=>{
 const s=setup();s.createProject('p','项目','a',['aa']);s.addMember('p','a','b');s.addClone('p','b','bb');s.createGroup('g','群','p','a',['aa']);s.addMember('g','a','b');s.addClone('g','b','bb');
 assert.throws(()=>s.setGroupManager('g','b','b',true));s.setGroupManager('g','a','b',true);
 s.setGroupBotAdmin('g','b','bb',true);s.setGroupAllowNoMention('g','b',false);s.setGroupMd('g','b','# 协作约定');
 const governance=s.groupGovernance('g');assert.deepEqual(Array.from(governance.botAdminIds),['bb']);assert.equal(governance.allowNoMention,false);assert.equal(governance.groupMd,'# 协作约定');
 assert.throws(()=>s.setGroupBotAdmin('g','c','aa',true));assert.throws(()=>s.setGroupBotAdmin('g','b','c',true));
 const restored=windowlessRestore(s.snapshot());assert.equal(restored.manager('g','b'),true);assert.equal(restored.groupGovernance('g').groupMd,'# 协作约定');
 restored.remove('g','a','b');assert.equal(restored.manager('g','b'),false);assert.equal(restored.groupGovernance('g').botAdminIds.includes('bb'),false);
});
test('全员群继承项目管理员且撤销后管理操作立即拒绝',()=>{
 const s=setup();s.createProject('p','项目','a',['aa']);s.addMember('p','a','b');s.setAdmin('p','a','b',true);
 assert.deepEqual(Array.from(s.groupGovernance('all:p').managerIds),['a','b']);s.setGroupBotAdmin('all:p','b','aa',true);
 s.setAdmin('p','a','b',false);assert.throws(()=>s.setGroupBotAdmin('all:p','b','aa',false));
 s.setGroupManager('all:p','a','b',true);s.setGroupBotAdmin('all:p','b','aa',true);s.setGroupAllowNoMention('all:p','b',false);s.setGroupMd('all:p','b','全员群约定');
 const governance=s.groupGovernance('all:p');assert.deepEqual(Array.from(governance.botAdminIds),['aa']);assert.equal(governance.allowNoMention,false);assert.equal(governance.groupMd,'全员群约定');
});
test('私聊设置与清空记录按联系人和会话隔离，不删除其他人的消息',()=>{const s=setup();s.setChatPreferences('dm-b','a',{mute:true,top:true,clearedCount:2});assert.equal(s.chatPreferences('dm-b','a').mute,true);assert.equal(s.chatPreferences('dm-b','b').mute,undefined);assert.equal(s.chatPreferences('dm-c','a').mute,undefined);assert.equal(s.visibleMessages('dm-b','a',[1,2,3]).join(','),'3');assert.equal(s.visibleMessages('dm-b','b',[1,2,3]).length,3);const restored=windowlessRestore(s.snapshot());assert.equal(restored.chatPreferences('dm-b','a').top,true);});
function windowlessRestore(seed){const window={};loadIdentityEnvironment(window);vm.runInNewContext(fs.readFileSync(new URL('../prototype/009-2-membership.js',import.meta.url),'utf8'),{window});return window.EvaMembership.create(seed);}

test('演示项目默认全部置顶，按访问范围初始化且取消置顶后刷新不重置',()=>{
 let saved=null;
 const window={__EVA_MEMBERSHIP_CLONES:[],localStorage:{getItem:()=>saved,setItem:(_,value)=>{saved=value;}}};
 loadIdentityEnvironment(window);
 vm.runInNewContext(fs.readFileSync(new URL('../prototype/009-2-membership.js',import.meta.url),'utf8'),{window});
 const people=[{uid:'u-wangyilin',name:'王宜林'},{uid:'u-b',name:'乙'}],projects=[{id:'p1',name:'一',members:[]},{id:'p2',name:'二',members:[{name:'乙'}]}];
 const s=window.EvaMembership.bootstrap(people,projects,{});
 assert.deepEqual(Array.from(s.pinnedProjects('u-wangyilin')),['p1','p2']);
 assert.deepEqual(Array.from(s.pinnedProjects('u-b')),['p2']);
 s.setPinnedProjects('u-wangyilin',['p1']);
 const restored=window.EvaMembership.bootstrap(people,projects,{});
 assert.deepEqual(Array.from(restored.pinnedProjects('u-wangyilin')),['p1']);
});

test('旧项目记录缺少 colorKey 时从项目注册表恢复统一配色',()=>{
 const saved=JSON.stringify({schema:2,actorId:'u-wangyilin',people:[],clones:[],projects:{prod:{id:'prod',name:'供应链运营协同',ownerId:'u-wangyilin',humans:[{id:'u-wangyilin',role:'owner'}],cloneIds:[]}},groups:{},threads:{}});
 const window={__EVA_MEMBERSHIP_CLONES:[],localStorage:{getItem:()=>saved,setItem:()=>{}}};loadIdentityEnvironment(window);vm.runInNewContext(fs.readFileSync(new URL('../prototype/009-2-membership.js',import.meta.url),'utf8'),{window});
 const s=window.EvaMembership.bootstrap([{uid:'u-wangyilin',name:'王宜林'}],[{id:'prod',name:'供应链运营协同',colorKey:'blue',members:[]}],{});
 assert.equal(s.snapshot().projects.prod.colorKey,'blue');
 assert.equal(s.conversationContext('all:prod','u-wangyilin').colorKey,'blue');
});

test('项目专员自动覆盖本项目所有群和子区，首条欢迎包含创建信息',()=>{
 const s=setup();s.createProject('p','交付项目','a',[],'按期交付');const agent=s.projectAgent('p');assert.equal(agent.kind,'project-agent');
 const welcome=s.messagesFor('all:p','a')[0];assert.equal(welcome.sender.uid,agent.id);assert.ok(welcome.text.startsWith('@所有人'));assert.ok(welcome.text.includes('按期交付'));assert.ok(welcome.text.includes('甲'));
 s.createGroup('g','小群','p','a',[]);s.createThread('t','g');assert.ok(s.canRead('g',agent.id));assert.ok(s.canRead('t',agent.id));assert.equal(s.groupMembers('g').filter(m=>m.kind==='project-agent').length,1);
 s.createProject('other','其他项目','a',[]);assert.equal(s.canRead('all:other',agent.id),false);assert.throws(()=>s.setActor(agent.id));assert.throws(()=>s.transfer('p','a',agent.id));
});
test('普通成员可提及项目专员，回复使用当前项目元信息',()=>{
 const s=setup();s.createProject('p','项目','a',[]);s.addMember('p','a','b');s.sendMessage('all:p','b','@项目 · 项目管家 负责人是谁？');
 const messages=s.messagesFor('all:p','b');assert.equal(messages.at(-1).sender.kind,'project-agent');assert.ok(messages.at(-1).text.includes('@乙'));assert.ok(messages.at(-1).text.includes('负责人是甲'));assert.throws(()=>s.sendMessage('all:p','c','@Eva 项目管理专员'));
});

test('添加专员欢迎时保留各用户已清空的历史边界',()=>{
 const original=setup();original.createProject('p','项目','a',[]);const saved=original.snapshot();saved.messages['all:p']=[{kind:'text',text:'old-1',sender:{uid:'a'},time:'08:00'},{kind:'text',text:'old-2',sender:{uid:'a'},time:'08:01'}];saved.chatPreferences={a:{'all:p':{clearedCount:2}}};
 const s=windowlessRestore(saved);s.seedProjectAgents();const rows=s.messagesFor('all:p','a');assert.equal(s.chatPreferences('all:p','a').clearedCount,3);assert.equal(s.visibleMessages('all:p','a',rows).length,0);s.seedProjectAgents();assert.equal(s.chatPreferences('all:p','a').clearedCount,3);
});

test('所有人和项目分身提及提供 Octo 原生 mentions 数据，项目分身不可移除',()=>{
 const s=setup();s.createProject('p','项目','a',[]);const welcome=s.messagesFor('all:p','a')[0];assert.ok(welcome.mentions.some(m=>m.name==='@所有人'));
 s.sendMessage('all:p','a','@项目 · 项目管家 请介绍');assert.ok(s.messagesFor('all:p','a').at(-2).mentions.some(m=>m.uid===s.projectAgent('p').id));assert.throws(()=>s.remove('p','a',s.projectAgent('p').id),/不可移除/);assert.throws(()=>s.removeClone('p','a',s.projectAgent('p').id),/不可移除/);
});

test('旧待处理记录按当前范围迁移，已拒绝与失效记录不授予访问权',()=>{
 const s=setup();s.createProject('p','项目','a',[]);s.createGroup('g','群','p','a',[]);
 const seed=s.snapshot();seed.invitations=[{scopeId:'g',inviterId:'a',inviteeId:'b',status:'pending_accept'},{scopeId:'p',inviterId:'a',inviteeId:'b',status:'pending_approval'},{scopeId:'p',inviterId:'a',inviteeId:'c',status:'rejected'},{scopeId:'p',inviterId:'a',inviteeId:'inactive',status:'pending_accept'}];
 const restored=windowlessRestore(seed);assert.equal(restored.canRead('g','b'),true);assert.equal(restored.canRead('p','bb'),false);assert.equal(restored.canRead('p','c'),false);assert.equal(restored.canRead('p','inactive'),false);assert.equal(restored.snapshot().invitations,undefined);
 restored.remove('p','a','b');assert.equal(windowlessRestore(restored.snapshot()).canRead('p','b'),false);
});

test('会话项目路径按父群解析并遵守访问范围，改名即时更新',()=>{
 const s=setup();s.createProject('p','项目甲','a',[]);s.createGroup('g','工作群','p','a',[]);s.createThread('t','g');
 assert.equal(s.conversationContext('all:p','a').path,'项目甲');assert.equal(s.conversationContext('g','a').path,'项目甲');assert.equal(s.conversationContext('t','a').path,'项目甲 / 工作群');assert.equal(s.conversationContext('t','b'),null);
 s.renameProject('p','a','项目乙');s.setChatSettings('g','a',{name:'整改群'});assert.equal(s.conversationContext('t','a').path,'项目乙 / 整改群');
 s.createGroup('outside','非项目群',null,'a',[]);assert.equal(s.conversationContext('outside','a'),null);assert.equal(s.conversationContext('dm-b','a'),null);
});

test('非项目 Category 可自定义并按用户持久化，项目归属不受影响',()=>{
 const s=setup(), channels=[{id:'dm-b',category:'scope:other'},{id:'group-free',category:'scope:other'},{id:'all:p',category:'space:p'}];
 assert.equal(s.conversationCategories('a')[0].name,'其他会话');
 const id=s.saveConversationCategory('a',{name:'工作交流',channelIds:['dm-b'],availableChannels:channels});
 assert.equal(s.conversationCategory('a',channels[0]),id);
 assert.equal(s.conversationCategory('b',channels[0]),'scope:other');
 assert.equal(s.conversationCategory('a',channels[2]),'space:p');
 assert.throws(()=>s.saveConversationCategory('a',{name:'项目乱入',channelIds:['all:p'],availableChannels:channels}));
 assert.throws(()=>s.saveConversationCategory('a',{name:'工作交流'}));
 assert.throws(()=>s.saveConversationCategory('a',{name:' '}));
 s.saveConversationCategory('a',{id:'scope:other',name:'日常沟通',channelIds:['group-free'],availableChannels:channels});
 const restored=windowlessRestore(s.snapshot());
 assert.equal(restored.conversationCategories('a')[0].name,'日常沟通');
 assert.equal(restored.conversationCategories('b')[0].name,'其他会话');
 assert.equal(restored.conversationCategory('a',channels[0]),id);
 restored.saveConversationCategory('a',{id,name:'协作沟通',channelIds:[],availableChannels:channels});
 assert.equal(restored.conversationCategory('a',channels[0]),'scope:other');
});
