import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import {loadIdentityEnvironment} from './helpers/identity-environment.mjs';
function fixture(saved){
 const window={};loadIdentityEnvironment(window);
 vm.runInNewContext(fs.readFileSync('prototype/009-2-membership.js','utf8'),{window});
 return window.EvaMembership.create(saved||{actorId:'a',people:[{id:'a',name:'甲'},{id:'b',name:'乙'}],groups:{g:{id:'g',name:'群',ownerId:'a',humans:[{id:'a'},{id:'b'}],cloneIds:[]}},threads:{t:'g'},messages:{g:[],t:[]}});
}
test('未读记录不受静音影响，主聊天已读不清除子区，刷新保持标记',()=>{
 const s=fixture();s.sendMessage('t','b','你好');
 assert.equal(s.conversationUnread('t','a'),1);
 s.setChatPreferences('g','a',{mute:true});assert.equal(s.conversationUnread('t','a'),1);
 s.clearConversationUnread('g','a');assert.equal(s.conversationUnread('t','a'),1);
 s.clearConversationUnread('t','a');assert.equal(s.conversationUnread('t','a'),0);
 s.markConversationUnread('t','a');assert.equal(s.conversationUnread('t','a'),1);
 assert.equal(fixture(s.snapshot()).conversationUnread('t','a'),1);
});
test('新提及按本人身份判断，已读清除提及，标未读不伪造提及',()=>{
 const s=fixture();s.sendMessage('t','b','@甲 请确认');
 assert.equal(s.conversationMentioned('t','a'),true);
 s.clearConversationUnread('t','a');assert.equal(s.conversationMentioned('t','a'),false);
 s.markConversationUnread('t','a');assert.equal(s.conversationMentioned('t','a'),false);
 s.sendMessage('t','b','@甲的 AI 分身 请整理');assert.equal(s.conversationMentioned('t','a'),false);
 s.sendMessage('t','b','@甲 再次确认');assert.equal(s.conversationMentioned('t','a'),true);
});
test('无权会话不返回未读或提及，不能修改标记；已读重复调用不发布更新',()=>{
 const s=fixture();s.sendMessage('t','b','@甲 请确认');let updates=0;s.subscribe(()=>updates++);
 s.clearConversationUnread('t','a');const once=updates;s.clearConversationUnread('t','a');assert.equal(updates,once);
 s.remove('g','a','b');assert.equal(s.conversationUnread('t','b',8),0);assert.equal(s.conversationMentioned('t','b',true),false);
 assert.throws(()=>s.markConversationUnread('t','b'));
});

test('演示基线只初始化一次，旧历史不新增未读，基线后的新消息刷新保留',()=>{
 const s=fixture();s.sendMessage('t','b','旧历史');s.initializeUnreadBaseline();
 assert.equal(s.conversationUnread('t','a'),0);assert.equal(s.conversationUnread('t','a',3),3);
 s.sendMessage('t','b','@甲 新消息');s.initializeUnreadBaseline();
 assert.equal(s.conversationUnread('t','a',3),4);assert.equal(s.conversationMentioned('t','a'),true);
 const restored=fixture(s.snapshot());assert.equal(restored.conversationUnread('t','a',3),4);
 restored.clearConversationUnread('t','a');assert.equal(restored.conversationUnread('t','a',3),0);
});
test('项目汇总只计当前项目，排除私聊和无权限会话，静音保留底层未读',()=>{
 const s=fixture();s.sendMessage('t','b','新消息');s.setChatPreferences('t','a',{mute:true});
 const source=fs.readFileSync('prototype/009-5-patch-im.js','utf8');
 const helper=source.slice(source.indexOf('function evaReminderRecords('),source.indexOf('function evaReminderMark('));
 const context={evaMembers:()=>({store:s}),window:{}};vm.runInNewContext(helper,context);
 const records=context.evaReminderRecords('all',[{id:'g',threads:[{id:'t'}]},{id:'forbidden',unread:4}],false);
 assert.deepEqual(Array.from(records,r=>r.id),['g','t']);
 assert.equal(records.find(r=>r.id==='t').count,1);assert.equal(records.find(r=>r.id==='t').muted,true);
 assert.equal(records.filter(r=>r.count>0&&(!r.muted||r.mentioned)).length,0);
 s.sendMessage('t','b','@甲 请确认');
 assert.equal(context.evaReminderRecords('all',[{id:'g',threads:[{id:'t'}]}],false).filter(r=>r.count>0&&(!r.muted||r.mentioned)).length,1);
});

test('公共未读组件统一隐藏零值、99+截断和完整无障碍数量，保留入口样式',()=>{
 const source=fs.readFileSync('prototype/009-5-patch-im.js','utf8');
 const component=source.slice(source.indexOf('function EvaUnreadBadge('),source.indexOf('function EvaReminderNavBadge('));
 const window={};vm.runInNewContext(fs.readFileSync('prototype/009-3-unread-ui.js','utf8'),{window});
 const Badge=vm.runInNewContext('('+component.slice(0,component.indexOf('function EvaReminderNavBadge(')).trim()+')',{React:{createElement:(tag,props,children)=>({tag,props,children})},window});
 for(const count of [0,-1,undefined,NaN,Infinity])assert.equal(Badge({count}),null);
 const one=Badge({count:1});assert.equal(one.children,1);assert.equal(one.props.className,'wk-conv-compact-badge');
 assert.equal(Badge({count:99}).children,99);
 const nav=Badge({count:120,unit:'个会话未读','data-eva-nav-unread':true,role:'status'});
 assert.equal(nav.children,'99+');assert.equal(nav.props['aria-label'],'120 个会话未读');assert.equal(nav.props['data-eva-nav-unread'],true);
 const muted=Badge({count:2,className:'eva-recent-topic-tabs__unread is-muted'});
 assert.equal(muted.props.className,'eva-recent-topic-tabs__unread is-muted');assert.equal(muted.props['aria-label'],'2 条未读消息');
 const task=Badge({count:7,label:'未读任务',unit:'个未读任务（演示）'});
 assert.equal(task.children,'未读任务 7');assert.equal(task.props['data-eva-unread-label'],'未读任务');
 assert.equal(task.props['aria-label'],'7 个未读任务（演示）');
});

test('筛选标签的批量已读只作用于该标签范围，空范围不提供操作',()=>{
 const source=fs.readFileSync('prototype/009-5-patch-im.js','utf8');
 const code=source.slice(source.indexOf('function EvaReminderToolbar('),source.indexOf('// Shared presentational component.'));
 for(const filter of ['all','unread','mentions']){
  const marked=[];const records=[{id:'normal',count:2},{id:'mention',count:1,mentioned:true},{id:'read',count:0}];
  const context={React:{createElement:(tag,props,...children)=>({tag,props,children})},reactExports:{useRef:()=>({current:null}),useState:()=>[filter,()=>{}],useMemo:fn=>fn(),forwardRef:fn=>fn},EvaSharedContextMenus:()=>{},EvaUnreadBadge:()=>null,Button:'button',evaRailIcon:()=>null,evaReminderMark:r=>marked.push(r.id),Toast:{success:()=>{}}};
  vm.runInNewContext(code,context);
  const tree=context.EvaReminderToolbar({value:'all',onChange:()=>{},records,scope:'测试'});
  tree.children[1].props.menus[0].onClick();
  assert.deepEqual(marked,filter==='mentions'?['mention']:['normal','mention']);
  assert.equal(context.EvaReminderToolbar({value:'all',onChange:()=>{},records:[],scope:'测试'}).children[1].props.menus.length,0);
 }
});

test('关注与最近右键批量已读只包含各自可见的未读会话',()=>{
 const source=fs.readFileSync('prototype/009-5-patch-im.js','utf8');
 const helper=source.slice(source.indexOf('function evaReminderTabRecords('),source.indexOf('function EvaReminderToolbar('));
 const select=vm.runInNewContext('('+helper.trim()+')');
 const records=[
  {id:'g',category:'scope:other',count:0},
  {id:'t',parentId:'g',count:2},
  {id:'hidden',category:'scope:other',count:3},
  {id:'outside',category:'scope:other',count:1},
  {id:'unpinned',category:'scope:project',count:4},
 ];
 const store={recentConversationHidden:id=>id==='hidden',conversationFollowed:id=>id!=='outside'};
 assert.deepEqual(Array.from(select('follow',records,store,'actor',[{id:'scope:other'}]),r=>r.id),['t','hidden']);
 assert.deepEqual(Array.from(select('recent',records,store,'actor',[]),r=>r.id),['t','outside','unpinned']);
});

test('项目任务提醒引用真实任务，按任务去重，排除本人操作与无关任务',()=>{
 const source=fs.readFileSync('prototype/009-2-data-supply.js','utf8');
 const code=source.slice(0,source.indexOf('// Canonical human account fixtures.'));
 const window={__EVA_SUPPLY_CHAIN_DEMO:{issues:[
  {id:'supply-15',identifier:'SC-115',title:'确认变更',assignee_id:'u-wangyilin'},
  {id:'supply-16',identifier:'SC-116',title:'复核数据',assignee_id:'u-wangyilin'}
 ]},__EVA_OFFICIAL_TASKS:[],__EVA_CLIENT_TASKS:[],__EVA_DRIVE_DEMO:{issues:[]}};
 vm.runInNewContext(code,{window});
 const reminders=window.EvaProjectReminderDemo.items('prod');
 assert.equal(reminders.length,2);
 assert.equal(reminders[0].id,'supply-15');
 assert.equal(reminders[0].reasons.length,2);
 assert.equal(window.EvaProjectReminderDemo.count('prod'),2);
 assert.equal(window.EvaProjectReminderDemo.total([{id:'prod'}]),2);
 assert.equal(window.EvaProjectReminderDemo.count('prod','u-linxiao'),0);
});

test('进入项目不清未读，只在打开具体任务后减少一个并持久化',()=>{
 const source=fs.readFileSync('prototype/009-2-data-supply.js','utf8');
 const code=source.slice(0,source.indexOf('// Canonical human account fixtures.'));
 const data=new Map();
 const localStorage={getItem:key=>data.get(key)||null,setItem:(key,value)=>data.set(key,value)};
 const makeWindow=()=>({__EVA_SUPPLY_CHAIN_DEMO:{issues:[
  {id:'supply-15',identifier:'SC-115',title:'确认变更',assignee_id:'u-wangyilin'},
  {id:'supply-16',identifier:'SC-116',title:'复核数据',assignee_id:'u-wangyilin'}
 ]},__EVA_OFFICIAL_TASKS:[],__EVA_CLIENT_TASKS:[],__EVA_DRIVE_DEMO:{issues:[]}});
 const window=makeWindow();vm.runInNewContext(code,{window,localStorage});
 const reminders=window.EvaProjectReminderDemo;
 assert.equal(reminders.count('prod'),2);
 assert.equal(reminders.count('prod'),2); // 仅查看项目不改变未读
 let updates=0;reminders.subscribe(()=>updates++);
 reminders.markRead('prod','supply-15');
 assert.equal(reminders.count('prod'),1);
 assert.equal(reminders.record('prod','supply-15').unread,false);
 assert.equal(reminders.record('prod','supply-15').reasons.length,2);
 reminders.markRead('prod','supply-15');assert.equal(updates,1);
 const refreshed=makeWindow();vm.runInNewContext(code,{window:refreshed,localStorage});
 assert.equal(refreshed.EvaProjectReminderDemo.count('prod'),1);
});
