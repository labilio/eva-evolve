(function(root){
'use strict';
let Component;
root.EvaDigitalEmployeesUI={render(props,deps){Component||=create(deps);return deps.React.createElement(Component,props);}};
function create({React:R,Button,Input,TextArea,Select,Checkbox,Switch,Modal,Table,Tag,Toast,Dropdown,ChannelsView,icons,members,navigatePersonal}){
const h=R.createElement, data=root.__EVA_DIGITAL_EMPLOYEES_DATA,store=root.EvaDigitalEmployeesStore;
const btn=(label,onClick,extra={})=>h(Button,{onClick,...extra},label);
const identity=(a,showNo=true)=>h('span',{className:'eva-digital-center__identity'},root.EvaAIIdentity.avatar(store.appearance(a),32,h),h('span',null,h('span',{className:'eva-identity-name-row'},h('strong',{className:'eva-identity-name-text','data-eva-tooltip':a.name,'data-eva-tooltip-clamp':''},a.name),root.EvaAIIdentity.badge(h)),showNo&&a.no&&h('small',null,a.no)));
function Field({label,content,hint}){
  const id=R.useId(),labelId=id+'-label',hintId=hint?id+'-hint':undefined;
  const control=R.isValidElement(content)&&[Input,TextArea,Select,Switch].includes(content.type);
  return h('div',{className:'eva-digital-center__field'},h('label',{id:labelId,htmlFor:control?id:undefined},label),control?R.cloneElement(content,{id,'aria-label':label,'aria-labelledby':labelId,'aria-describedby':hintId}):h('div',{role:'group','aria-labelledby':labelId,'aria-describedby':hintId},content),hint&&h('small',{id:hintId,className:'eva-digital-center__muted'},hint));
}
const field=(label,content,hint)=>h(Field,{label,content,hint});
return function DigitalCenter({view='market',navigate,employeeId}){
R.useSyncExternalStore(store.subscribe,store.getSnapshot);R.useSyncExternalStore(members.subscribe,members.getSnapshot);
const ms=members.snapshot(),actor=ms.actorId;
const [domain,setDomain]=R.useState(null),[dialog,setDialog]=R.useState(null),[chosen,setChosen]=R.useState([]),[projectQuery,setProjectQuery]=R.useState(''),[error,setError]=R.useState('');
const [panel,setPanel]=R.useState(false),[query,setQuery]=R.useState('');
const [searchOpen,setSearchOpen]=R.useState(false),[expand,setExpand]=R.useState({}),[activeIndex,setActiveIndex]=R.useState(-1);
const barRef=R.useRef(null),searchRowsRef=R.useRef([]),searchWrapRef=R.useRef(null);
/* 统一搜索弹层（Semi Dropdown trigger:'custom'）由本组件控制开合：外层搜索框聚焦即开，
   点到搜索组件与弹层之外的区域即收起并清空。 */
const resetSearch=()=>{setSearchOpen(false);setQuery('');setExpand({});setActiveIndex(-1);};
R.useEffect(()=>{if(!searchOpen)return;
  const down=e=>{const t=e.target;if(searchWrapRef.current?.contains(t)||t.closest?.('.eva-digital-center__search-menu'))return;resetSearch();};
  document.addEventListener('mousedown',down);
  return()=>document.removeEventListener('mousedown',down);
},[searchOpen]);
R.useEffect(()=>{if(!panel)return;
  const down=e=>{if(!barRef.current?.contains(e.target))setPanel(false);};
  const key=e=>{if(e.key==='Escape')setPanel(false);};
  document.addEventListener('mousedown',down);document.addEventListener('keydown',key);
  return()=>{document.removeEventListener('mousedown',down);document.removeEventListener('keydown',key);};
},[panel]);
/* 业务域行按可用宽度自适应放满：隐藏测量行量出每个 chip 与「更多」按钮的宽度，
   ResizeObserver 跟踪行宽；选中低频域预留其宽度顶替末位槽，重置即恢复纯高频列表。 */
const base=store.agents().filter(a=>a.kind==='staff').map(a=>({...a,domain:a.domain?.trim()||(a.scope==='org'?'全公司':'未设置')}));
const domains=[...new Set(base.map(a=>a.domain).filter(Boolean))].sort((a,b)=>base.filter(x=>x.domain===b).length-base.filter(x=>x.domain===a).length);
const countOf=d=>base.filter(a=>a.domain===d).length;
const [fit,setFit]=R.useState(null);
const measureRef=R.useRef(null),fitW=R.useRef(null),domainRef=R.useRef(domain);
domainRef.current=domain;
const measureChips=()=>{const host=measureRef.current;if(!host||host.children.length<3)return null;
  const kids=host.children,map={};
  for(let i=1;i<kids.length-1;i++)map[kids[i].dataset.domain]=kids[i].offsetWidth;
  return {sig:domains.join('|'),all:kids[0].offsetWidth,more:kids[kids.length-1].offsetWidth,map};};
const refreshFit=()=>{const el=barRef.current;if(!el)return;
  if(fitW.current&&fitW.current.sig!==domains.join('|'))fitW.current=null;
  const w=fitW.current||measureChips();if(!w)return;fitW.current=w;
  const list=domains,selected=domainRef.current,gap=8,cw=d=>(w.map[d]||0)+gap,total=w.all+gap+list.reduce((s,d)=>s+cw(d),0);
  let next;
  if(total<=el.clientWidth)next={k:list.length,plus:false};
  else{
    let avail=el.clientWidth-w.more-gap-w.all-gap,used=0,k=0;
    for(;k<list.length;k++){if(used+cw(list[k])>avail)break;used+=cw(list[k]);}
    const idx=selected?list.indexOf(selected):-1;let plus=false;
    if(idx>=k){plus=true;const avail2=Math.max(0,avail-cw(selected));let used2=0,k2=0;
      for(;k2<list.length;k2++){if(used2+cw(list[k2])>avail2)break;used2+=cw(list[k2]);}
      k=k2;}
    next={k,plus};}
  setFit(prev=>prev&&prev.k===next.k&&prev.plus===next.plus?prev:next);};
R.useLayoutEffect(()=>{refreshFit();});
R.useEffect(()=>{const el=barRef.current;if(!el)return;const ro=new ResizeObserver(()=>refreshFit());ro.observe(el);return()=>ro.disconnect();},[view]);
const host=R.useRef(null);const popup=()=>host.current;
R.useEffect(()=>{setDialog(null);setChosen([]);setProjectQuery('');setError('');setPanel(false);setQuery('');setSearchOpen(false);setExpand({});},[view,actor,employeeId]);
const run=fn=>{try{fn();setError('');}catch(e){setError(e.message);}};
const open=(kind,a)=>{setDialog({kind,a});setChosen([]);setProjectQuery('');setError('');};
const allProjects=Object.values(ms.projects).filter(p=>members.canRead(p.id,actor));
const projectName=p=>p.name|| (p.id==='prod'?'供应链运营协同':p.id);
const select=(key,options,extra={})=>h(Select,{...extra,value:draft[key]||undefined,onChange:v=>update(key,v),optionList:options.map(o=>typeof o==='string'?{value:o,label:o}:o),getPopupContainer:popup});
const input=(key,placeholder,more={})=>h(Input,{value:draft[key]||'',onChange:v=>update(key,v),placeholder,...more});
const textarea=(key,placeholder)=>h(TextArea,{value:draft[key]||'',onChange:v=>update(key,v),placeholder,autosize:{minRows:3,maxRows:12}});
const checks=(key,items)=>h('div',{className:'eva-digital-center__filters'},items.map(value=>h(Checkbox,{key:value,checked:(draft[key]||[]).includes(value),onChange:e=>update(key,e.target.checked?[...(draft[key]||[]),value]:(draft[key]||[]).filter(x=>x!==value))},value)));

function market(){
  const list=base.filter(a=>!domain||a.domain===domain);
  const visibleTop=fit?domains.slice(0,fit.k):domains.slice(0,5);
  const appendSel=fit&&fit.plus&&domain?domain:null;
  const moreCount=domains.length-visibleTop.length-(appendSel?1:0);
  const chip=(d,extra={})=>btn(d+' '+countOf(d),()=>{setDomain(d);setPanel(false);setSearchOpen(false);},{key:d,'aria-pressed':domain===d,theme:domain===d?'light':'borderless',...extra});
  /* 统一搜索复用任务身份选择面板（AssigneePicker）那套 Semi Dropdown 菜单：
     外层统一搜索框（Semi Input，外观归 055）直接承担输入，菜单只出结果——
     分组标题 + 每组 5 条「展开其余」+ 限高滚动，与 .eva-task-assignee-* 同款 CSS；
     弹层父容器复用页面统一 popup(host) 配置。 */
  const norm=s=>String(s||'').normalize('NFKC').toLocaleLowerCase();
  const needle=norm(query.trim());
  const rank=n=>{const v=norm(n);return v===needle?3:v.indexOf(needle)===0?2:v.includes(needle)?1:0;};
  const domainHits=domains.filter(d=>!needle||norm(d).includes(needle)).sort((a,b)=>rank(b)-rank(a));
  const employeeHits=base.filter(a=>!needle||norm(a.name).includes(needle)||norm(a.no).includes(needle)).sort((a,b)=>rank(b.name)-rank(a.name));
  const groups=[{kind:'domain',label:'业务域',items:domainHits.map(d=>({id:d,name:d}))},{kind:'employee',label:'数字员工',items:employeeHits.map(a=>({id:a.id,name:a.name,agent:a}))}].filter(g=>g.items.length);
  /* 只有一个分组时不放分组标签；两类同时命中才用「业务域／数字员工」标题。 */
  const showGroupLabel=groups.length>1;
  const perGroup=5;
  const closeSearch=resetSearch;
  const chooseDomain=d=>{setDomain(d);closeSearch();};
  const chooseEmployee=a=>{open('detail',a);closeSearch();};
  /* 可见行同时登记到 searchRowsRef，供外层搜索框的 ↑↓/Enter 使用。 */
  const searchRows=[];
  const searchItem=(row,kind)=>{
    const index=searchRows.length;searchRows.push({kind,item:row});
    const active=index===activeIndex;
    if(kind==='domain')return h(Dropdown.Item,{key:'domain:'+row.id,active,onClick:()=>chooseDomain(row.name)},
      h('span',{className:'eva-digital-center__search-domain'},h('span',{className:'eva-digital-center__search-name'},row.name),h('span',{className:'eva-digital-center__search-count'},countOf(row.name))));
    const a=row.agent;
    return h(Dropdown.Item,{key:'employee:'+row.id,active,icon:root.EvaAIIdentity.avatar(store.appearance(a),28,h),onClick:()=>chooseEmployee(a)},
      h('span',{className:'eva-digital-center__search-who'},
        h('span',{className:'eva-identity-name-row'},h('strong',{className:'eva-identity-name-text'},a.name),root.EvaAIIdentity.badge(h)),
        h('small',null,a.domain)));
  };
  const searchBody=[];
  groups.forEach((group,index)=>{
    if(showGroupLabel&&index>0)searchBody.push(h(Dropdown.Divider,{key:'divider:'+group.kind}));
    if(showGroupLabel)searchBody.push(h(Dropdown.Title,{key:'title:'+group.kind},group.label));
    const shown=expand[group.kind]?group.items:group.items.slice(0,perGroup);
    shown.forEach(row=>searchBody.push(searchItem(row,group.kind)));
    const rest=group.items.length-shown.length;
    if(rest>0)searchBody.push(h('div',{key:group.kind+':more',className:'eva-task-assignee-expand',onMouseDown:e=>e.preventDefault(),onClick:e=>{e.stopPropagation();setExpand(previous=>({...previous,[group.kind]:true}));}},'展开其余 '+rest+' 个'));
  });
  searchRowsRef.current=searchRows;
  /* 外层搜索框按键与任务下拉一致：↑↓ 移动、Enter 触发、Escape 清空并收起。 */
  const onSearchKeyDown=e=>{
    if(e.nativeEvent.isComposing||e.keyCode===229)return;
    const rows=searchRowsRef.current||[];
    if(e.key==='ArrowDown'){e.preventDefault();setActiveIndex(i=>Math.min(i+1,rows.length-1));}
    else if(e.key==='ArrowUp'){e.preventDefault();setActiveIndex(i=>Math.max(i-1,0));}
    else if(e.key==='Enter'){e.preventDefault();const row=rows[activeIndex];if(row)row.kind==='domain'?chooseDomain(row.item.name):chooseEmployee(row.item.agent);}
    else if(e.key==='Escape'){e.preventDefault();e.stopPropagation();closeSearch();}
  };
  /* 菜单只承载结果：输入在外层统一搜索框，菜单内不再放第二个搜索框。 */
  const searchMenu=()=>h(Dropdown.Menu,{className:'eva-digital-center__search-menu'},
    h('div',{className:'eva-task-assignee-scroll'},searchBody.length?searchBody:h('div',{className:'eva-task-assignee-empty'},'没有匹配的业务域或数字员工')));
  const searchTrigger=h(Dropdown,{trigger:'custom',position:'bottomLeft',clickToHide:true,visible:searchOpen,
    onVisibleChange:visible=>{if(!visible)closeSearch();},
    getPopupContainer:popup,render:searchMenu()},
    h('span',{className:'eva-digital-center__search-anchor'},
      h(Input,{className:'eva-digital-center__search',value:query,prefix:h(icons.Search,{size:16}),
        placeholder:'搜索业务域或数字员工','aria-label':'搜索业务域或数字员工','aria-haspopup':'listbox','aria-expanded':searchOpen,
        onFocus:()=>{setPanel(false);setSearchOpen(true);},
        onChange:value=>{setQuery(value);setPanel(false);setSearchOpen(true);setActiveIndex(-1);},
        onKeyDown:onSearchKeyDown})));
  const columns=[{title:h('span',null,'名称'),dataIndex:'name',className:'eva-digital-center__name-cell',render:(_,a)=>identity(a,false)},{title:h('span',null,'工号'),dataIndex:'no',width:'14%',render:v=>h('span',null,v)},{title:h('span',null,'业务域'),dataIndex:'domain',width:'18%',render:v=>h('span',null,v)},{title:h('span',null,'操作'),width:224,align:'right',className:'eva-digital-center__action-cell',render:(_,a)=>{const joined=store.hasInTeam(a.id);return h('div',{className:'eva-digital-center__actions'},h('span',{className:'eva-digital-center__team-action'},joined?h('span',{className:'eva-digital-center__joined-status',onClick:e=>e.stopPropagation()},'已加入'):btn('加入我的 Agent',e=>{e.stopPropagation();run(()=>{store.addToTeam(a.id);Toast.success('已加入我的 Agent');});},{size:'small',theme:'borderless',type:'primary',className:'eva-digital-center__market-action eva-digital-center__join-action'})),btn('加入项目',e=>{e.stopPropagation();open('project',a);},{size:'small',theme:'borderless',type:'primary',className:'eva-digital-center__market-action eva-digital-center__project-action'}));}}];
  return h('main',{className:'eva-digital-center__main'},
    h('header',{className:'eva-digital-center__head'},h('h1',null,'数字员工市场')),
    h('div',{className:'eva-digital-center__filter-card'},
      h('div',{className:'eva-digital-center__filter-card-head'},
        h('span',{className:'eva-digital-center__filter-card-title'},'业务域'),
        h('div',{className:'eva-digital-center__search-wrap',ref:searchWrapRef},searchTrigger)),
      h('div',{className:'eva-digital-center__filter-bar',ref:barRef},
        h('div',{className:'eva-digital-center__filters eva-digital-center__domain-filters','aria-label':'按业务域筛选'},
          btn('全部业务域 '+base.length,()=>{setDomain(null);setPanel(false);},{'aria-pressed':!domain,theme:!domain?'light':'borderless'}),
          visibleTop.map(d=>chip(d)),
          appendSel&&chip(appendSel),
          moreCount>0&&btn('更多 '+moreCount,()=>{setPanel(!panel);closeSearch();},{className:'eva-digital-center__more-toggle',theme:'borderless','aria-expanded':panel,'aria-haspopup':'dialog',icon:h(icons.ChevronDown,{size:14}),iconPosition:'right'})),
        h('div',{className:'eva-digital-center__measure',ref:measureRef,'aria-hidden':true},
          btn('全部业务域 '+base.length,()=>{},{theme:'borderless',tabIndex:-1}),
          domains.map(d=>btn(d+' '+countOf(d),()=>{},{key:d,theme:'borderless',tabIndex:-1,'data-domain':d})),
          btn('更多 '+domains.length,()=>{},{theme:'borderless',tabIndex:-1})),
        panel&&h('div',{className:'eva-digital-center__domain-panel',role:'dialog','aria-label':'全部业务域'},
          h('div',{className:'eva-digital-center__domain-panel-grid'},
            domains.map(d=>chip(d,{className:'eva-digital-center__domain-panel-item'})))))),
    h('div',{className:'eva-digital-center__table',tabIndex:0,'aria-label':'数字员工列表'},
      h(Table,{key:domain||'all',rowKey:'id',pagination:{pageSize:20,showSizeChanger:false},columns,dataSource:list,
        empty:'暂无数字员工',
        onRow:a=>({tabIndex:0,'aria-label':'查看'+a.name+'的详情',onClick:()=>open('detail',a),onKeyDown:e=>{if(e.target===e.currentTarget&&(e.key==='Enter'||e.key===' ')){e.preventDefault();open('detail',a);}}})})));
}


function modalContent(){const a=dialog?.a;if(!a)return null;

  if(dialog.kind==='project'){
    const eligible=allProjects.filter(p=>members.manager(p.id,actor)&&(!(a.ownership==='personal'||a.scope==='self')||a.by===actor)&&(a.ownership!=='project'||a.projectId===p.id));
    const items=eligible.map(p=>({id:p.id,name:projectName(p),kind:'project',project:p,disabled:(p.employeeIds||[]).includes(a.id),selectionHint:(p.employeeIds||[]).includes(a.id)?'已加入':''}));
    const PickerUI=(window.__evaGetFileContext&&window.__evaGetFileContext().ui&&window.__evaGetFileContext().ui.MemberPicker)||null;
    return h('div',{className:'eva-project-picker-launch'},PickerUI?h(PickerUI,{visible:true,title:'加入项目',items,groups:[{kind:'project',label:'项目'}],emptyTitle:'暂无可加入的项目',emptyDescription:'仅你负责或管理的项目可添加；已加入的项目不会重复计入。',searchPlaceholder:'搜索项目',searchLabel:'搜索项目',noResultsText:'没有匹配的项目',submit:chosen=>'加入项目'+(chosen.length?'（'+chosen.length+'）':''),onCancel:()=>setDialog(null),onSubmit:chosen=>{try{members.transaction(staged=>chosen.forEach(p=>staged.addEmployee(p.id,actor,a.id)));setDialog(null);Toast.success('已加入所选项目');}catch(e){Toast.error(e.message);}}}):h('p',{role:'alert','className':'eva-project-picker__fallback'},'项目选择组件暂不可用，请刷新后重试。'));
  }


  if(dialog.kind==='detail'){
    const joined=store.hasInTeam(a.id);
    const publisher=a.publisher||'官方发布',creator=a.creatorName||a.byName||'官方维护',department=a.dept||a.deptFull?.split('/').slice(-1)[0]||'Eva 平台组',version=a.version||'v1.0.0',publishedAt=a.publishedAt||'2026-09-18',scope=a.scope==='org'?'全公司':a.scope==='project'?'项目内':'仅创建者';
    const versions=a.versions||[{version,at:publishedAt,by:creator,note:'完善身份说明、工具权限和输出格式。'},{version:'v1.2.0',at:'2026-08-28',by:publisher,note:'增加业务域知识和失败重试策略。'},{version:'v1.1.0',at:'2026-08-12',by:publisher,note:'首次发布并上线。'}];
    const audit=a.audit||[{at:publishedAt+' 16:20',actor:creator,action:'发布 '+version,note:'发布到'+scope},{at:publishedAt+' 15:42',actor:publisher,action:'审核通过',note:'完成上线前试跑和责任确认。'},{at:publishedAt+' 10:05',actor:creator,action:'创建数字员工',note:'完成身份、提示词、技能和工具配置。'}];
    const governance={publisher,creator,department,version,publishedAt,scope,uses:a.uses||128,users:a.users||46,versions,audit};
    const attributes=[['发布主体',publisher],['负责部门',department],['业务负责人',creator],['可见范围',scope],['版本',version+' · '+publishedAt+' 发布']];
    const statCards=[['近30天使用',governance.uses+' 次'],['服务人数',governance.users+' 人']];
    return h(R.Fragment,null,
      h('header',{className:'eva-detail-head'},
        h('div',{className:'eva-detail-head__identity'},identity(a,true)),
        a.presence!=='online'&&h('span',{className:'eva-digital-governance-presence is-'+a.presence},h('i',{className:'eva-digital-governance-presence__dot','aria-hidden':true}),a.presence==='offline'?'离线':'忙碌中')),
      h('div',{className:'eva-detail-body'},
        h('div',{className:'eva-detail-main'},
          h('section',{className:'eva-detail-block'},h('h3',null,'职责'),h('p',null,a.desc||'—')),
          h('section',{className:'eva-detail-block'},h('h3',null,'能力'),h('div',{className:'eva-detail-tags'},(a.skills||[]).map(s=>h(Tag,{key:s},s)))),
          h('section',{className:'eva-detail-block'},h('h3',null,'运营概览'),h('div',{className:'eva-detail-stats'},statCards.map(([label,value])=>h('div',{key:label},h('strong',null,value),h('span',null,label)))))),
        h('aside',{className:'eva-detail-side'},
          h('section',{className:'eva-detail-block'},h('h3',null,'属性'),h('dl',{className:'eva-detail-attrs'},attributes.map(([label,value])=>h('div',{key:label},h('dt',null,label),h('dd',null,value))))),
          h('div',{className:'eva-detail-records'},btn('版本记录',()=>setDialog({kind:'versions',a,governance}),{theme:'borderless'}),btn('追溯记录',()=>setDialog({kind:'audit',a,governance}),{theme:'borderless'})))),
      a.presence==='offline'&&h('p',{className:'eva-detail-offline'},'当前离线 · 最后在线 '+(a.lastSeen||'—')+' · 预计恢复 '+(a.backAt||'—')+'。消息会排队，上线后执行。'),
      h('div',{className:'eva-digital-governance-footer'},joined&&h('span',{className:'eva-digital-center__joined-status eva-detail-joined'},'已加入我的 Agent'),btn('加入项目',()=>open('project',a),{className:'eva-detail-join-project'}),!joined&&btn('加入我的 Agent',()=>run(()=>{store.addToTeam(a.id);Toast.success('已加入我的 Agent');}),{theme:'solid'})));
  }
  if(dialog.kind==='versions'){const g=dialog.governance;return h(R.Fragment,null,h('p',{className:'eva-digital-governance-intro'},'每个版本对应一组身份、提示词、工具和记忆配置。'),h('div',{className:'eva-digital-governance-timeline'},g.versions.map(v=>h('article',{key:v.version,className:'eva-digital-governance-event'},h('div',{className:'eva-digital-governance-event__head'},h('strong',null,v.version),h('span',null,v.at)),h('p',null,v.note),h('small',null,'发布/维护：'+v.by))),),btn('返回信息卡',()=>setDialog({kind:'detail',a}),{theme:'borderless'}));}
  if(dialog.kind==='audit'){const g=dialog.governance;return h(R.Fragment,null,h('p',{className:'eva-digital-governance-intro'},'记录创建、审核、发布和版本变更，便于确认责任与定位问题。'),h('div',{className:'eva-digital-governance-timeline'},g.audit.map((event,index)=>h('article',{key:event.at+index,className:'eva-digital-governance-event'},h('div',{className:'eva-digital-governance-event__head'},h('strong',null,event.action),h('span',null,event.at)),h('p',null,event.note),h('small',null,'操作主体：'+event.actor))),),btn('返回信息卡',()=>setDialog({kind:'detail',a}),{theme:'borderless'}));}
  if(dialog.kind==='skills'){
    const tab=dialog.tab||'md',files=a.files||[],accept=f=>tab==='ref'?f[0].startsWith('references/'):tab==='scr'?f[0].startsWith('scripts/'):!f[0].startsWith('references/')&&!f[0].startsWith('scripts/');
    return h(R.Fragment,null,h('p',null,[a.cat,a.ver,a.by,a.at].filter(Boolean).join(' · ')),h('p',null,a.desc),h(Tag,null,a.installed?'已安装':'未安装'),h('div',{className:'eva-digital-center__filters'},[['md','SKILL.md'],['ref','references'],['scr','scripts'],['oth','其他']].map(([value,label])=>btn(label,()=>setDialog(d=>({...d,tab:value})),{key:value,theme:tab===value?'light':'borderless'}))),tab==='md'?h('pre',{className:'eva-digital-center__document'},a.md||'这个技能还没写说明'):h(R.Fragment,null,...files.filter(accept).map(([path,kind,size])=>btn(path+' · '+kind+' · '+size,()=>Toast.info('原型：打开 '+path),{key:path,theme:'borderless',icon:h(icons.File,{size:16})})),!files.filter(accept).length&&h('p',null,'这一类没有文件')),h('div',{className:'eva-digital-center__filters'},btn(a.installed?'装到别的 Agent':'安装',()=>{if(!(draft.skills||[]).includes(a.name))update('skills',[...draft.skills||[],a.name]);setDialog(null);Toast.success('已选入当前 Agent 的技能');},{theme:'solid'}),btn('查看更新记录',()=>Toast.info('原型：'+a.ver+' 的变更说明'))));
  }
  if(dialog.kind==='conn'){
    const tab=dialog.tab||'overview',seed=a.id.split('').reduce((n,c)=>n+c.charCodeAt(0),0),linked=a.status==='已连接';
    const intro=h(R.Fragment,null,h('p',null,a.desc),h('p',null,[a.status,a.auth,a.mcp,a.domain,a.at].filter(Boolean).join(' · ')),h('div',{className:'eva-digital-center__actions'},linked?h(R.Fragment,null,btn('重新授权',()=>Toast.info('原型：重新走一次授权')),btn('测试',()=>Toast.info('原型：连通正常 · 延迟 '+(60+seed%140)+'ms')),btn('断开',()=>Toast.info('原型：断开 '+a.name))):btn('连接',()=>Toast.info(a.auth?.includes('申请')?'需要先申请凭证；凭证只存服务端环境变量':'原型：跳转授权页'))),h('div',{className:'eva-digital-center__filters'},[['overview','概览'],['tools','工具 '+(a.tools||[]).length],['perm','权限与凭证'],['log','调用记录']].map(([value,label])=>btn(label,()=>setDialog(d=>({...d,tab:value})),{key:value,theme:tab===value?'light':'borderless'}))));
    let pane;
    if(tab==='overview')pane=h(R.Fragment,null,h('h3',null,'装进来时自动拉的说明'),h('p',null,a.instr||'—'),h('h3',null,'谁在用'),h('div',{className:'eva-digital-center__cards'},[['本月调用',(800+seed*13%9000)+' 次'],['在用的 Agent',(3+seed%14)+' 个'],['平均延迟',(60+seed%140)+' ms'],['近 7 天失败率',((seed%9)/10).toFixed(1)+'%']].map(([key,value])=>h('div',{key,className:'eva-digital-center__card'},h('strong',null,value),key))),h('h3',null,'装了它的 Agent'),h('div',{className:'eva-digital-center__filters'},store.agents().slice(seed%5,seed%5+4).map(agent=>btn(identity(agent),()=>open('detail',agent),{key:agent.id,theme:'borderless'}))));
    if(tab==='tools')pane=h(R.Fragment,null,h('p',null,'装上这个连接器，Agent 就自动多出这些工具。'),...(a.tools||[]).map((tool,i)=>h('div',{key:tool,className:'eva-digital-center__field'},h('strong',null,tool),h('p',null,a.scopes?.[i]||a.desc),h(Tag,null,i%3===2?'只读':'可用'))),!(a.tools||[]).length&&h('p',null,'这个连接器还没开放工具'));
    if(tab==='perm')pane=h(R.Fragment,null,h('h3',null,'这个连接允许它做什么'),...(a.scopes||[]).map((scope,i)=>field(scope,h(Switch,{checked:dialog.scopes?.[scope]!==false,onChange:checked=>setDialog(d=>({...d,scopes:{...d.scopes,[scope]:checked}}))}),i===0?'必需，关掉这个连接器就没用了':'可以单独关掉')),h('h3',null,'凭证'),h('p',null,'鉴权方式：'+a.auth),h('p',null,'凭证存放：服务端环境变量，不进前端、仓库或日志'),h('p',null,'谁能改：'+(a.kind==='personal'?'只有我本人':'组织管理员')),h('p',null,'数据出域：仅内网，不出域'));
    if(tab==='log')pane=h(Table,{pagination:false,rowKey:'tool',columns:[{title:h('span',null,'工具'),dataIndex:'tool',render:v=>h('span',null,v)},{title:h('span',null,'状态'),dataIndex:'status',render:v=>h('span',null,v)},{title:h('span',null,'耗时'),dataIndex:'duration',render:v=>h('span',null,v)},{title:h('span',null,'时间'),dataIndex:'time',render:v=>h('span',null,v)}],dataSource:(a.tools||[]).slice(0,5).map((tool,i)=>({tool,status:(seed+i)%7!==3?'成功':'失败 · 超时 30 秒，已重试 1 次',duration:(60+(seed+i*17)%400)+' ms',time:'今天 '+(9+i)+':'+String((seed+i*7)%60).padStart(2,'0')}))});
    return h(R.Fragment,null,intro,pane);
  }
  return null;
}
function conversation(){const a=store.get(employeeId);if(!a)return h('p',null,'数字员工不存在');const id='digital-chat:'+a.id,source=store.conversationSource(a.id);
return h('div',{className:'eva-digital-center__chat'},h('header',{className:'eva-digital-center__head'},btn('数字员工市场',()=>navigate('/eva-stub/数字员工'),{theme:'borderless',icon:h(icons.ArrowLeft,{size:16})}),h('div',{className:'eva-digital-center__actions'},btn('资料',()=>open('detail',a)),store.hasInTeam(a.id)?h('span',{className:'eva-digital-center__joined-status'},'已加入我的 Agent'):btn('加入我的 Agent',()=>run(()=>{store.addToTeam(a.id);Toast.success('已加入我的 Agent');})),btn('加入项目',()=>open('project',a)))),h('div',{className:'eva-msg eva-channel-surface'},h(ChannelsView,{key:id,source,onOpenTask:()=>{}})));
}
const isPick=dialog?.kind==='project';
return h('section',{className:'eva-digital-center'+(view==='market'?' eva-market-workspace':'')},view==='chat'?conversation():market(),h('div',{className:'eva-digital-center__modal',ref:host}),h(Modal,{visible:!!dialog,getPopupContainer:popup,className:'eva-digital-dialog'+(isPick?' eva-picker-modal':'')+(dialog?.kind==='detail'?' eva-detail-modal':''),width:dialog?.kind==='project'?680:720,title:dialog?.kind==='project'?'加入项目':dialog?.kind==='detail'?undefined:dialog?.a?.name||'',onCancel:()=>setDialog(null),footer:isPick?h('div',{className:'eva-picker-footer'},btn('取消',()=>setDialog(null)),btn('加入项目'+(chosen.length?'（'+chosen.length+'）':''),()=>run(()=>{members.transaction(staged=>chosen.forEach(id=>{if(!staged.manager(id,actor))throw new Error('仅项目负责人或管理员可添加');staged.addEmployee(id,actor,dialog.a.id);}));setDialog(null);Toast.success('已加入所选项目');}),{theme:'solid',disabled:!chosen.length})):null,okText:'加入项目'+(chosen.length?'（'+chosen.length+'）':''),cancelText:'取消',okButtonProps:{disabled:!chosen.length},onOk:()=>run(()=>{members.transaction(staged=>chosen.forEach(id=>{if(!staged.manager(id,actor))throw new Error('仅项目负责人或管理员可添加');staged.addEmployee(id,actor,dialog.a.id);}));setDialog(null);Toast.success('已加入');})},modalContent()));
};
}
})(window);
