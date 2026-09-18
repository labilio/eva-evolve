import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import {readFileSync} from 'node:fs';

function setup(){
  const Fragment=Symbol('Fragment');
  const React={
    Fragment,
    createElement:(type,props,...children)=>({type,props:props||{},children:children.flat(Infinity).filter(child=>child!==false&&child!==null&&child!==undefined)}),
    useRef:value=>({current:value}),
    useCallback:value=>value,
    useSyncExternalStore:()=>{},
    useState:value=>[typeof value==='function'?value():value,()=>{}],
    useEffect:()=>{},
    useLayoutEffect:()=>{}
  };
  const ProjectIcon=props=>({type:'project-icon',props,children:[]});
  const Button='button',Modal='modal',BackIcon='back-icon';
  const window={EvaAITeam:{subscribe:()=>()=>{},getSnapshot:()=>({identities:[],identityAliases:{}})},EvaDigitalEmployeesStore:{subscribe:()=>()=>{},getSnapshot:()=>({}),get:()=>null}};
  const context=vm.createContext({window});
  for(const file of ['004-project-appearance.js','014-avatar.js','003-my-assistant-identity.js','009-3-contact-identities.js','009-3-identity-card.js','009-2-chat-settings.js']){
    vm.runInContext(readFileSync('prototype/'+file,'utf8'),context);
  }
  const project={id:'prod',name:'供应链运营协同',colorKey:'blue',ownerId:'u-owner',humans:[{id:'u-owner'}],cloneIds:[]};
  const state={actorId:'u-owner',projects:{prod:project},groups:{group:{id:'group',name:'采购与招投标',projectId:'prod',ownerId:'u-owner',humans:[{id:'u-owner'}],cloneIds:[]}}};
  const store={
    subscribe:()=>()=>{},getSnapshot:()=>state,snapshot:()=>state,actorId:()=>state.actorId,
    person:id=>id==='u-owner'?{id,name:'王宜林'}:null,clone:()=>null,projectAgent:()=>({id:'project-agent:prod',name:'供应链运营协同 · 项目管家',identityAppearance:window.EvaAIIdentity.projectAgentAppearance(project)}),
    canRead:()=>true,chatSettings:()=>({}),chatPreferences:()=>({}),manager:()=>true,groupMembers:()=>[],conversationContext:()=>({projectId:'prod',projectName:project.name,colorKey:project.colorKey}),
    candidates:()=>[],setChatSettings:()=>{},setChatPreferences:()=>{}
  };
  const cards=window.EvaIdentityCard.create({React,Modal,Button,BackIcon,ProjectIcon,useNavigate:()=>()=>{}},store);
  return {window,React,ProjectIcon,Button,Modal,BackIcon,store,state,project,cards};
}

function text(node){
  if(typeof node==='string')return node;
  if(!node||typeof node!=='object')return '';
  if(typeof node.type==='function')return text(node.type({...node.props,children:node.children}));
  return (node.children||[]).map(text).join('');
}

function find(node,predicate){
  if(!node||typeof node!=='object')return null;
  if(predicate(node))return node;
  if(typeof node.type==='function')return find(node.type({...node.props,children:node.children}),predicate);
  for(const child of node.children||[]){const match=find(child,predicate);if(match)return match;}
  return null;
}

test('身份资料卡用所属项目名称和项目色 icon 表达项目归属',()=>{
  const {cards,project,ProjectIcon}=setup();
  assert.equal(typeof cards.ProjectIdentity,'function');
  const tree=cards.IdentityCard({identity:'project-agent:prod',onClose:()=>{}});
  assert.match(text(tree),/所属项目/);
  assert.doesNotMatch(text(tree),/服务项目/);
  const affiliation=find(tree,node=>node.type===cards.ProjectIdentity);
  assert.ok(affiliation);
  const rendered=cards.ProjectIdentity(affiliation.props);
  assert.equal(text(rendered),project.name);
  const icon=find(rendered,node=>node.type===ProjectIcon);
  assert.ok(icon);
  assert.match(icon.props.style.color,/^light-dark\(#4F6BED,/);
});

test('聊天信息中的所属项目复用同一项目身份展示',()=>{
  const {window,React,Button,Modal,BackIcon,store,state,cards}=setup();
  const Placeholder=()=>null;
  const ChatSettings=window.EvaChatSettings.create({React,Button,Modal,Input:'input',Switch:'switch',PlusIcon:Placeholder,CloseIcon:Placeholder,BackIcon,SearchIcon:Placeholder,HumanIdentity:Placeholder,CloneIdentity:Placeholder,ProjectAgentIdentity:Placeholder,MemberPicker:Placeholder,SinglePersonPicker:Placeholder,humanItems:()=>[],cloneItems:()=>[],useState:()=>state,IdentityCard:Placeholder,ProjectIdentity:cards.ProjectIdentity,useNavigate:()=>()=>{}},store);
  const tree=ChatSettings({channel:{id:'group',name:'采购与招投标'},onClose:()=>{},onClear:()=>{}});
  assert.match(text(tree),/所属项目/);
  const affiliation=find(tree,node=>node.type===cards.ProjectIdentity);
  assert.ok(affiliation);
  assert.equal(affiliation.props.name,'供应链运营协同');
  assert.equal(affiliation.props.project.colorKey,'blue');
});

test('既有任务面包屑不纳入所属项目资料行修改',()=>{
  const source=readFileSync('prototype/049-loop-task-create.js','utf8');
  assert.match(source,/className:'loop-ci__crumb-ws'/);
  assert.doesNotMatch(source,/ProjectIdentity/);
});
