import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import {readFileSync} from 'node:fs';
import {loadIdentityEnvironment} from './helpers/identity-environment.mjs';
function setup(){
 const window={};loadIdentityEnvironment(window);
 vm.runInNewContext(readFileSync('prototype/009-2-membership.js','utf8'),{window});
 const store=window.EvaMembership.create({people:['owner','member','other','outsider'].map(id=>({id,name:id}))});
 store.createGroup('g','群',null,'owner',[]);store.addMember('g','owner','member');store.addMember('g','owner','other');
 return store;
}
test('普通成员创建子区，继承全部父群成员并写入稳定创建记录',()=>{
 const store=setup();store.createThread('t','g',{name:'  合同复核  ',status:1,creator_id:'owner'},'member');
 assert.equal(store.snapshot().threadDetails.t.name,'合同复核');assert.equal(store.snapshot().threadDetails.t.creator_id,'member');
 for(const id of ['owner','member','other'])assert.equal(store.canRead('t',id),true);
 assert.equal(store.canRead('t','outsider'),false);assert.throws(()=>store.createThread('bad','g',{name:'越权'},'outsider'));
 const record=store.messagesFor('g','owner').find(m=>m.kind==='threadcreated');assert.equal(record.thread.id,'t');assert.equal(record.sender.uid,'member');
 store.updateThread('t',{name:'合同条款复核'},'member');assert.equal(store.messagesFor('g','owner')[0].thread.id,'t');
 store.leaveGroup('g','member');assert.equal(store.canRead('t','member'),false);assert.throws(()=>store.updateThread('t',{name:'离群后修改'},'member'));
});
test('同群名称去首尾空格后判重，归档占名、跨群可同名、查询不暴露内部引用',()=>{
 const store=setup();store.createThread('t','g',{name:'合同复核',status:1},'member');
 assert.throws(()=>store.createThread('dup','g',{name:' 合同复核 '},'other'),/同名/);
 store.updateThread('t',{status:2},'member');assert.throws(()=>store.createThread('dup','g',{name:'合同复核'},'other'),/同名/);
 assert.throws(()=>store.createThread('blank','g',{name:'  '},'member'));assert.throws(()=>store.createThread('reserved','g',{name:'主聊天'},'member'));
 store.createGroup('g2','另一个群',null,'member',[]);store.createThread('t2','g2',{name:'合同复核'},'member');
 const conflict=store.threadNameConflict('g','合同复核');conflict.name='外部修改';assert.equal(store.snapshot().threadDetails.t.name,'合同复核');
});
test('创建者和群管理员可治理，其余成员只能参与，不能篡改创建者',()=>{
 const store=setup();store.createThread('t','g',{name:'讨论'},'member');
 assert.equal(store.canManageThread('t','other'),false);assert.throws(()=>store.updateThread('t',{status:2},'other'));
 store.updateThread('t',{creator_id:'other'},'other');assert.equal(store.canManageThread('t','other'),false);
 store.setGroupManager('g','owner','other',true);assert.equal(store.canManageThread('t','other'),true);store.updateThread('t',{status:2},'other');
});
function demo(saved){
 const values=new Map(saved?[['eva:project-members:v1',saved]]:[]),window={localStorage:{getItem:key=>values.get(key)||null,setItem:(key,v)=>values.set(key,v)}};
 loadIdentityEnvironment(window);for(const f of ['009-0-demo-time.js','009-1-data-drive.js','009-2-data-supply.js','009-3-data-im.js','009-2-membership.js'])vm.runInNewContext(readFileSync('prototype/'+f,'utf8'),{window});
 const people=[{uid:'u-wangyilin',name:'王宜林'},{uid:'u-hejing',name:'何静'},{uid:'u-linxiao',name:'林晓'}];
 const channels={prod:[{id:'c-weekly',name:'合规与合同',threads:[{id:'th-vendor-onboarding',name:'新供应商准入复核',status:1},{id:'th-contract-renewal',name:'到期采购合同续签',status:1}]}]};
 const store=window.EvaMembership.bootstrap(people,[{id:'prod',name:'供应链运营协同',members:people}],channels);
 return {store,saved:()=>values.get('eva:project-members:v1')};
}
test('旧式子区也有完整创建记录和独立材料，AI 回应必须承接本子区明确请求，刷新保留用户内容',()=>{
 const first=demo(),s=first.store,records=s.messagesFor('c-weekly','u-wangyilin').filter(m=>m.kind==='threadcreated');
 assert.equal(records.length,3);assert.equal(new Set(records.map(m=>m.thread.id)).size,3);
 for(const record of records){const messages=s.messagesFor(record.thread.id,'u-wangyilin');const aiIndex=messages.findIndex(m=>m.sender.ai||m.sender.kind==='project-agent');assert.ok(aiIndex>0);assert.match(messages[aiIndex-1].text,/请仅根据本子区/);assert.ok(messages[aiIndex-1].text.includes('@'+messages[aiIndex].sender.name));assert.equal(s.canRead(record.thread.id,record.sender.uid),true);}
 assert.match(s.messagesFor('th-vendor-onboarding','u-wangyilin').map(m=>m.text).join('\n'),/授权书缺签章/);
 assert.match(s.messagesFor('th-contract-renewal','u-wangyilin').map(m=>m.text).join('\n'),/提价 3%/);
 s.sendMessage('c-weekly','u-wangyilin','用户自建记录');s.updateThread('th-vendor-onboarding',{name:'用户修改名称'},'u-wangyilin');
 const second=demo(first.saved()).store;assert.equal(second.messagesFor('c-weekly','u-wangyilin').filter(m=>m.kind==='threadcreated').length,3);assert.ok(second.messagesFor('c-weekly','u-wangyilin').some(m=>m.text==='用户自建记录'));assert.equal(second.snapshot().threadDetails['th-vendor-onboarding'].name,'用户修改名称');
});

test('所有群的存量子区都有唯一创建记录，覆盖项目群、非项目群及隐藏归档，刷新不重复',()=>{
 const first=demo(),state=first.store.snapshot();let count=0;
 for(const [id,gid] of Object.entries(state.threads)){
  const topic=state.threadDetails[id];if(!topic?.name||topic.deleted)continue;
  assert.equal((state.messages[gid]||[]).filter(m=>m.kind==='threadcreated'&&m.thread?.id===id).length,1,gid+'/'+id);count++;
 }
 assert.equal(state.groups['supply-many-topics-demo'],undefined,'已下线的横向导航演示群不再预置');
 assert.ok(count>=3,'现有项目群和非项目群子区均被覆盖');
 const second=demo(first.saved()).store.snapshot();
 for(const [gid,messages] of Object.entries(state.messages))assert.equal((second.messages[gid]||[]).filter(m=>m.kind==='threadcreated').length,messages.filter(m=>m.kind==='threadcreated').length,gid);
});

test('下线横向导航演示只清理原样夹具，用户消息使整群保留',()=>{
 const makeSaved=custom=>{const state=demo().store.snapshot(),groupId='supply-many-topics-demo';
  const names=['采购需求归集','供应商询价比价','招投标文件评审','合同条款确认','供应商准入复核','关键件交期跟踪','来料异常复核','供应商整改跟踪','排产齐套确认','运输窗口协调','紧急保供协调','下季度核心供应商产能保障与跨区域交付计划联合评审及风险确认'];
  state.groups[groupId]={id:groupId,name:'供应链专题协同（多子区演示）',projectId:'prod',ownerId:'u-wangyilin',humans:[{id:'u-wangyilin',role:'member'}],cloneIds:[]};
  state.messages[groupId]=[{fixtureId:'many-topics-v1:'+groupId,kind:'text',text:'演示'}];
  names.forEach((name,index)=>{const number=index<10?index+1:index===10?18:24,id='supply-many-topic-'+String(number).padStart(2,'0');state.threads[id]=groupId;state.threadDetails[id]={id,name,status:1};state.messages[id]=[{fixtureId:'many-topics-v1:'+id,kind:'text',text:'演示'}];});
  if(custom)state.messages['supply-many-topic-01'].push({kind:'text',text:'用户补充'});
  return JSON.stringify(state);
 };
 assert.equal(demo(makeSaved(false)).store.snapshot().groups['supply-many-topics-demo'],undefined,'原样夹具被清理');
 const preserved=demo(makeSaved(true)).store.snapshot();assert.ok(preserved.groups['supply-many-topics-demo']);assert.ok(preserved.messages['supply-many-topic-01'].some(message=>message.text==='用户补充'));
});

test('子区免打扰保留父群继承与单项覆盖',()=>{
 const store=setup();
 for(const id of ['a','b'])store.createThread(id,'g',{name:id,status:1},'owner');
 store.setChatPreferences('g','owner',{mute:true});assert.equal(store.conversationMuted('a','owner'),true);
 store.setChatPreferences('a','owner',{mute:false});assert.equal(store.conversationMuted('a','owner'),false);assert.equal(store.conversationMuted('b','owner'),true);
 store.setChatPreferences('g','owner',{mute:false});store.setChatPreferences('a','owner',{mute:true});assert.equal(store.conversationMuted('a','owner'),true);
 store.setChatPreferences('a','owner',{mute:null});assert.equal(store.conversationMuted('a','owner'),false,'可恢复继承');
});

test('最近隐藏按父群和子区各自消息计数，互不唤回',()=>{
 const store=setup();store.createThread('t','g',{name:'讨论',status:1},'owner');
 store.hideRecentConversation('g','owner');assert.throws(()=>store.hideRecentConversation('t','owner'),/子区/);
 assert.equal(store.recentConversationHidden('g','owner'),true);assert.equal(store.recentConversationHidden('t','owner'),false);
 store.sendMessage('t','member','子区新消息');
 assert.equal(store.recentConversationHidden('g','owner'),true,'子区消息不能唤回父群会话行');
 assert.equal(store.recentConversationHidden('t','owner'),false,'子区始终不走最近隐藏旁路');
});
