import {loadIdentityEnvironment} from './helpers/identity-environment.mjs';
import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import {readFileSync,existsSync} from 'node:fs';
function setup(saved){
 const window={EvaAIIdentity:{projectAgentAppearance:()=>({markerKind:'bot'})},EvaAvatar:{personUri:id=>'avatar:'+id},__EVA_CURRENT_USER_PORTRAIT:'me',__EVA_COLLEAGUE_PORTRAIT:'eva'};
 loadIdentityEnvironment(window);vm.runInNewContext(readFileSync('prototype/009-2-membership.js','utf8'),{window});
 const store=window.EvaMembership.create(saved||{actorId:'me',people:[{id:'me',name:'本人'},{id:'a',name:'同名'},{id:'b',name:'同名'},{id:'gone',name:'已停用',active:false}],clones:[{id:'clone-a',ownerId:'a',name:'分身'}],projects:{p:{id:'p',name:'可见项目',humans:[{id:'me'}],cloneIds:[]},secret:{id:'secret',name:'不可见项目',humans:[],cloneIds:[]}}});
 const file='prototype/009-3-contact-identities.js';if(existsSync(file))vm.runInNewContext(readFileSync(file,'utf8'),{window});
 const team={getSnapshot:()=>({identities:[{id:'mine',role:'persona',name:'我的分身',configuration:{description:'简介'}},{id:'assistant',role:'assistant',name:'我的助理',configuration:{avatar:'custom-avatar',identity:'私有配置',description:'不应展示'}}]})},digital={get:id=>id==='staff'?{id,kind:'staff',name:'数字员工',ownership:'organization',scope:'org',desc:'岗位职责'}:null,hasInTeam:id=>id==='staff',appearance:()=>({ownerName:'组织'})};
 return {store,model:window.EvaContactIdentities?.create(store,{team,digital,ownerId:'me'})};
}
test('身份按 ID 解析，同名不会串人，自己与停用账号不提供发送',()=>{
 const {model}=setup();assert.ok(model,'缺少共享身份适配器');
 assert.equal(model.resolve('a').action.personId,'a');assert.equal(model.resolve('b').action.personId,'b');
 assert.equal(model.resolve('me').action,null);assert.equal(model.resolve('gone'),null);
});
test('分身所属人为真实主人，查看不授予他人分身私聊权限',()=>{
 const {model}=setup();assert.ok(model);
 const p=model.resolve('clone-a');assert.equal(p.owner.id,'a');assert.equal(p.action,null);
 assert.equal(model.resolve('mine').action.url,'/messages?evaIM=my-ai&evaIdentity=mine');
});
test('公共数字员工没有个人主人，沿用数字员工对话入口',()=>{
 const {model}=setup();assert.ok(model);const p=model.resolve('staff');
 assert.equal(p.kind,'employee');assert.equal(p.owner,null);assert.equal(p.action.url,'/messages?evaIM=my-ai&evaIdentity=staff');
});
test('项目管理专员不开放私聊，不泄漏无权限项目名称',()=>{
 const {model}=setup();assert.ok(model);
 const p=model.resolve('project-agent:p');assert.equal(p.kind,'project-agent');assert.equal(p.owner,null);assert.equal(p.project.name,'可见项目');assert.equal(p.action.url,'/collab?evaProject=p');
 assert.equal(model.resolve('project-agent:secret'),null);
});
test('私聊按账号 ID 复用，消息持久于业务状态并按操作者隔离',()=>{
 const {store}=setup();assert.equal(typeof store.openDirect,'function');
 const a=store.openDirect('me','a');assert.equal(store.openDirect('me','a'),a);assert.notEqual(store.openDirect('me','b'),a);
 store.sendDirect(a,'me','你好');assert.equal(store.directMessages('me')[a][0].text,'你好');
 assert.equal(store.directChannels('b').some(c=>c.id===a),false);assert.throws(()=>store.sendDirect(a,'b','越权'));assert.throws(()=>store.openDirect('me','gone'));
 const restored=setup(store.snapshot()).store;assert.equal(restored.directMessages('me')[a][0].text,'你好');assert.equal(restored.openDirect('a','me'),a);
});
test('私聊草稿隔离，发送只清空当前对话草稿',()=>{
 const {store}=setup();const a=store.openDirect('me','a'),b=store.openDirect('me','b');
 assert.equal(typeof store.setDirectDraft,'function');store.setDirectDraft(a,'me','待发 A');store.setDirectDraft(b,'me','待发 B');
 assert.equal(store.directDraft(a,'me'),'待发 A');store.sendDirect(a,'me','已发 A');assert.equal(store.directDraft(a,'me'),'');assert.equal(store.directDraft(b,'me'),'待发 B');
});

test('重复同步相同草稿不发布更新，避免路由挂载反复中断',()=>{
 const {store}=setup();const id=store.openDirect('me','a');let updates=0;store.subscribe(()=>updates++);
 store.setDirectDraft(id,'me','');assert.equal(updates,0);
 store.setDirectDraft(id,'me','草稿');store.setDirectDraft(id,'me','草稿');assert.equal(updates,1);
});

test('个人助理读取同一头像与名称，不泄漏配置或跨账号对话',()=>{
 const {store,model}=setup();const p=model.resolve('assistant');
 assert.equal(p.name,'我的助理');assert.equal(p.appearance.avatar,'custom-avatar');
 assert.equal(p.description,undefined);assert.equal(p.owner,null);
 assert.equal(p.action.url,'/messages?evaIM=my-ai&evaIdentity=assistant');
 store.setActor('a');assert.equal(model.resolve('assistant'),null);
});
test('资料卡不以分身旧简介或管家固定说明补充资料，员工保留已有简介',()=>{
 const {model}=setup();assert.equal(model.resolve('mine').description,undefined);
 assert.equal(model.resolve('project-agent:p').description,undefined);
 assert.equal(model.resolve('staff').description,'岗位职责');
});
