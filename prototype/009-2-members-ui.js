(function(root){
  'use strict';
  // Components receive the runtime's existing React and Semi instances.
  root.EvaMembersUI={create({React:R,Button,Select,Modal,Table,Input,Tag,Checkbox,Radio,Switch,PlusIcon,CircleMinusIcon,CloseIcon,BackIcon,SearchIcon,ProjectIcon,useNavigate},store,files){
    const h=R.createElement;
    function HumanIdentity({id,detail,compact=false}){const person=store.person(id);return h('span',{className:'eva-members-human-identity'+(compact?' is-compact':'')},h('img',{className:'eva-members-human-avatar',alt:'',src:root.EvaAvatar.personUri(id),draggable:false}),h('span',{className:'eva-members-human-copy'},h('span',{className:'eva-members-human-name'},person?.name||id),detail&&h('span',{className:'eva-members-human-role'},detail)));}
    function CloneIdentity({clone}){return h('span',{className:'eva-members-ai-identity'},root.EvaAIIdentity.avatar(root.EvaAIIdentity.cloneAppearance(store.person(clone.ownerId)),32,h),h('span',{className:'eva-identity-copy'},h('span',{className:'eva-identity-name-row'},h('span',{className:'eva-identity-name-text'},clone.name),root.EvaAIIdentity.badge(h))));}
    function ProjectAgentIdentity({agent,size=32}){return h('span',{className:'eva-members-ai-identity'},root.EvaAIIdentity.avatar(agent.identityAppearance||root.EvaAIIdentity.projectAgentAppearance(),size,h),h('span',null,agent.name),root.EvaAIIdentity.badge(h));}
    const roleNames={owner:'负责人',admin:'管理员',member:'成员'};
    const PickerPreview=root.EvaPickerPreview.create({React:R,Button,Select,Modal,Input,Tag,Checkbox,Radio},store);
    const SelectionBody=PickerPreview.SelectionBody;
    function humanItems(people,pid,groupHint=false){const s=store.snapshot(),p=s.projects[pid],rank={owner:0,admin:1,member:2};return people.filter(person=>store.person(person.id)).map(person=>{const role=p?.humans.find(m=>m.id===person.id)?.role,projectRoles=pid?store.memberRoles(pid,person.id).map(item=>item.name):[];return {...person,kind:'human',projectRole:role,detail:projectRoles.join('、'),selectionHint:groupHint?(role==='owner'?'项目负责人':role==='admin'?'项目管理员':''):''};}).sort((a,b)=>(rank[a.projectRole]??3)-(rank[b.projectRole]??3));}
    function cloneItems(actorId,pid,scopeId){const s=store.snapshot(),scope=s.projects[scopeId]||s.groups[scopeId];return s.clones.filter(c=>c.ownerId===actorId&&c.active!==false&&(!pid||s.projects[pid]?.cloneIds.includes(c.id))&&!scope?.cloneIds.includes(c.id)).map(c=>({...c,kind:'clone'}));}
    function MemberPicker({visible,title,items,onCancel,onSubmit,single=false,allowEmpty=false,submit='确认添加',withName=false,nameField,memberLabel='成员',groups,initialSelectedIds=[],minimumSelection,search,searchLabel='搜索可选成员',searchPlaceholder='搜索可选成员',emptyTitle='暂无可选成员',emptyDescription='',noResultsText='没有匹配的成员',className='',getPopupContainer,humanHint}){
      const field=nameField||(withName?{label:'群聊名称',placeholder:'输入群聊名称',maxLength:50,required:true}:null),searchEnabled=search??!single;
      const [ids,setIds]=R.useState([]),[name,setName]=R.useState(''),[query,setQuery]=R.useState(''),[error,setError]=R.useState('');
      R.useEffect(()=>{if(!visible)return;setIds(initialSelectedIds.filter(id=>items.some(item=>item.id===id&&!item.disabled)));setName(field?.initialValue||'');setQuery('');setError('');},[visible,title,field?.initialValue,initialSelectedIds.join('|')]);
      const toggle=id=>{setIds(value=>single?[id]:value.includes(id)?value.filter(item=>item!==id):[...value,id]);setError('');};
      const normalized=query.trim().normalize('NFKC').toLocaleLowerCase();
      const visibleItems=items.filter(item=>!normalized||item.name.normalize('NFKC').toLocaleLowerCase().includes(normalized));
      const chosen=items.filter(item=>ids.includes(item.id)&&!item.disabled);
      const required=minimumSelection??(allowEmpty?0:1),valid=chosen.length>=required&&(!field?.required||!!name.trim())&&(!field?.maxLength||name.trim().length<=field.maxLength);
      const pickerGroups=groups||[{kind:'human',label:'人类成员'},{kind:'clone',label:'我的 AI 分身'}];
      const identity=(item,selected=false)=>{if(item.kind==='project'){const tone=root.EvaProjectAppearance.css(item.project||{id:item.id,name:item.name});return h('span',{className:'eva-member-picker__project-identity'},h('span',{className:'eva-member-picker__project-icon','aria-hidden':true,style:{backgroundColor:tone.surface,color:tone.accent}},ProjectIcon?h(ProjectIcon,{size:16}):null),h('span',{className:'eva-member-picker__project-text'},h('span',{className:'eva-member-picker__project-name',title:item.name},item.name),selected?null:h('span',{className:'eva-member-picker__project-detail'},item.detail)));}return item.kind==='human'?h(HumanIdentity,{id:item.id,detail:selected?'':item.detail,compact:true}):h('span',{className:'eva-members-ai-identity'},root.EvaAIIdentity.avatar(item.appearance||root.EvaAIIdentity.cloneAppearance(store.person(item.ownerId)),28,h),h('span',{className:'eva-identity-copy'},h('span',{className:'eva-identity-name-row'},h('span',{className:'eva-identity-name-text',title:item.name},item.name),root.EvaAIIdentity.badge(h))));};
      const footer=h('div',{className:'eva-picker-footer eva-member-picker__footer'},h(Button,{onClick:onCancel},'取消'),h(Button,{theme:'solid',type:'primary',disabled:!valid,onClick:()=>{try{onSubmit(chosen,name.trim());}catch(e){setError(e.message);}}},typeof submit==='function'?submit(chosen):submit));
      return h(Modal,{className:('eva-members-modal eva-picker-modal eva-member-picker-modal '+className).trim(),width:680,title,visible,onCancel,footer,getPopupContainer,maskClosable:false},
        h('div',{className:'eva-member-picker'+(field?'':' eva-member-picker--selection-only')},
          field&&h('div',{className:'eva-member-picker__field'},h('label',{htmlFor:field.id||'eva-member-picker-name'},field.label),h(Input,{id:field.id||'eva-member-picker-name','aria-label':field.label,value:name,onChange:value=>{setName(value);setError('');},placeholder:field.placeholder,maxLength:field.maxLength,autoFocus:field.autoFocus!==false})),
          h('div',{className:'eva-member-picker__members'+(field?'':' eva-member-picker__members--selection-only')},
            field&&h('span',{className:'eva-member-picker__label',id:'eva-member-picker-members-label'},memberLabel),
            h('div',{className:'eva-member-picker__panel',...(field?{'aria-labelledby':'eva-member-picker-members-label'}:{'aria-label':memberLabel})},
              h('div',{className:'eva-member-picker__available'},
                searchEnabled&&h('div',{className:'eva-member-picker__toolbar'},h(Input,{value:query,onChange:setQuery,showClear:true,prefix:SearchIcon?h(SearchIcon,{size:16}):null,placeholder:searchPlaceholder,'aria-label':searchLabel})),
                h('div',{className:'eva-member-picker__candidates'},pickerGroups.map(group=>{const rows=visibleItems.filter(item=>group.items?group.items.includes(item.id):item.kind===group.kind);return rows.length?h('fieldset',{key:group.kind||group.label,className:'eva-member-picker__candidate-group'},h('legend',null,h('span',null,group.label),' ',h('span',{className:'eva-member-picker__group-count'},rows.length)),rows.map(item=>h('label',{key:item.id,className:'eva-member-picker__candidate'},h(single?Radio:Checkbox,{'aria-label':'选择'+item.name,name:'eva-member-picker-choice',checked:ids.includes(item.id),disabled:!!item.disabled,onChange:()=>{if(!item.disabled)toggle(item.id);}}),identity(item),item.selectionHint&&h('span',{className:'eva-picker-selection-hint'},item.selectionHint)))):null}),!visibleItems.length&&h('div',{className:'eva-member-picker__empty'},h('p',null,query.trim()?noResultsText:emptyTitle),!query.trim()&&emptyDescription&&h('small',null,emptyDescription)))),
              h('aside',{className:'eva-member-picker__selected','aria-label':'已选'+(items[0]?.kind==='project'?'项目':'成员')},
                h('div',{className:'eva-member-picker__selected-head'},h('strong',null,'已选 '+chosen.length),h(Button,{theme:'borderless',type:'tertiary',size:'small',disabled:!chosen.length,onClick:()=>setIds([])},'清空')),
                h('div',{className:'eva-member-picker__selected-list'},chosen.map(item=>h('div',{key:item.id,className:'eva-member-picker__selected-item'},h('span',{className:'eva-member-picker__selected-avatar'},identity(item,true)),h('span',{className:'eva-member-picker__selected-name',title:item.name},h('span',{className:'eva-member-picker__selected-name-text'},item.name),item.kind!=='human'&&item.kind!=='project'&&root.EvaAIIdentity.badge(h)),h(Button,{theme:'borderless',type:'tertiary',size:'small',icon:h(CloseIcon,{size:16}),'aria-label':'移除 '+item.name,onClick:()=>toggle(item.id)}))),!chosen.length&&h('p',null,'从左侧选择'+(items[0]?.kind==='project'?'项目':'成员')))))),
          error&&h('p',{role:'alert',className:'eva-members-error'},error)));
    }
    function SinglePersonPicker({visible,title,items,onCancel,onSubmit,submit='确认',description}){
      const [ids,setIds]=R.useState([]),[error,setError]=R.useState('');
      R.useEffect(()=>{if(visible){setIds([]);setError('');}},[visible,title]);
      const chosen=items.filter(item=>ids.includes(item.id)&&!item.disabled);
      const footer=h('div',{className:'eva-picker-footer eva-transfer-footer'},h(Button,{onClick:onCancel},'取消'),h(Button,{theme:'solid',type:'primary',disabled:chosen.length!==1,onClick:()=>{try{onSubmit(chosen);}catch(e){setError(e.message);}}},submit));
      return h(Modal,{className:'eva-members-modal eva-members-modal--transfer',width:480,title,visible,onCancel,footer,maskClosable:false},
        description&&h('p',{className:'eva-transfer-note'},description),
        h(SelectionBody,{items,selected:ids,onChange:setIds,single:true,emptyTitle:'暂无可接任的成员',emptyDescription:'当前范围内没有其他人类成员可以接任。'}),
        error&&h('p',{role:'alert',className:'eva-members-error'},error));
    }
    function useState(){R.useSyncExternalStore(store.subscribe,store.getSnapshot);return store.snapshot();}
    function CloneChoice({actorId,projectId,value,onChange}){
      const s=useState();const choices=s.clones.filter(c=>c.ownerId===actorId&&c.active!==false&&(!projectId||s.projects[projectId]?.cloneIds.includes(c.id)));
      return h('div',{className:'eva-members-field'},h(SelectionBody,{items:choices.map(c=>({...c,kind:'clone'})),selected:value||[],onChange}));
    }
    function ActorPicker(){const s=useState();return h('div',{className:'eva-members-actor'},h('span',null,'演示身份'),h(Select,{value:s.actorId,optionList:store.people().map(p=>({value:p.id,label:h(HumanIdentity,{id:p.id,compact:true})})),onChange:id=>store.setActor(id)}));}
    function RoleAssignment({projectId,memberId,onMemberChange,onClose}){
      const s=useState(),[ids,setIds]=R.useState([]),[error,setError]=R.useState(''),[roleName,setRoleName]=R.useState(''),[creating,setCreating]=R.useState(false),[createError,setCreateError]=R.useState('');
      R.useEffect(()=>{setIds(store.memberRoles(projectId,memberId).map(r=>r.id));setError('');setRoleName('');setCreating(false);setCreateError('');},[projectId,memberId,s.actorId]);
      const member=memberId&&store.members(projectId).find(m=>m.id===memberId);
      const createRole=()=>{
        if(!roleName.trim())return;
        try{
          const existing=store.projectRoles(projectId).find(r=>r.name===roleName.trim()),role=existing||store.saveProjectRole(projectId,s.actorId,{name:roleName});
          setIds(old=>[...new Set([...old,role.id])]);setRoleName('');setCreating(false);setCreateError('');setError('');
        }catch(e){setCreateError(e.message);}
      };
      const newRoleMenu=h('div',{className:'eva-role-menu-footer'},creating?
        h('div',{className:'eva-role-menu-create'},
          h('label',{htmlFor:'eva-new-project-role',className:'eva-role-field-label'},'新建角色'),
          h(Input,{id:'eva-new-project-role',autoFocus:true,'aria-label':'新角色名称',value:roleName,maxLength:20,placeholder:'例如：产品、前端',onChange:value=>{setRoleName(value);setCreateError('');},onKeyDown:e=>{e.stopPropagation();if(e.key==='Enter'&&!e.nativeEvent?.isComposing){e.preventDefault();createRole();}if(e.key==='Escape'){setCreating(false);setRoleName('');setCreateError('');}}}),
          createError&&h('p',{role:'alert',className:'eva-members-error'},createError),
          h('div',{className:'eva-role-menu-actions'},h(Button,{size:'small',type:'tertiary',theme:'borderless',onClick:()=>{setCreating(false);setRoleName('');setCreateError('');}},'取消'),h(Button,{size:'small',theme:'solid',disabled:!roleName.trim(),onClick:createRole},'创建并选中'))):
        h(Button,{className:'eva-role-menu-new',theme:'borderless',icon:h(PlusIcon,{size:16}),onClick:()=>setCreating(true)},'新建角色'));
      return h(Modal,{className:'eva-members-modal eva-project-role-modal',width:480,title:'设置项目角色',visible:!!memberId,onCancel:onClose,okText:'保存',cancelText:'取消',onOk:()=>{try{store.setMemberRoles(projectId,s.actorId,memberId,ids);onClose();}catch(e){setError(e.message);}}},member&&h('div',{className:'eva-project-role-form'},
        h('div',{className:'eva-role-field'},h('span',{id:'eva-role-member-label',className:'eva-role-field-label'},'成员'),h(Select,{className:'eva-members-select','aria-labelledby':'eva-role-member-label','aria-label':'选择成员',value:memberId,onChange:onMemberChange,optionList:store.members(projectId).map(m=>({value:m.id,label:m.kind==='human'?h(HumanIdentity,{id:m.id,compact:true}):m.kind==='clone'?h(CloneIdentity,{clone:m}):h(ProjectAgentIdentity,{agent:m})}))})),
        h('div',{className:'eva-role-field'},h('span',{id:'eva-role-selection-label',className:'eva-role-field-label'},'项目角色',h('span',{className:'eva-role-field-hint'},'可多选')),h(Select,{multiple:true,className:'eva-members-select','aria-labelledby':'eva-role-selection-label','aria-label':'成员项目角色',placeholder:'选择项目角色',value:ids,onChange:setIds,optionList:store.projectRoles(projectId).map(r=>({value:r.id,label:r.name})),emptyContent:'暂无项目角色',outerBottomSlot:newRoleMenu,onDropdownVisibleChange:visible=>{if(!visible){setCreating(false);setRoleName('');setCreateError('');}}})),
        h('p',{className:'eva-members-muted eva-role-help'},'仅调整项目分工，不改变成员权限。'),error&&h('p',{role:'alert',className:'eva-members-error'},error)));
    }
    function Members({scopeId}){
      const s=useState(),actor=s.actorId,sid=scopeId.startsWith('all:')?scopeId.slice(4):scopeId;
      const scope=s.projects[sid]||s.groups[sid];
      const [addOpen,setAddOpen]=R.useState(false),[error,setError]=R.useState(''),[action,setAction]=R.useState(null),[details,setDetails]=R.useState(null),[identityProfile,setIdentityProfile]=R.useState(null),[successors,setSuccessors]=R.useState({}),[roleMember,setRoleMember]=R.useState(null);
      R.useEffect(()=>{setAddOpen(false);setError('');setAction(null);setDetails(null);setIdentityProfile(null);setRoleMember(null);},[sid,actor]);
      if(!scope)return h('p',null,'该范围已不存在');
      const joined=store.canRead(sid,actor),manage=joined&&store.manager(sid,actor),all=scopeId.startsWith('all:'),isProject=!!s.projects[sid];
      const run=fn=>{try{fn();setError('');return true;}catch(e){setError(e.message);return false;}};
      const name=id=>store.person(id)?.name||id;
      const humanRows=scope.humans.map(m=>({...store.person(m.id),...m}));
      const rowClones=id=>scope.cloneIds.map(id=>store.clone(id)).filter(c=>c?.ownerId===id);
      const canEdit=!all&&joined;
      const openAction=(type,data)=>{setError('');setSuccessors({});setAction({type,...data});};
      const confirm=()=>{if(run(()=>{
        if(action.type==='removeEmployee')store.removeEmployee(sid,actor,action.id);
        if(action.type==='remove')store.remove(sid,actor,action.id,successors);
        if(action.type==='dissolve')store.dissolveGroup(sid,actor);
      }))setAction(null);};
      const columns=[{title:'成员',width:'26%',dataIndex:'name',render:(v,row)=>h(Button,{className:'eva-members-identity-button',theme:'borderless',type:'tertiary',onClick:()=>setIdentityProfile(row.id)},['project-agent','employee'].includes(row.kind)?h(ProjectAgentIdentity,{agent:row}):h(HumanIdentity,{id:row.id,detail:isProject?roleNames[row.projectRole||row.role]:scope.ownerId===row.id?'群主':store.manager(sid,row.id)?'管理员':'成员'}))},
        {title:'AI 分身',render:(_,row)=>{if(row.kind==='employee')return h('span',{className:'eva-members-muted'},row.role||'数字员工');if(row.kind==='project-agent')return h('span',{className:'eva-members-muted'},'项目分身 · 云端运行 · 不可移除');const cs=rowClones(row.id);return h('div',{className:'eva-members-clones'},...cs.slice(0,2).map(c=>h(Button,{key:c.id,className:'eva-members-identity-button',theme:'borderless',type:'tertiary',onClick:()=>setIdentityProfile(c.id)},h(CloneIdentity,{clone:c}))),cs.length>2&&h(Button,{size:'small',theme:'light',type:'tertiary',onClick:()=>setDetails(row.id)},'+'+(cs.length-2)),!cs.length&&h('span',{className:'eva-members-muted'},'未带入'));}},
        {title:'操作',width:220,align:'right',render:(_,row)=>row.kind==='employee'?(canEdit&&(manage||row.by===actor)&&h(Button,{size:'small',theme:'borderless',type:'danger',onClick:()=>openAction('removeEmployee',{id:row.id})},'移除')):row.kind!=='project-agent'&&canEdit&&h('div',{className:'eva-members-actions'},isProject&&scope.ownerId===actor&&row.id!==actor&&h(Button,{size:'small',theme:'borderless',type:'tertiary',onClick:()=>run(()=>store.setAdmin(sid,actor,row.id,row.role!=='admin'))},row.role==='admin'?'取消管理员':'设为管理员'),scope.ownerId===actor&&row.id===actor&&h(Button,{size:'small',theme:'borderless',type:'tertiary',onClick:()=>openAction('transfer',{})},'转让'),((manage&&scope.ownerId!==row.id)||row.id===actor)&&h(Button,{size:'small',theme:'borderless',type:'danger',onClick:()=>openAction('remove',{id:row.id})},row.id===actor?'退出':'移除'))}];
      if(isProject)columns.splice(1,0,{title:'项目角色',width:160,render:(_,row)=>h('span',{className:'eva-members-muted'},store.memberRoles(sid,row.id).map(r=>r.name).join('、')||'-')});
      return h('section',{className:'eva-members'},sid==='prod'&&new URLSearchParams(root.location.search).has('picker-preview')&&h(PickerPreview,{MemberPicker}),h('div',{className:'eva-members-toolbar'},h('div',null,h('h3',null,isProject?'项目成员':'群聊成员'),h('p',{className:'eva-members-muted'},joined?`${scope.humans.length} 位人类 · ${scope.cloneIds.length} 个 AI 分身${store.projectAgent(isProject?sid:scope.projectId)?" · 1 个项目分身":""}`:"尚未加入")),h('div',{className:'eva-members-actions'},isProject&&canEdit&&manage&&h(Button,{theme:'light',type:'tertiary',onClick:()=>setRoleMember(actor)},'角色设置'),canEdit&&h(Button,{theme:'solid',type:'primary',icon:h(PlusIcon,{size:16}),onClick:()=>{setAddOpen(true);setError('');}},'添加成员'))),
        all&&h('p',{className:'eva-members-notice'},'全员群与项目成员保持一致。请前往项目设置 → 成员管理调整成员。'),
        error&&h('p',{role:'alert',className:'eva-members-error'},error),
        joined?h(R.Fragment,null,h(Table,{className:'eva-members-table',rowKey:'id',pagination:false,columns,dataSource:[...humanItems(humanRows,isProject?sid:scope.projectId),...store.members(sid).filter(m=>['project-agent','employee'].includes(m.kind))],empty:'暂无成员'}),!isProject&&scope.ownerId===actor&&h(Button,{type:'danger',theme:'light',onClick:()=>openAction('dissolve',{})},'解散群聊')):h('p',{className:'eva-members-notice'},'尚未加入，不能查看成员或项目内容。请联系当前成员将你添加进来。'),
        isProject&&h(RoleAssignment,{projectId:sid,memberId:roleMember,onMemberChange:setRoleMember,onClose:()=>setRoleMember(null)}),
        h(cards.IdentityCard,{identity:identityProfile,onClose:()=>setIdentityProfile(null)}),
        h(MemberPicker,{key:sid+actor,visible:addOpen,title:isProject?'添加项目成员':'添加群聊成员',submit:'确认添加',items:joined&&!all?[...humanItems(store.candidates(sid,actor),scope.projectId,!isProject),...cloneItems(actor,scope.projectId,sid)]:[],emptyTitle:isProject?'所有可添加成员均已加入项目':scope.projectId?'项目内可选成员均已加入当前群聊':'所有可选成员均已加入当前群聊',emptyDescription:!isProject&&scope.projectId?'如需添加其他人，请先将其加入项目':'',onCancel:()=>setAddOpen(false),onSubmit:chosen=>{store.transaction(staged=>{chosen.forEach(p=>p.kind==='clone'?staged.addClone(sid,actor,p.id):staged.addMember(sid,actor,p.id));});setAddOpen(false);}}),
        h(SinglePersonPicker,{key:'transfer'+sid+actor,visible:action?.type==='transfer',title:isProject?'转让项目负责人':'转让群主',submit:'确认转让',description:(isProject?'当前负责人':'当前群主')+'：'+name(scope.ownerId)+' · 转让后由其管理'+(isProject?'项目成员与设置':'群资料、成员与群公告')+'。',items:humanItems(humanRows.filter(p=>p.id!==actor),isProject?sid:scope.projectId),onCancel:()=>setAction(null),onSubmit:chosen=>{store.transfer(sid,actor,chosen[0].id);setAction(null);}}),
        h(Modal,{className:'eva-members-modal',title:({remove:'确认移除成员',removeEmployee:'确认移除数字员工',transfer:isProject?'转让负责人':'转让群主',dissolve:'解散群聊'})[action?.type]||'',visible:!!action&&action.type!=='transfer',onCancel:()=>setAction(null),onOk:confirm,okText:'确认',cancelText:'取消'},action?.type==='removeEmployee'&&h(ProjectAgentIdentity,{agent:store.employee(action.id)}),action?.type==='removeEmployee'&&h('p',null,'移除后将不能在该范围内提及此数字员工，历史内容保留。'),action?.type==='remove'&&h(HumanIdentity,{id:action.id}),action?.type==='remove'&&h('p',null,`确认${action.id===actor?'退出':'移除 '+name(action.id)}？${isProject?'其分身及项目内群聊关系将一并移除。':'其分身也会离开本群。'}历史内容保留。负责人或群主须先转让。`),action?.type==='remove'&&isProject&&Object.values(s.groups).filter(g=>g.projectId===sid&&g.ownerId===action.id).map(g=>h('div',{key:g.id,className:'eva-members-field'},h('label',null,g.name),g.humans.length===1?h('p',{className:'eva-members-muted'},'该成员是唯一人类，退出时自动解散此群及子区'):h(Select,{className:'eva-members-select',placeholder:'选择群主接任者',value:successors[g.id],onChange:id=>setSuccessors({...successors,[g.id]:id}),optionList:g.humans.filter(m=>m.id!==action.id).map(m=>({value:m.id,label:h(HumanIdentity,{id:m.id,compact:true})}))}))),action?.type==='dissolve'&&h('p',null,'群聊及子区将不再可访问。'),error&&h('p',{role:'alert',className:'eva-members-error'},error)),
        h(Modal,{className:'eva-members-modal',title:details?name(details)+'的分身':'分身',visible:!!details&&!identityProfile,onCancel:()=>setDetails(null),footer:null},details&&rowClones(details).map(c=>h('div',{className:'eva-members-clone-row',key:c.id},h(Button,{theme:'borderless',type:'tertiary',onClick:()=>setIdentityProfile(c.id)},h(CloneIdentity,{clone:c})),canEdit&&(actor===details||manage)&&h(Button,{type:'danger',theme:'light',onClick:()=>run(()=>store.removeClone(sid,actor,c.id))},'移除分身')))));
    }
    function CreateGroup({projectId,visible,onClose,onCreated}){
      const s=useState(),people=store.people().filter(p=>p.id!==s.actorId&&(!projectId||s.projects[projectId]?.humans.some(m=>m.id===p.id)));
      return h(MemberPicker,{key:projectId+':'+s.actorId,title:'新建群聊',visible,withName:true,memberLabel:'群成员',submit:'创建群聊',items:[...humanItems(people,projectId,true),...cloneItems(s.actorId,projectId)],emptyTitle:projectId?'项目内暂无其他可选成员':'暂无可选成员',onCancel:onClose,onSubmit:(chosen,name)=>{const id='group-'+Date.now().toString(36);store.transaction(staged=>{staged.createGroup(id,name,projectId,s.actorId,chosen.filter(p=>p.kind==='clone').map(p=>p.id));chosen.filter(p=>p.kind==='human').forEach(p=>staged.addMember(id,s.actorId,p.id));});onCreated(id);onClose();}});
    }
    function FileLibrarySave({file,source,onClose,onSaved,allowedKinds}){
      const s=useState(),actor=s.actorId;
      R.useSyncExternalStore(files.subscribe,files.getSnapshot);
      const allTargets=files.writableSpaces(actor),targets=allowedKinds?.length?allTargets.filter(item=>allowedKinds.includes(item.kind)):allTargets;
      const defaultTarget=source?.projectId&&targets.some(item=>item.id===source.projectId)?source.projectId:files.personalSpace(actor);
      const [target,setTarget]=R.useState(defaultTarget),[parentId,setParentId]=R.useState(0),[error,setError]=R.useState(''),[savedId,setSavedId]=R.useState(null);
      R.useEffect(()=>{const next=source?.projectId&&targets.some(item=>item.id===source.projectId)?source.projectId:files.personalSpace(actor);setTarget(next);setParentId(0);setError('');setSavedId(null);},[file?.id,file?.name,source?.messageId,actor]);
      const targetInfo=targets.find(item=>item.id===target),folders=target?files.list(target,actor).filter(item=>item.type==='folder'&&!item.deletedAt):[];
      const folderName=id=>{const names=[];let current=folders.find(item=>item.id===id),guard=0;while(current&&guard++<20){names.unshift(current.name);current=folders.find(item=>item.id===current.parent_id);}return names.join(' / ');};
      const folderOptions=[{value:0,label:'文件库根目录'},...folders.map(item=>({value:item.id,label:folderName(item.id)}))];
      const sourceLabel=source?.type==='ai-conversation'?'我的 AI · '+(source.identityName||'AI'):source?.type==='chat'?'私聊 · '+(source.senderName||source.conversationTitle||'会话成员'):'群聊 · '+(source?.groupName||source?.conversationTitle||'来源群');
      const save=()=>{try{if(!target)throw Error('请选择目标文件库');const id=files.saveConversationFile(actor,target,parentId,file,source);const record=files.snapshot(actor).find(item=>item.id===id);root.EvaFileMessage.markSaved(file,source,record);setSavedId(id);setError('');onSaved?.(record);}catch(e){setError(e.message||'保存失败');}};
      const open=()=>{if(savedId&&typeof root.__evaOpenDriveFile==='function')root.__evaOpenDriveFile(savedId);onClose();};
      return h(Modal,{className:'eva-members-modal eva-file-save-modal',title:savedId?'已存到文件库':'存到文件库',visible:!!file,onCancel:onClose,footer:null,width:520},file&&h(R.Fragment,null,
        h('div',{className:'eva-file-save-modal__file'},h('strong',{title:file.name},file.name),h('span',null,sourceLabel)),
        !savedId&&h(R.Fragment,null,
          h('div',{className:'eva-members-field'},h('label',null,'目标文件库'),h(Select,{className:'eva-members-select',value:target,onChange:value=>{setTarget(value);setParentId(0);setError('');},optionList:targets.map(item=>({value:item.id,label:item.name}))})),
          h('div',{className:'eva-members-field'},h('label',null,'目标文件夹'),h(Select,{className:'eva-members-select',value:parentId,onChange:setParentId,optionList:folderOptions})),
          targetInfo&&targetInfo.kind!=='personal'&&h('div',{className:'eva-members-notice'},h('strong',null,'保存后，目标文件库成员可访问该文件'),h('p',null,'不会因此获得原会话、其他消息或其他附件的访问权限。')),
          h('p',{className:'eva-members-muted'},'文件只有在你确认后才会存入文件库，系统关联由来源自动生成。')),
        savedId&&h('div',{className:'eva-members-notice'},h('strong',null,'保存成功'),h('p',null,'已生成独立文件，并保留只读的来源关联。')),
        error&&h('p',{role:'alert',className:'eva-members-error'},error),
        h('div',{className:'eva-picker-footer'},h(Button,{onClick:onClose},savedId?'关闭':'取消'),h(Button,{theme:'solid',type:'primary',onClick:savedId?open:save},savedId?'打开所在位置':'确认保存'))));
    }
    function FileTransfer({file,source,onClose}){
      return h(FileLibrarySave,{file,source:{...source,type:'group',conversationId:source?.threadId||source?.groupId,messageId:source?.messageId||((source?.threadId||source?.groupId)+':'+(file?.id||file?.name)),projectId:source?.projectId},allowedKinds:['project'],onClose});
    }
    function MentionPicker({scopeId,members:sourceMembers,groups:sourceGroups,visible,query="",activeIndex=0,onActiveChange,onClose,onChoose,broadcast=true}){
      const s=useState(),members=sourceMembers||(scopeId&&store.canRead(scopeId,s.actorId)?store.groupMembers(scopeId):[]);
      const panel=R.useRef(null);
      const [activeKind,setActiveKind]=R.useState(null);
      const [expanded,setExpanded]=R.useState({});
      R.useLayoutEffect(()=>{
        if(!visible)return;
        const list=panel.current?.querySelector('.eva-im-mention-options');
        const item=list?.querySelector('.is-active');
        if(!item)return;
        const bounds=list.getBoundingClientRect(),row=item.getBoundingClientRect();
        if(row.top<bounds.top)list.scrollTop-=bounds.top-row.top;
        else if(row.bottom>bounds.bottom)list.scrollTop+=row.bottom-bounds.bottom;
      },[visible,activeIndex,query,activeKind]);
      R.useEffect(()=>{if(visible)setActiveKind(null);},[visible,scopeId]);
      R.useEffect(()=>{setExpanded({});},[query,visible,scopeId,activeKind]);
      R.useEffect(()=>{
        if(!visible)return;
        const onDoc=e=>{if(panel.current&&!panel.current.contains(e.target)&&!(e.target.closest&&e.target.closest('[aria-label="提及"]')))onClose();};
        document.addEventListener('mousedown',onDoc);
        return ()=>document.removeEventListener('mousedown',onDoc);
      },[visible]);
      if(!visible)return null;
      const choose=(name,id,item)=>{onChoose(name,id,item);onClose();};
      const needle=query.normalize('NFKC').toLocaleLowerCase();
      const match=m=>!needle||m.name.normalize('NFKC').toLocaleLowerCase().includes(needle);
      const matched=members.filter(match).sort((a,b)=>Number(b.name.normalize('NFKC').toLocaleLowerCase().startsWith(needle))-Number(a.name.normalize('NFKC').toLocaleLowerCase().startsWith(needle)));
      let itemIndex=0;
      const cap=5;
      const baseGroups=(sourceGroups?sourceGroups.map(group=>({kind:group.kind,title:group.label,items:(group.items||[]).filter(match)})):[{kind:'human',title:'人类成员',items:matched.filter(m=>m.kind==='human')},{kind:'clone',title:'AI 分身',items:matched.filter(m=>m.kind==='clone')},{kind:'employee',title:'数字员工',items:matched.filter(m=>m.kind==='employee'||m.kind==='project-agent')}]).filter(group=>group.items.length);
      const effectiveKind=activeKind&&baseGroups.some(group=>group.kind===activeKind)?activeKind:null;
      const groups=effectiveKind?baseGroups.filter(group=>group.kind===effectiveKind):baseGroups;
      const chips=baseGroups.length>1?h('div',{className:'eva-im-mention-chips',role:'group','aria-label':'按类型筛选'},
        h('button',{type:'button','data-eva-mention-kind':'all',className:'eva-im-mention-chip'+(effectiveKind?'':' is-active'),'aria-pressed':!effectiveKind,onMouseDown:e=>e.preventDefault(),onClick:()=>{setActiveKind(null);onActiveChange?.(0);}},'全部',h('span',{className:'eva-im-mention-chip-count'},baseGroups.reduce((sum,group)=>sum+group.items.length,0))),
        baseGroups.map(group=>h('button',{type:'button',key:group.kind,'data-eva-mention-kind':group.kind,className:'eva-im-mention-chip'+(effectiveKind===group.kind?' is-active':''),'aria-pressed':effectiveKind===group.kind,onMouseDown:e=>e.preventDefault(),onClick:()=>{setActiveKind(group.kind);onActiveChange?.(0);}},group.title,h('span',{className:'eva-im-mention-chip-count'},group.items.length)))):null;
      const candidateProps=()=>{const index=itemIndex++;return {className:index===activeIndex?'is-active':'',onMouseMove:()=>onActiveChange?.(index),onFocus:()=>onActiveChange?.(index)};};
      const identityRow=(m,badge)=>h('span',{className:'eva-members-human-identity'},root.EvaAIIdentity.avatar(m.identityAppearance||m.appearance,32,h),h('span',{className:'eva-identity-copy'},h('span',{className:'eva-identity-name-row'},h('span',{className:'eva-identity-name-text',title:m.name},m.name),badge&&root.EvaAIIdentity.badge(h))));
      const memberButton=m=>h('button',{type:'button',key:m.id,...candidateProps(),onMouseDown:e=>e.preventDefault(),onClick:()=>choose(m.name,m.id,m)},(m.identityAppearance||m.appearance)?identityRow(m,m.kind!=='squad'):['project-agent','employee'].includes(m.kind)?h(ProjectAgentIdentity,{agent:m}):m.kind==='clone'?h(CloneIdentity,{clone:store.clone(m.id)}):h(HumanIdentity,{id:m.id}));
      const groupRow=group=>h(R.Fragment,{key:group.kind||group.title},groups.length>1&&h('div',{className:'eva-im-mention-group'},group.title),(expanded[group.kind]?group.items:group.items.slice(0,cap)).map(memberButton),group.items.length>cap&&!expanded[group.kind]&&h('button',{type:'button','data-eva-mention-more':group.kind,className:'eva-im-mention-more',onMouseDown:e=>e.preventDefault(),onClick:()=>setExpanded(previous=>({...previous,[group.kind]:true}))},'展开其余 '+(group.items.length-cap)+(group.kind==='human'?' 位':' 个')));
      const grouped=!!effectiveKind||!!sourceGroups||!needle;
      const hasRows=grouped?groups.length>0:matched.length>0;
      const rowBody=grouped?groups.map(groupRow):matched.map(memberButton);
      return h('section',{ref:panel,className:'eva-im-mention-picker',role:'dialog','aria-label':'提及成员',onKeyDown:e=>{if(e.key==='Escape'){e.preventDefault();e.stopPropagation();onClose();}if(e.key==='ArrowDown'||e.key==='ArrowUp'){const items=Array.from(panel.current.querySelectorAll('input,button'));const index=items.indexOf(document.activeElement);e.preventDefault();items[(index+(e.key==='ArrowDown'?1:-1)+items.length)%items.length]?.focus();}}},
        h('div',{className:'eva-im-mention-heading'},h('span',null,'提及成员'),h('button',{type:'button','aria-label':'关闭提及',onClick:onClose},h(CloseIcon,{size:16}))),
        chips,
        h('div',{className:'eva-im-mention-options'},broadcast&&!needle&&!effectiveKind&&h(R.Fragment,null,h('button',{type:'button',...candidateProps(),onMouseDown:e=>e.preventDefault(),onClick:()=>choose('所有人','all')},h('span',{className:'eva-im-mention-all'},'@'),h('span',{className:'eva-im-mention-broadcast-copy'},'所有人',h('small',null,'通知会话中的人类成员'))),h('button',{type:'button',...candidateProps(),onMouseDown:e=>e.preventDefault(),onClick:()=>choose('所有 AI','ai')},h('span',{className:'eva-im-mention-all'},'@'),h('span',{className:'eva-im-mention-broadcast-copy'},'所有 AI',h('small',null,'通知会话中的全部 AI（分身与数字员工）')))),
          rowBody,
          needle&&!hasRows&&h('p',{className:'eva-im-mention-empty'},'没有匹配的成员')));
    }
    const cards=root.EvaIdentityCard.create({React:R,Modal,Button,BackIcon,ProjectIcon,useNavigate},store);
    const ChatSettings=root.EvaChatSettings.create({React:R,Button,Modal,Input,Switch,Tag,PlusIcon,CircleMinusIcon,CloseIcon,BackIcon,SearchIcon,HumanIdentity,CloneIdentity,ProjectAgentIdentity,MemberPicker,SinglePersonPicker,humanItems,cloneItems,useState,IdentityCard:cards.IdentityCard,ProjectIdentity:cards.ProjectIdentity,useNavigate},store);
    return {...cards,HumanIdentity,ChatSettings,Members,CloneChoice,ActorPicker,useState,MemberPicker,SinglePersonPicker,CreateGroup,FileLibrarySave,FileTransfer,MentionPicker};
  }};
})(window);
