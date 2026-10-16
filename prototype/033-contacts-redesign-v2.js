/* Read-only organization tree plus one owner and at most one clone per contact row. */
(function(root){
'use strict';
let Component;
root.EvaContactsUI={render(deps){Component||=create(deps);return deps.React.createElement(Component);}};
function create({React:R,Input,SearchIcon,ChevronRightIcon,ChevronDownIcon,store,ui}){
 const h=R.createElement,{identityModel:model,IdentityCard,IdentityAppearance}=ui;
 const ALL='department:all',UNASSIGNED='department:unassigned';
 const text=value=>String(value||'').trim().toLocaleLowerCase('zh-CN');
 function ContactGroup({person,personas,onProfile}){
  const persona=personas[0];
  return h('li',{className:'eva-contacts__person'},
   h('button',{type:'button',className:'eva-contacts__human eva-contact-identity-button','aria-label':'查看 '+person.name+' 的资料',onClick:event=>onProfile(person.id,event)},
    h('img',{className:'eva-contacts__avatar',src:person.avatar,alt:'',draggable:false}),
    h('span',{className:'eva-contacts__human-copy'},h('strong',{className:'eva-contacts__person-name','data-eva-tooltip':person.name,'data-eva-tooltip-clamp':''},person.name),h('span',{className:'eva-contacts__department','data-eva-tooltip':person.departmentL2,'data-eva-tooltip-clamp':''},person.departmentL2))),
   h('div',{className:'eva-contacts__clone-group',role:'group','aria-label':person.name+'的 AI 分身'},
    persona?h('button',{type:'button',className:'eva-contacts__ai-row eva-contact-identity-button',onClick:event=>onProfile(persona.id,event),'aria-label':'查看 '+persona.name+' 的资料'},
     h(IdentityAppearance,{profile:persona,size:28}),h('span',{className:'eva-contacts__ai-identity'},h('span',{className:'eva-contacts__ai-name','data-eva-tooltip':persona.name,'data-eva-tooltip-clamp':''},persona.name),root.EvaAIIdentity.badge(h))):h('span',{className:'eva-contacts__clone-empty'},'未创建')));
 }
 function icon(Icon){return Icon?h(Icon,{size:14,'aria-hidden':true}):null;}
 return function Contacts(){
  const memberRevision=R.useSyncExternalStore(store.subscribe,store.getSnapshot);
  const teamSnapshot=R.useSyncExternalStore(root.EvaAITeam.subscribe,root.EvaAITeam.getSnapshot);
  const [query,setQuery]=R.useState(''),[profile,setProfile]=R.useState(null),[selected,setSelected]=R.useState(null),[openBranches,setOpenBranches]=R.useState({}),actor=store.actorId();
  R.useEffect(()=>{setProfile(null);setQuery('');setSelected(null);setOpenBranches({});},[actor]);
  const directory=R.useMemo(()=>model.directory(),[memberRevision,teamSnapshot,actor]);
  const organization=R.useMemo(()=>model.organization(),[memberRevision,teamSnapshot,actor]);
  const defaultId=organization.roots.length===1?organization.roots[0].id:organization.roots.length?ALL:UNASSIGNED;
  const selectedId=selected===UNASSIGNED&&organization.unassignedRows.length?UNASSIGNED:organization.byId[selected]?selected:defaultId;
  const selectedNode=organization.byId[selectedId];
  const openDepartment=id=>{
   setSelected(id);setQuery('');setProfile(null);
   const parents={};let node=organization.byId[id];
   while(node?.parentId){parents[node.parentId]=true;node=organization.byId[node.parentId];}
   if(Object.keys(parents).length)setOpenBranches(previous=>({...previous,...parents}));
  };
  const toggleDepartment=id=>setOpenBranches(previous=>({...previous,[id]:!(previous[id]??(organization.byId[id]?.level<3))}));
  function departmentBranch(nodes,role){
   return h('ul',{className:'eva-contacts__tree-list',role},nodes.map(node=>{
    const hasChildren=node.children.length>0,isExpanded=openBranches[node.id]??node.level<3,isSelected=selectedId===node.id;
    return h('li',{className:'eva-contacts__tree-item',key:node.id,role:'treeitem','aria-expanded':hasChildren?isExpanded:undefined,'aria-selected':isSelected},
     h('div',{className:'eva-contacts__tree-row'+(isSelected?' is-selected':'')},
      hasChildren?h('button',{type:'button',className:'eva-contacts__tree-toggle','aria-label':(isExpanded?'收起 ':'展开 ')+node.name,onClick:()=>toggleDepartment(node.id)},icon(isExpanded?ChevronDownIcon:ChevronRightIcon)):h('span',{className:'eva-contacts__tree-toggle-placeholder','aria-hidden':true}),
      h('button',{type:'button',className:'eva-contacts__tree-select','aria-current':isSelected?'true':undefined,onClick:()=>openDepartment(node.id)},h('span',{className:'eva-contacts__tree-name','data-eva-tooltip':node.name,'data-eva-tooltip-clamp':''},node.name),h('span',{className:'eva-contacts__tree-count'},node.rows.length))),
     hasChildren&&isExpanded?departmentBranch(node.children,'group'):null);
   }));
  }
  const term=text(query),departmentHits=term?organization.nodes.filter(node=>text(node.pathText).includes(term)):[];
  const departmentPeople=new Set(departmentHits.flatMap(node=>node.rows.map(row=>row.person.id)));
  let rows;
  if(term)rows=directory.filter(row=>departmentPeople.has(row.person.id)||[row.person.name,row.person.departmentL2,row.person.deptFull,...row.personas.map(persona=>persona.name)].some(value=>text(value).includes(term)));
  else if(selectedId===ALL)rows=directory;
  else if(selectedId===UNASSIGNED)rows=organization.unassignedRows;
  else rows=selectedNode?.rows||directory;
  const matchingDepartments=term?organization.nodes.filter(node=>text(node.name).includes(term)).slice(0,6):[];
  const currentPath=term?['搜索结果']:selectedId===ALL?['全部联系人']:selectedId===UNASSIGNED?['未分配部门']:selectedNode?.path||['全部联系人'];
  const profileFor=(identity,event)=>{const anchor=event.currentTarget;setProfile(previous=>previous?.anchor===anchor?null:{identity,anchor});};
  return h('section',{id:'eva-contacts-root',className:'eva-contacts eva-contacts--redesigned','aria-label':'通讯录'},
   h('header',{className:'eva-contacts__main-head'},h('div',{className:'eva-contacts__title'},h('strong',null,'通讯录'),h('span',{className:'eva-contacts__result-count'},(term?rows.length:organization.totalCount)+' 位联系人')),
    h(Input,{className:'eva-contacts__search',prefix:h(SearchIcon,{size:16}),value:query,onChange:setQuery,placeholder:'搜索联系人、部门或分身','aria-label':'搜索通讯录',showClear:true,onKeyDown:event=>{if(event.key==='Escape')setQuery('');}})),
   h('div',{className:'eva-contacts__body'},
    h('aside',{className:'eva-contacts__organization','aria-label':'组织架构'},
     h('div',{className:'eva-conversation-rail-resizer',role:'separator','aria-label':'调整组织架构栏宽度','aria-orientation':'vertical',tabIndex:0,'data-eva-conversation-rail-resizer':true}),
     h('div',{className:'eva-contacts__organization-head'},h('strong',null,'组织架构'),h('span',null,organization.totalCount+' 人')),
     h('nav',{className:'eva-contacts__tree','aria-label':'部门目录'},
      organization.roots.length>1?h('button',{type:'button',className:'eva-contacts__tree-all'+(selectedId===ALL?' is-selected':''),'aria-current':selectedId===ALL?'true':undefined,onClick:()=>openDepartment(ALL)},h('span',null,'全部联系人'),h('span',null,organization.totalCount)):null,
      organization.roots.length?departmentBranch(organization.roots,'tree'):null,
      organization.unassignedRows.length?h('button',{type:'button',className:'eva-contacts__tree-all'+(selectedId===UNASSIGNED?' is-selected':''),'aria-current':selectedId===UNASSIGNED?'true':undefined,onClick:()=>openDepartment(UNASSIGNED)},h('span',null,'未分配部门'),h('span',null,organization.unassignedRows.length)):null)),
    h('main',{className:'eva-contacts__directory'},
     h('div',{className:'eva-contacts__directory-head'},h('div',{className:'eva-contacts__breadcrumb','aria-label':'当前组织路径'},currentPath.map((part,index)=>h(R.Fragment,{key:part+index},index?h('span',{className:'eva-contacts__breadcrumb-separator','aria-hidden':true},'/'):null,h('strong',null,part)))),h('span',{className:'eva-contacts__directory-count'},rows.length+' 人'+(!term&&selectedNode?.children.length?' · 含下级部门':''))),
     term&&matchingDepartments.length?h('section',{className:'eva-contacts__department-results','aria-label':'匹配的部门'},h('span',{className:'eva-contacts__department-results-label'},'匹配部门'),h('div',{className:'eva-contacts__department-result-list'},matchingDepartments.map(node=>h('button',{type:'button',className:'eva-contacts__department-result',key:node.id,onClick:()=>openDepartment(node.id)},h('span',null,node.path.join(' / ')),h('small',null,node.rows.length+' 人'))))):null,
     h('div',{className:'eva-contacts__list','aria-label':'联系人列表'},h('div',{className:'eva-contacts__columns','aria-hidden':true},h('span',null,'联系人'),h('span',null,'TA 的 AI 分身')),rows.length?h('ul',{className:'eva-contacts__groups'},rows.map(row=>h(ContactGroup,{...row,key:actor+':'+row.person.id,onProfile:profileFor}))):h('div',{className:'eva-contacts__empty-state',role:'status'},term?'没有找到匹配的联系人':'该部门暂无联系人')))),
   h(IdentityCard,{identity:profile?.identity,anchor:profile?.anchor,onClose:()=>setProfile(null)}));
 };
}
})(window);
