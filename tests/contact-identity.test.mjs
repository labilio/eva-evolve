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

test('回复快照随群聊和私聊消息保留，跨会话引用失败且不清空草稿',()=>{
 const {store}=setup();const direct=store.openDirect('me','a');
 const reply={conversationId:direct,messageId:'original-1',fromName:'同名',digest:'第一行\n第二行'};
 store.sendDirect(direct,'me','回复正文',reply);reply.digest='外部修改';
 assert.equal(store.directMessages('me')[direct][0].replyTo.digest,'第一行\n第二行');
 const restored=setup(store.snapshot()).store;assert.equal(restored.directMessages('me')[direct][0].replyTo.messageId,'original-1');
 store.setDirectDraft(direct,'me','保留草稿');assert.throws(()=>store.sendDirect(direct,'me','错误回复',{...reply,conversationId:'other'}));assert.equal(store.directDraft(direct,'me'),'保留草稿');
 store.sendMessage('all:p','me','群回复',{conversationId:'all:p',messageId:'group-original',fromName:'本人',digest:'群消息'});
 assert.equal(store.messagesFor('all:p','me').at(-1).replyTo.messageId,'group-original');
 assert.throws(()=>store.sendMessage('all:p','me','错误',{...reply,conversationId:direct}));
});

test('转发按顺序保留文本与附件，批次失败不部分写入且不触发 AI 回执',()=>{
 const {store}=setup();const direct=store.openDirect('me','a');
 const messages=[{kind:'text',text:'@所有人 **转发原文**\n第二行'},{kind:'file',file:{id:'file-1',name:'说明.md',size:12}}];
 const ids=store.forwardMessages(direct,'all:p','me',messages);
 const received=store.messagesFor('all:p','me');assert.equal(received.length,2);assert.equal(received[0].text,messages[0].text);assert.equal(received[1].file.name,'说明.md');assert.notEqual(ids[0],ids[1]);assert.equal(received[0].sender.uid,'me');
 messages[1].file.name='外部修改';assert.equal(store.messagesFor('all:p','me')[1].file.name,'说明.md');
 assert.throws(()=>store.forwardMessages(direct,'all:p','me',[messages[0],{kind:'system'}]));assert.equal(store.messagesFor('all:p','me').length,2);
 assert.throws(()=>store.forwardMessages(direct,'all:secret','me',messages));
 store.forwardMessages('all:p',direct,'me',[received[0]]);assert.equal(store.directMessages('me')[direct].at(-1).text,messages[0].text);
});

test('历史分身提及按稳定身份兼容旧名称，群和子区都返回提及实体',()=>{
 const {store}=setup({actorId:'me',people:[{id:'me',name:'王宜林'}],clones:[{id:'b-wangyilin',ownerId:'me',name:'王宜林的 AI 分身'}],projects:{p:{id:'p',name:'项目',humans:[{id:'me'}],cloneIds:['b-wangyilin']}},groups:{g:{id:'g',projectId:'p',humans:[{id:'me'}],cloneIds:['b-wangyilin']}},threads:{t:'g'},messages:{g:[{kind:'text',text:'@王宜林的分身 请整理'}],t:[{kind:'text',text:'@王宜林的分身 请整理'}]}});
 for(const id of ['g','t'])for(const message of [store.messagesFor(id,'me')[0],store.visibleMessages(id,'me',[{kind:'text',text:'@王宜林的分身 请整理'}])[0]]){assert.equal(message.text,'@王宜林的 AI 分身 请整理');assert.ok(message.mentions.some(m=>m.uid==='b-wangyilin'&&m.name==='@王宜林的 AI 分身'));}
});

test('身份渲染不复制全量聊天状态，切换账号后仍实时更新',()=>{
 const {store,model}=setup();
 const original=store.snapshot;
 store.snapshot=()=>{throw new Error('身份渲染不应读取全量快照');};
 assert.equal(store.actorId(),'me');
 assert.equal(model.resolve('me').action,null);
 assert.equal(model.resolve('a').action.personId,'a');
 store.setActor('a');
 assert.equal(store.actorId(),'a');
 assert.equal(model.resolve('a').action,null);
 assert.equal(model.resolve('me').action.personId,'me');
 assert.equal(model.resolve('assistant'),null);
 store.snapshot=original;
 const detached=store.snapshot();detached.actorId='b';
 assert.equal(store.actorId(),'a','快照仍与真实状态隔离');
});
