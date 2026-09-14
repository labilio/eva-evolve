import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import {readFileSync} from 'node:fs';
const window={};vm.runInNewContext(readFileSync('prototype/009-3-ai-team-store.js','utf8'),{window,setTimeout,clearTimeout});
const members=[{id:'u-wangyilin',name:'王宜林',kind:'human'},{id:'persona',name:'执剑人',kind:'ai-direct'},{id:'assistant',name:'通用助理',kind:'ai-direct'},{id:'employee',name:'数字员工',kind:'ai-direct'}];
test('fixed group derives all member kinds without duplicates and isolates history',()=>{
 const group=window.EvaMyAITeamGroup.createStore({storage:null});
 const source=group.source([...members,members[1]]),channel=source.channels[0];
 assert.equal(channel.name,'我的 OPT');assert.equal(channel.members,4);assert.equal(channel.channel_type,2);
 assert.equal(channel.replyPolicy,'mention-only');assert.equal(channel.memberIds.join(','),members.map(m=>m.id).join(','));
 source.onSend('普通群消息');assert.equal(group.source(members).messages[group.id].length,1);
 source.onSend('@通用助理 请整理');let history=group.source(members).messages[group.id];assert.equal(history.length,3);assert.equal(history[2].sender.uid,'assistant');
 const next=group.source([...members,{id:'new-assistant',name:'新助理',kind:'ai-direct'}]);assert.equal(next.channels[0].members,5);assert.equal(next.messages[group.id].length,3);
 const ai=window.EvaAITeam.getSnapshot();assert.ok(ai.sessions.every(s=>s.messages.every(m=>m.text!=='普通群消息')));
});
test('fixed group retains its channel, messages and draft after reload',()=>{
 let saved;const storage={getItem:()=>saved,setItem:(_,v)=>{saved=v;}};
 const group=window.EvaMyAITeamGroup.createStore({storage});group.source(members).onSend('群记录');group.source(members).onDraftChange('未发送草稿');
 const restored=window.EvaMyAITeamGroup.createStore({storage});assert.equal(restored.id,group.id);const source=restored.source(members);
 assert.equal(source.initialDraft,'未发送草稿');assert.equal(source.messages[group.id][0].text,'群记录');
});
test('legacy default group name is normalized while custom team names are retained',()=>{
 const saved=JSON.stringify({schemaVersion:2,groups:[
  {id:'my-ai-team:u-wangyilin',name:'我的 AI',system:true,messages:[],draft:'',threads:[]},
  {id:'my-ai-group:legacy',name:'原有团队',system:false,memberIds:['assistant'],messages:[],draft:'',threads:[]}
 ]});
 const storage={getItem:key=>key==='eva:my-ai-groups:v2'?saved:null,setItem:()=>{}};
 const group=window.EvaMyAITeamGroup.createStore({storage});
 assert.equal(group.get(group.id).name,'我的 OPT');assert.equal(group.get('my-ai-group:legacy').name,'原有团队');
});
test('group and subzones isolate messages and drafts across reloads',()=>{
 let saved;const storage={getItem:()=>saved,setItem:(_,v)=>{saved=v;}};
 const group=window.EvaMyAITeamGroup.createStore({storage});
 group.source(members).onSend('父群内容');group.source(members).onDraftChange('父群草稿');
 const a=group.createThread({id:'topic-a',name:'采购讨论'}),b=group.createThread({id:'topic-b',name:'质量讨论'});
 const source=group.source(members,a);source.onSend('@通用助理 采购问题',a);source.onDraftChange('采购草稿',a);source.onSend('质量问题',b);source.onDraftChange('质量草稿',b);
 const restored=window.EvaMyAITeamGroup.createStore({storage}),view=restored.source(members,a);
 assert.equal(view.selectedThreadId,a);assert.equal(view.channels[0].threads[0].group_no,group.id);assert.equal(view.channels[0].threads[0].channel_type,5);
 assert.equal(view.messages[group.id].length,1);assert.equal(view.threadMessages[a].length,2);assert.equal(view.threadMessages[b].length,1);
 assert.equal(view.getDraft(group.id),'父群草稿');assert.equal(view.getDraft(a),'采购草稿');assert.equal(view.getDraft(b),'质量草稿');
 restored.updateThread(a,{name:'采购报价',status:2});assert.equal(restored.source(members).channels[0].threads[0].name,'采购报价');
 restored.updateThread(a,{deleted:true});assert.equal(restored.source(members).channels[0].threads.length,1);assert.throws(()=>restored.source(members).onSend('越界','unknown'));
 assert.equal(restored.source(members).threadMessages[b][0].text,'质量问题');
});
test('custom AI teams keep a member snapshot and isolate group data',()=>{
 let saved;const storage={getItem:()=>saved,setItem:(_,value)=>{saved=value;}};
 const group=window.EvaMyAITeamGroup.createStore({storage});
 const customId=group.createGroup({name:'产品发布组',avatar:'https://example.test/team.png',memberIds:['assistant','employee']});
 const first=group.source(customId,members),channel=first.channels[0];
 assert.equal(channel.name,'产品发布组');assert.equal(channel.identityAvatarUrl,'https://example.test/team.png');
 assert.equal(channel.memberIds.join(','),'u-wangyilin,assistant,employee');
 const withNewMember=group.source(customId,[...members,{id:'new-assistant',name:'新助理',kind:'ai-direct'}]);
 assert.equal(withNewMember.channels[0].memberIds.includes('new-assistant'),false);
 first.onSend('@通用助理 准备发布');first.onDraftChange('团队草稿');
 assert.equal(group.source(members).messages[group.id].length,0);
 const restored=window.EvaMyAITeamGroup.createStore({storage});
 assert.equal(restored.source(customId,members).initialDraft,'团队草稿');
 assert.equal(restored.source(customId,members).messages[customId].length,2);
 restored.updateGroup(customId,{name:'上市协作组',memberIds:['persona']});
 assert.equal(restored.source(customId,members).channels[0].name,'上市协作组');
 assert.equal(restored.source(customId,members).channels[0].memberIds.join(','),'u-wangyilin,persona');
 assert.throws(()=>restored.updateGroup(restored.id,{name:'不可修改'}),/默认团队不可编辑/);
 assert.throws(()=>restored.createGroup({name:'空团队',memberIds:[]}),/至少选择/);
});
test('team groups expose exact child unread counts and aggregate only unread presence',()=>{
 let saved;const storage={getItem:()=>saved,setItem:(_,value)=>{saved=value;}};
 const group=window.EvaMyAITeamGroup.createStore({storage});
 const customId=group.createGroup({name:'未读验证组',memberIds:['assistant']});
 const threadId=group.createThread(customId,{id:'status',name:'状态更新'});
 const state=JSON.parse(saved),record=state.groups.find(item=>item.id===customId),thread=record.threads.find(item=>item.id===threadId);
 record.messages=[{id:'group-ai',sender:{uid:'assistant',name:'通用助理',ai:true},text:'团队消息'}];
 record.readAiMessageCount=0;record.teamUnreadNotificationsV1=true;
 thread.messages=[
  {id:'thread-ai-1',sender:{uid:'assistant',name:'通用助理',ai:true},text:'第一条'},
  {id:'thread-user',sender:{uid:'u-wangyilin',name:'王宜林'},text:'收到'},
  {id:'thread-ai-2',sender:{uid:'assistant',name:'通用助理',ai:true},text:'第二条'}
 ];
 thread.readAiMessageCount=1;saved=JSON.stringify(state);
 const restored=window.EvaMyAITeamGroup.createStore({storage}),source=restored.source(customId,members,threadId);
 assert.equal(source.channels[0].unread,1);assert.equal(source.channels[0].threads[0].unread,1);
 assert.equal(restored.unreadCount(customId,threadId),1);assert.equal(restored.hasUnread(customId),true);assert.equal(restored.hasUnread(),true);
 assert.equal(restored.markRead(customId,customId),true);assert.equal(restored.hasUnread(customId),true);
 assert.equal(restored.markRead(customId,threadId),true);assert.equal(restored.markRead(customId,threadId),false);assert.equal(restored.hasUnread(customId),false);
 restored.source(customId,members,threadId).onSend('@通用助理 继续',threadId);
 assert.equal(restored.unreadCount(customId,threadId),0);
 const reloaded=window.EvaMyAITeamGroup.createStore({storage});assert.equal(reloaded.hasUnread(customId),false);
});
test('forwarded AI content is authored by the current user and does not create team unread',()=>{
 let saved;const storage={getItem:()=>saved,setItem:(_,value)=>{saved=value;}};
 const group=window.EvaMyAITeamGroup.createStore({storage}),threadId=group.createThread({id:'forward',name:'转发'});
 group.receiveForwarded(threadId,[{id:'forwarded-ai',kind:'text',sender:{uid:'assistant',name:'通用助理',ai:true},time:'10:00',text:'转发内容'}]);
 assert.equal(group.unreadCount(group.id,threadId),0);
 const message=group.source(members,threadId).threadMessages[threadId].at(-1);
 assert.equal(message.sender.uid,'self');assert.equal(message.sender.ai,false);
});
