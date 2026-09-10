import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import {readFileSync} from 'node:fs';
import {webcrypto} from 'node:crypto';
const source=readFileSync(new URL('../prototype/009-3-digital-employees-store.js',import.meta.url),'utf8');
const aiTeamSource=readFileSync(new URL('../prototype/009-3-ai-team-store.js',import.meta.url),'utf8');
function load(saved,seedOverrides={}){
  let persisted=saved?JSON.stringify(saved):null;
  class FixedDate extends Date {constructor(...args){super(...(args.length?args:['2026-09-06T12:00:00.000Z']));}}
  const defaultSeed={businessDomains:['供应链','研发域'],agents:[{id:'staff-1',kind:'staff',name:'专家',ownership:'organization'},{id:'project-1',kind:'team',name:'项目助手'}],runtimes:[{key:'dify'}]};
  const window={crypto:webcrypto,__EVA_DIGITAL_EMPLOYEES_DATA:{...defaultSeed,...seedOverrides},localStorage:{getItem:key=>key==='eva:digital-employees:v1'?persisted:null,setItem:(key,value)=>{if(key==='eva:digital-employees:v1')persisted=value;}}};
  const context=vm.createContext({window,structuredClone,Date:FixedDate});
  vm.runInContext(aiTeamSource,context);
  vm.runInContext(source,context);
  return {store:window.EvaDigitalEmployeesStore,saved:()=>JSON.parse(persisted)};
}
test('membership is explicit, duplicate-safe, persistent and removal preserves messages',()=>{
  const {store,saved}=load();store.send('staff-1','消息');assert.equal(store.teamIds().length,0);
  assert.equal(store.addToTeam('staff-1'),true);assert.equal(store.addToTeam('staff-1'),false);
  assert.throws(()=>store.addToTeam('project-1'));store.removeFromTeam('staff-1');
  const restored=load(saved()).store;assert.equal(restored.teamIds().length,0);assert.equal(restored.chat('staff-1').messages[0].text,'消息');
});
test('legacy migration preserves messages, draft and stable session id across refresh',()=>{
  const {store,saved}=load({chats:{'staff-1':{messages:[{sender:{uid:'u-wangyilin'},text:'历史消息'}],draft:'历史草稿'}}});
  const session=store.sessions('staff-1')[0];assert.equal(session.title,'历史消息');assert.equal(store.chat('staff-1').draft,'历史草稿');
  store.addToTeam('staff-1');assert.equal(load(saved()).store.sessions('staff-1')[0].id,session.id);
});
test('independent sessions keep drafts, title, pinning and deleted callbacks isolated',()=>{
  const {store}=load();const first=store.createSession('staff-1'),second=store.createSession('staff-1');
  const a=store.conversationSource('staff-1',first),b=store.conversationSource('staff-1',second);
  assert.equal(a.channels[0].chatType,'group');
  assert.equal(a.channels[0].memberIds.length,2);
  assert.equal(a.channels[0].replyPolicy,'direct-only');
  assert.equal(a.presentation,'ai-direct');
  assert.notEqual(a.selectedThreadId,b.selectedThreadId);
  assert.equal(a.channels[0].threads.find(t=>t.id===a.selectedThreadId).channel_type,5);
  a.onDraftChange('草稿 A');b.onDraftChange('草稿 B');a.onSend('会话 A');
  assert.equal(store.conversationSource('staff-1',second).initialDraft,'草稿 B');
  assert.equal(store.sessions('staff-1').find(s=>s.id===first).title,'会话 A');
  store.setSessionFlag('staff-1',first,'pinned',true);assert.equal(store.sessions('staff-1')[0].id,first);
  store.deleteSession('staff-1',first);assert.equal(store.conversationSource('staff-1',first),null);assert.throws(()=>a.onSend('不能恢复已删会话'));
  assert.equal(store.sessions('staff-1').length,1);
});
test('market compatibility chooses newly created session even in the same millisecond',()=>{
  const {store}=load();store.createSession('staff-1');const newest=store.createSession('staff-1');
  store.setDraft('staff-1','给最新会话');assert.equal(store.conversationSource('staff-1',newest).initialDraft,'给最新会话');
});
test('creation preserves configuration and draft data without aliasing caller objects',()=>{
  const {store,saved}=load();const draft={name:'接入专家',skills:['分析'],conn:['mcp-1'],publication:'org',description:'专家说明'};
  store.saveDraft('dify',draft);draft.skills.push('后续修改');assert.equal(store.draft('dify').skills.length,1);
  const created=store.create('dify',draft);draft.name='外部更改';
  const restored=load(saved()).store;assert.equal(restored.get(created.id).name,'接入专家');assert.equal(restored.get(created.id).scope,'org');assert.equal(restored.get(created.id).configuration.conn[0],'mcp-1');assert.equal(restored.draft('dify'),undefined);
});

test('all digital employee names use the expert suffix for seeds, saved state and new records',()=>{
  const savedState={agents:[{id:'saved',kind:'staff',name:'客服专员专家-吉利'},{id:'old-copy',kind:'staff',name:'取数小工专家'}],drafts:{},personaRequests:[],chats:{},teamIds:[]};
  const {store}=load(savedState);
  assert.equal(store.get('saved').name,'客服专员-吉利专家');
  assert.equal(store.get('old-copy').name,'数据提取专家');
  const created=store.create('dify',{name:'会议纪要清洗'});
  assert.equal(created.name,'会议纪要专家');
});

test('HR onboarding employee and rich file conversation migrate once for existing users',()=>{
  const baseAgents=[{id:'staff-1',kind:'staff',name:'专家',ownership:'organization'},{id:'project-1',kind:'team',name:'项目助手'}];
  const hr={id:'a_hr_onboarding',kind:'staff',name:'HR 助手',ownership:'organization',presence:'online'};
  const story={title:'入职第一周 onboarding',updatedAt:'2026-09-09T09:19:00+08:00',messages:[
    {id:'hr-user',kind:'text',from:'user',time:'09:08',text:'我今天刚入职，接下来要做什么？'},
    {id:'hr-ai',kind:'text',from:'ai',time:'09:09',text:'## 欢迎加入\n\n- [ ] 开通权限'},
    {id:'hr-file',kind:'file',from:'ai',time:'09:10',file:{id:'attachment:hr',name:'新员工入职清单.md',size:1271,extension:'md',previewUrl:'prototype/assets/file-samples/新员工入职清单-研发效能组.md'}}
  ]};
  const oldState={agents:baseAgents,drafts:{},personaRequests:[],chats:{},teamIds:[],professionalDemoV1:true,compactDemoV1:true};
  const overrides={agents:[...baseAgents,hr],demoConversations:{a_hr_onboarding:[story]}};
  const {store,saved}=load(oldState,overrides);
  assert.equal(store.get(hr.id).name,'HR 入职服务专家');
  assert.equal(store.teamIds()[0],hr.id);
  const sessions=store.sessions(hr.id);
  assert.equal(sessions.length,1);
  assert.equal(sessions[0].title,story.title);
  const source=store.conversationSource(hr.id,sessions[0].id);
  const messages=source.threadMessages[source.selectedThreadId];
  assert.match(messages[1].text,/## 欢迎加入/);
  assert.equal(messages[2].kind,'file');
  assert.equal(messages[2].sender.uid,hr.id);
  assert.equal(messages[2].file.extension,'md');
  const restored=load(saved(),overrides).store;
  assert.equal(restored.sessions(hr.id).length,1);
});

test('cloud persona application remains pending and private after reload without activating an agent',()=>{
 const {store,saved}=load(),before=store.agents().length;
 assert.throws(()=>store.submitPersonaRequest('u1',{name:'采购分身',domain:'任意输入'}));
 const request=store.submitPersonaRequest('u1',{name:'采购分身',domain:'供应链',skills:['资料整理'],prompt:'采购协作',runtimeEndpoint:'legacy'});
 assert.equal(request.status,'pending');assert.equal(request.configuration.runtimeEndpoint,undefined);
 assert.equal(store.agents().length,before);assert.equal(store.teamIds().length,0);
 assert.throws(()=>store.submitPersonaRequest('u1',{name:'采购分身',domain:'供应链'}));
 const restored=load(saved()).store;assert.equal(restored.personaRequests('u1')[0].configuration.prompt,'采购协作');assert.equal(restored.personaRequests('u2').length,0);
});
