/* One owner and at most one clone per row; React owns search and profile state. */
(function(root){
'use strict';
let Component;
root.EvaContactsUI={render(deps){Component||=create(deps);return deps.React.createElement(Component);}};
function create({React:R,Input,SearchIcon,store,ui}){
 const h=R.createElement,{identityModel:model,IdentityCard,IdentityAppearance}=ui;
 function ContactGroup({person,personas,onProfile}){
  const persona=personas[0];
  return h('li',{className:'eva-contacts__person'},
   h('button',{type:'button',className:'eva-contacts__human eva-contact-identity-button','aria-label':'查看 '+person.name+' 的资料',onClick:()=>onProfile(person.id)},
    h('img',{className:'eva-contacts__avatar',src:person.avatar,alt:''}),
    h('span',{className:'eva-contacts__human-copy'},h('strong',{className:'eva-contacts__person-name',title:person.name},person.name),h('span',{className:'eva-contacts__department',title:person.departmentL2},person.departmentL2))),
   h('div',{className:'eva-contacts__clone-group',role:'group','aria-label':person.name+'的 AI 分身'},
    persona?h('button',{type:'button',className:'eva-contacts__ai-row eva-contact-identity-button',onClick:()=>onProfile(persona.id),'aria-label':'查看 '+persona.name+' 的资料'},
     h(IdentityAppearance,{profile:persona,size:28}),h('span',{className:'eva-contacts__ai-identity'},h('span',{className:'eva-contacts__ai-name',title:persona.name},persona.name),root.EvaAIIdentity.badge(h))):h('span',{className:'eva-contacts__clone-empty'},'未创建')));
 }
 return function Contacts(){
  R.useSyncExternalStore(store.subscribe,store.getSnapshot);
  R.useSyncExternalStore(root.EvaAITeam.subscribe,root.EvaAITeam.getSnapshot);
  const [query,setQuery]=R.useState(''),[profile,setProfile]=R.useState(null),actor=store.snapshot().actorId;
  R.useEffect(()=>{setProfile(null);setQuery('');},[actor]);
  const term=query.trim().toLowerCase(),rows=model.directory().filter(row=>[row.person.name,row.person.departmentL2,...row.personas.map(p=>p.name)].some(value=>value.toLowerCase().includes(term)));
  return h('section',{id:'eva-contacts-root',className:'eva-contacts eva-contacts--redesigned','aria-label':'通讯录'},
   h('header',{className:'eva-contacts__main-head'},h('div',{className:'eva-contacts__title'},h('strong',null,'通讯录'),h('span',{className:'eva-contacts__result-count'},rows.length+' 位联系人')),
    h(Input,{className:'eva-contacts__search',prefix:h(SearchIcon,{size:16}),value:query,onChange:setQuery,placeholder:'搜索联系人、部门或分身','aria-label':'搜索通讯录',showClear:true,onKeyDown:e=>{if(e.key==='Escape')setQuery('');}})),
   h('div',{className:'eva-contacts__list','aria-label':'联系人列表'},h('div',{className:'eva-contacts__columns','aria-hidden':true},h('span',null,'联系人'),h('span',null,'TA 的 AI 分身')),rows.length?h('ul',{className:'eva-contacts__groups'},rows.map(row=>h(ContactGroup,{...row,key:actor+':'+row.person.id,query,onProfile:setProfile}))):h('div',{className:'eva-contacts__empty-state',role:'status'},'没有找到匹配的联系人')),
   h(IdentityCard,{identity:profile,onClose:()=>setProfile(null)}));
 };
}
})(window);
