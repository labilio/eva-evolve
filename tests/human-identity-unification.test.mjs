import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import {readFileSync, readdirSync} from 'node:fs';
import {loadIdentityEnvironment} from './helpers/identity-environment.mjs';
function setup(saved){
  const storage=new Map(saved?[['eva:project-members:v1',JSON.stringify(saved)]]:[]);
  const window={__EVA_CURRENT_USER_PORTRAIT:'current.png',__EVA_COLLEAGUE_PORTRAIT:'eva.png',localStorage:{getItem:k=>storage.get(k)??null,setItem:(k,v)=>storage.set(k,v)}};
  loadIdentityEnvironment(window);
  const context={window,jdenticon:{toSvg:id=>'<svg>'+id+'</svg>'}};
  for(const file of ['009-0-demo-time.js','009-1-data-drive.js','009-2-data-supply.js','009-3-data-im.js','014-avatar.js','009-2-membership.js','009-3-contact-identities.js'])vm.runInNewContext(readFileSync('prototype/'+file,'utf8'),context);
  const store=window.EvaMembership.bootstrap(window.__EVA_PEOPLE,[],{},[]);
  const model=window.EvaContactIdentities.create(store,{team:{getSnapshot:()=>({identities:[]})}});
  return {window,store,model,storage};
}
test('完整人类目录覆盖所有演示消息作者及提及，ID 唯一且不靠五人白名单',()=>{
  const {window,model}=setup(),ids=new Set(window.__EVA_PEOPLE.map(p=>p.id));
  assert.equal(ids.size,window.__EVA_PEOPLE.length);
  window.__EVA_MEMBER_DEMO_IDS=['u-wangyilin']; // An old browser flag cannot hide registered people.
  assert.equal(model.directory().length,ids.size);
  for(const id of ['u-qinshu','u-kangzhixi','u-weishao'])assert.ok(model.directory().some(row=>row.person.id===id));
  function walk(value){
    if(!value||typeof value!=='object')return;
    if(value.uid?.startsWith('u-'))assert.ok(ids.has(value.uid),'未登记身份 '+value.uid);
    Object.values(value).forEach(walk);
  }
  walk(window.__EVA_IM_DEMO);
});

test('全部浏览器运行时引用的人类 ID 均登记到公共通讯录',async()=>{
  const {window}=setup(),registered=new Set(window.__EVA_PEOPLE.map(person=>person.id));
  const {createPatchedRuntime}=await import('../tools/build-runtime.mjs');
  const sources=[
    ['构建后的兼容运行时',createPatchedRuntime().source],
    ...readdirSync('prototype')
      .filter(file=>file.endsWith('.js')&&!/^009-[4-8]-/.test(file))
      .map(file=>['prototype/'+file,readFileSync('prototype/'+file,'utf8')]),
  ];
  for(const [file,source] of sources){
    const references=[...source.matchAll(/["'](u-[a-z0-9][a-z0-9-]*)["']/g)].map(match=>match[1]);
    for(const id of references)assert.ok(registered.has(id),file+' 引用了通讯录未登记的人类身份 '+id);
  }
  assert.doesNotMatch(sources[0][1],/u-director-wang|供应链负责人王总/);
});
test('同一人从预置私聊、双方新私聊和通讯录获得相同头像；同名账号不合并',()=>{
  const {window,store,model}=setup();
  for(const person of store.people()){
    const expected=model.resolve(person.id).avatar;
    assert.equal(window.EvaAvatar.conversationUri({id:'dm-arbitrary',personId:person.id,identityAvatarUrl:'stale.png'}),expected);
    if(person.id==='u-wangyilin')continue;
    const id=store.openDirect('u-wangyilin',person.id);
    assert.equal(window.EvaAvatar.conversationUri(store.directChannels('u-wangyilin').find(c=>c.id===id)),expected);
    assert.equal(window.EvaAvatar.conversationUri(store.directChannels(person.id).find(c=>c.id===id)),model.resolve('u-wangyilin').avatar);
  }
  assert.notEqual(window.EvaAvatar.personUri('u-qinshu'),window.EvaAvatar.personUri('u-kangzhixi'));
  assert.equal(window.EvaAvatar.conversationUri({id:'group',identityAvatarUrl:'custom-group.png'}),'custom-group.png');
});
test('旧数据只增补档案，保留停用、自定义头像、退出关系、消息和草稿，重复加载幂等',()=>{
  const saved={schema:2,actorId:'u-wangyilin',people:[{id:'u-wangyilin',name:'王宜林',avatar:'custom-me.png'},{id:'u-qinshu',name:'本地姓名',active:false,avatar:'custom-qin.png'}],clones:[],projects:{p:{id:'p',name:'项目',ownerId:'u-wangyilin',humans:[{id:'u-wangyilin',role:'owner'}],cloneIds:[]}},groups:{},threads:{},messages:{},directConversations:{'dm-qinshu':{id:'dm-qinshu',memberIds:['u-wangyilin','u-qinshu'],messages:[{sender:{uid:'u-qinshu'},text:'保留历史'}],drafts:{'u-wangyilin':'保留草稿'}}}};
  const {store,window,storage}=setup(saved);
  assert.equal(store.person('u-qinshu'),undefined);
  assert.equal(store.personRecord('u-qinshu').name,'本地姓名');
  assert.equal(window.EvaAvatar.personUri('u-qinshu'),'custom-qin.png');
  assert.equal(window.EvaAvatar.personUri('u-wangyilin'),'custom-me.png');
  assert.equal(store.snapshot().projects.p.humans.length,1);
  assert.equal(store.canRead('p','u-kangzhixi'),false);
  assert.equal(store.directDraft('dm-qinshu','u-wangyilin'),'保留草稿');
  assert.equal(store.directMessages('u-wangyilin')['dm-qinshu'][0].text,'保留历史');
  const again=setup(JSON.parse(storage.get('eva:project-members:v1')));
  assert.deepEqual(JSON.parse(JSON.stringify(again.store.snapshot())),JSON.parse(JSON.stringify(store.snapshot())));
});
test('目录、候选和写入共用账号资格，外部、未激活和停用身份不能获得成员权限',()=>{
  const {window}=setup();
  const store=window.EvaMembership.create({actorId:'me',people:[{id:'me'},{id:'ok'},{id:'inactive',active:false},{id:'external',internal:false},{id:'pending',activated:false},{id:'bot',ai:true}],projects:{p:{id:'p',ownerId:'me',humans:[{id:'me'}],cloneIds:[]}}});
  assert.equal(store.people().map(p=>p.id).join(','),'me,ok');
  for(const id of ['inactive','external','pending','bot'])assert.throws(()=>store.openDirect('me',id));
  assert.equal(store.candidates('p','me').map(p=>p.id).join(','),'ok');
});

test('构建后的最近、关注、标题使用会话身份；真实消息适配使用同一人员头像',async()=>{
  const {createPatchedRuntime}=await import('../tools/build-runtime.mjs');
  const {source}=createPatchedRuntime();
  for(const channel of ['ci.ch','ci','Sa'])assert.ok(source.includes('window.EvaAvatar.conversationUri('+channel+')'));
  assert.doesNotMatch(source,/EvaAvatar\.uri\(\{kind:[^}]{0,100}startsWith\("dm-"\)\?"person"/);
  const {window}=setup();
  const begin=source.indexOf('rowProps=(rt,ct,evaActorId)=>('),end=source.indexOf(',FileDriveIcon=',begin);
  assert.ok(begin>0&&end>begin);
  const rowProps=vm.runInNewContext(source.slice(begin+'rowProps='.length,end),{window,avatarUri:id=>window.EvaAvatar.personUri(id)});
  const message={sender:{uid:'u-qinshu',name:'秦漱'}};
  assert.equal(rowProps(message,false,'u-qinshu').isSend,true);
  assert.equal(rowProps(message,false,'u-wangyilin').isSend,false);
  assert.equal(rowProps(message,false).isSend,false);
  assert.equal(rowProps(message,false).avatarUrl,window.EvaAvatar.conversationUri({id:'dm-qinshu',personId:'u-qinshu'}));
});
