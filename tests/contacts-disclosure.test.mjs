import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import {readFileSync} from 'node:fs';
import {loadIdentityEnvironment} from './helpers/identity-environment.mjs';
function setup(){
 const window={__EVA_COLLEAGUE_PORTRAIT:'eva-logo',EvaAvatar:{personUri:id=>id}};loadIdentityEnvironment(window);
 for(const file of ['009-2-membership.js','009-3-contact-identities.js','033-contacts-redesign-v2.js'])vm.runInNewContext(readFileSync('prototype/'+file,'utf8'),{window});
 const store=window.EvaMembership.create({actorId:'me',people:[{id:'me',name:'本人'},{id:'lin',name:'林晓'},{id:'zero',name:'未创建者'}],clones:[{id:'first',ownerId:'lin',name:'旧名',avatar:'custom'},{id:'second',ownerId:'lin',name:'旧名二'}],projects:{p:{id:'p',name:'项目',humans:[{id:'me'},{id:'lin'}],cloneIds:['first','second']}}});
 const model=window.EvaContactIdentities.create(store,{team:{getSnapshot:()=>({identities:[]})},ownerId:'me'});
 return {window,store,model};
}
test('单分身目录保留零个状态，旧多分身合并且项目成员不重复',()=>{
 const {model,store}=setup(),rows=model.directory();
 assert.equal(rows.find(r=>r.person.id==='zero').personas.length,0);
 const lin=rows.find(r=>r.person.id==='lin');assert.equal(lin.personas.length,1);
 assert.equal(lin.personas[0].name,'林晓的 AI 分身');assert.equal(lin.personas[0].appearance.avatar,'eva-logo');
 assert.equal(store.snapshot().projects.p.cloneIds.join(','),'first');assert.equal(store.clone('second').id,'first');
 assert.equal(store.members('p').filter(m=>m.kind==='clone').length,1);
 assert.throws(()=>store.addClone('p','me','second'),/自己的/);
});
test('通讯录实际渲染保留搜索、头像、AI 标和双资料入口，无多分身控件',()=>{
 const {window,model,store}=setup();
 const h=(type,props,...children)=>typeof type==='function'?type(props||{}):({type,props:props||{},children:children.flat(Infinity).filter(x=>x!==null&&x!==false&&x!==undefined)});
 const R={createElement:h,useState:v=>[v,()=>{}],useEffect:()=>{},useSyncExternalStore:()=>{}};
 window.EvaAITeam={subscribe:()=>{},getSnapshot:()=>({identities:[]})};
 const tree=window.EvaContactsUI.render({React:R,Input:'input',SearchIcon:'svg',store,ui:{identityModel:model,IdentityCard:()=>null,IdentityAppearance:({profile,size})=>window.EvaAIIdentity.avatar(profile.appearance,size,h)}});
 const nodes=[];function walk(n){if(typeof n==='object'){nodes.push(n);n.children?.forEach(walk);}}walk(tree);
 const buttons=nodes.filter(n=>n.type==='button');assert.equal(buttons.length,4);
 assert.ok(buttons.some(n=>n.props['aria-label']==='查看 林晓的 AI 分身 的资料'));
 assert.ok(nodes.some(n=>n.props['aria-label']==='搜索通讯录'));
 assert.ok(nodes.some(n=>n.props.className==='ai-badge ai-badge-small'));
 assert.ok(nodes.some(n=>n.children?.includes('未创建')));
 assert.ok(!JSON.stringify(tree).includes('展开其余'));
});
