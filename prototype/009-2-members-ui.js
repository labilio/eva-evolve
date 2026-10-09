(function(root){
  'use strict';
  // Components receive the runtime's existing React and Semi instances.
  root.EvaMembersUI={create({React:R,forms,MarkdownView,TextArea,Card,PermissionList,FileTextIcon,SettingsIcon,Button,Select,Modal:LegacyModal,Table,Input,Tag,Checkbox,Radio,Switch,PlusIcon,CircleMinusIcon,UserCogIcon,UserMinusIcon,TrashIcon,CameraIcon,CloseIcon,BackIcon,SearchIcon,ChevronRight,ProjectIcon,useNavigate,Toast},store,files){
    const h=R.createElement;
    const {Form,withField,useSubmission,SubmissionError,Dialog:Modal,Actions,requiredLabelPolicy}=forms;
    const SelectionField=withField(function SelectionField({children,...props}){return h('div',{'aria-invalid':props['aria-invalid'],'aria-describedby':props['aria-describedby'],tabIndex:-1},children);});
    function HumanIdentity({id,detail,compact=false}){const person=store.person(id);return h('span',{className:'eva-members-human-identity'+(compact?' is-compact':'')},h('img',{className:'eva-members-human-avatar',alt:'',src:root.EvaAvatar.personUri(id),draggable:false}),h('span',{className:'eva-members-human-copy'},h('span',{className:'eva-members-human-name'},person?.name||id),detail&&h('span',{className:'eva-members-human-role'},detail)));}
    function CloneIdentity({clone}){return h('span',{className:'eva-members-ai-identity'},root.EvaAIIdentity.avatar(root.EvaAIIdentity.cloneAppearance(store.person(clone.ownerId)),32,h),h('span',{className:'eva-identity-copy'},h('span',{className:'eva-identity-name-row'},h('span',{className:'eva-identity-name-text'},clone.name),root.EvaAIIdentity.badge(h))));}
    function ProjectAgentIdentity({agent,size=32}){return h('span',{className:'eva-members-ai-identity'},root.EvaAIIdentity.avatar(agent.identityAppearance||root.EvaAIIdentity.projectAgentAppearance(),size,h),h('span',null,agent.name),root.EvaAIIdentity.badge(h));}
    const roleNames={owner:'负责人',admin:'管理员',member:'成员'};
    const PickerPreview=root.EvaPickerPreview.create({React:R,MarkdownView,TextArea,Card,PermissionList,FileTextIcon,SettingsIcon,Button,Select,Modal,Input,Tag,Checkbox,Radio},store);
    const SelectionBody=PickerPreview.SelectionBody;
    function humanItems(people,pid){const p=store.projectRecord(pid),rank={owner:0,admin:1,member:2};return people.filter(person=>store.person(person.id)).map(person=>{const role=p?.humans.find(m=>m.id===person.id)?.role,projectRoles=pid?store.memberRoles(pid,person.id).map(item=>item.name):[];return {...person,kind:'human',projectRole:role,detail:projectRoles.join('、')};}).sort((a,b)=>(rank[a.projectRole]??3)-(rank[b.projectRole]??3));}
    function cloneItems(actorId,pid,scopeId){const project=store.projectRecord(pid),scope=store.projectRecord(scopeId)||store.groupRecord(scopeId);return store.cloneRecords().filter(c=>c.ownerId===actorId&&c.active!==false&&(!pid||project?.cloneIds.includes(c.id))&&!scope?.cloneIds.includes(c.id)).map(c=>({...c,kind:'clone'}));}
    // 新建项目还没有项目范围，候选等价于「新建非项目群聊」：除本人外的可用联系人 + 本人的可用 AI 分身；本人分身置顶便于选择。
    function projectCreateCandidates(actorId){return {items:[...cloneItems(actorId),...humanItems(store.people().filter(person=>person.id!==actorId))],groups:[{kind:'clone',label:'我的 AI 分身'},{kind:'human',label:'联系人'}]};}
    // 身份渲染是选择器家族共用的唯一实现：候选与已选、拉人与选人都走这里。
    const identity=(item,selected=false)=>{if(item.kind==='project'){const tone=root.EvaProjectAppearance.css(item.project||{id:item.id,name:item.name});return h('span',{className:'eva-member-picker__project-identity'},h('span',{className:'eva-member-picker__project-icon','aria-hidden':true,style:{backgroundColor:tone.surface,color:tone.accent}},ProjectIcon?h(ProjectIcon,{size:16}):null),h('span',{className:'eva-member-picker__project-text'},h('span',{className:'eva-member-picker__project-name','data-eva-tooltip':item.name,'data-eva-tooltip-clamp':''},item.name),selected?null:h('span',{className:'eva-member-picker__project-detail'},item.detail)));}if(item.kind==='channel'){const channel=item.channel||{id:item.id,personId:item.personId,identityAvatarUrl:item.identityAvatarUrl,color:item.color};const appearance=item.appearance||channel.identityAppearance;const avatar=appearance?root.EvaAIIdentity.avatar(appearance,28,h):h('img',{className:'eva-members-human-avatar',alt:'',src:root.EvaAvatar.conversationUri(channel),draggable:false});return item.ai?h('span',{className:'eva-members-ai-identity'},avatar,h('span',{className:'eva-identity-copy'},h('span',{className:'eva-identity-name-row'},h('span',{className:'eva-identity-name-text','data-eva-tooltip':item.name,'data-eva-tooltip-clamp':''},item.name),root.EvaAIIdentity.badge(h)))):h('span',{className:'eva-members-human-identity is-compact'},avatar,h('span',{className:'eva-members-human-copy'},h('span',{className:'eva-members-human-name','data-eva-tooltip':item.name,'data-eva-tooltip-clamp':''},item.name)));}return item.kind==='human'?h(HumanIdentity,{id:item.id,detail:selected?'':item.detail,compact:true}):h('span',{className:'eva-members-ai-identity'},root.EvaAIIdentity.avatar(item.appearance||root.EvaAIIdentity.cloneAppearance(store.person(item.ownerId)),28,h),h('span',{className:'eva-identity-copy'},h('span',{className:'eva-identity-name-row'},h('span',{className:'eva-identity-name-text','data-eva-tooltip':item.name,'data-eva-tooltip-clamp':''},item.name),root.EvaAIIdentity.badge(h))));};
    function MemberPicker({visible,title,items,onCancel,onSubmit,single=false,allowEmpty=false,submit='确认添加',withName=false,nameField,fields,memberLabel='成员',groups,initialSelectedIds=[],minimumSelection,search,searchLabel='搜索可选成员',searchPlaceholder='搜索可选成员',emptyTitle='暂无可选成员',emptyDescription='',noResultsText='没有匹配的成员',className='',getPopupContainer,zIndex,humanHint,itemNoun}){
      const legacyField=nameField||(withName?{label:'群聊名称',placeholder:'输入群聊名称',maxLength:50,required:true}:null),configuredFields=Array.isArray(fields)&&fields.length?fields:(legacyField?[legacyField]:[]);
      // 创建形态既可只有一个名称字段（新建群聊），也可承载「名称 + 附加字段」（新建项目的共同目标），仍复用同一套双栏选择区与同一提交校验。
      const fieldList=configuredFields.map((field,index)=>({...field,key:field.key||(index===0?'name':'field-'+index),id:field.id||(index===0?'eva-member-picker-name':'eva-member-picker-'+index)})),hasFields=fieldList.length>0,primaryKey=fieldList[0]?.key,fieldSignature=fieldList.map(field=>String(field.initialValue||'')).join('|'),searchEnabled=search??!single;
      const [formApi,formState,form]=Form.useForm();
      const ids=form.memberIds||[];
      const setIds=next=>formApi.setValue('memberIds',typeof next==='function'?next(ids):next);
      const [query,setQuery]=R.useState(''),[groupId]=R.useState(()=>'eva-member-picker-'+Math.random().toString(36).slice(2,8));
      const initialValues={memberIds:initialSelectedIds.filter(id=>items.some(item=>item.id===id&&!item.disabled))};
      fieldList.forEach(field=>{initialValues[field.key]=field.initialValue||'';});
      const submission=useSubmission({active:visible,resetKey:title+fieldSignature+initialSelectedIds.join('|'),onSubmit:values=>{
        const clean={};fieldList.forEach(field=>{clean[field.key]=String(values[field.key]||'').trim();});
        return onSubmit(chosen,primaryKey?clean[primaryKey]:'',clean);
      }});
      R.useEffect(()=>{if(visible){setQuery('');formApi.reset();formApi.setValues(initialValues);}},[visible,title,fieldSignature,initialSelectedIds.join('|')]);
      const toggle=id=>setIds(value=>single?[id]:value.includes(id)?value.filter(item=>item!==id):[...value,id]);
      const normalized=query.trim().normalize('NFKC').toLocaleLowerCase();
      const visibleItems=items.filter(item=>!normalized||item.name.normalize('NFKC').toLocaleLowerCase().includes(normalized));
      const declaredGroups=groups||[{kind:'human',label:'联系人'},{kind:'clone',label:'我的 AI 分身'}];
      const groupRank=new Map(declaredGroups.map((group,index)=>[group.kind,index])),itemRank=new Map(items.map((item,index)=>[item.id,index]));
      // 已选栏与左侧候选保持同一分组顺序，配置「我的 AI 分身」置顶时两栏都会置顶。
      const chosen=items.filter(item=>ids.includes(item.id)&&!item.disabled).sort((a,b)=>{const rankA=groupRank.has(a.kind)?groupRank.get(a.kind):declaredGroups.length,rankB=groupRank.has(b.kind)?groupRank.get(b.kind):declaredGroups.length;return rankA-rankB||(itemRank.get(a.id)??0)-(itemRank.get(b.id)??0);});
      const required=minimumSelection??(allowEmpty?0:1);
      const memberField={label:memberLabel,required:required>0};
      const fieldLabel=requiredLabelPolicy([...fieldList,memberField]);
      const selectionNoun=itemNoun||(items[0]?.kind==='project'?'项目':'成员');
      // 两个网格共用同一标签列宽：附加字段（如共同目标）标签更长时仍与成员面板左边缘对齐。
      const labelWidth=(hasFields?Math.max(80,Math.max(...fieldList.map(field=>String(field.label||'').length))*15):80)+'px';
      // 只有一个分组类别时不渲染分组头：该入口设定上不可能出现第二类身份，分组层没有区分作用。
      const groupless=declaredGroups.length<2;
      const pickerGroups=groupless?[{kind:declaredGroups[0]?.kind||'human',label:declaredGroups[0]?.label||'成员',items:declaredGroups[0]?.items}]:declaredGroups;
      const fieldNode=field=>h(Form.Input,{key:field.key,field:field.key,id:field.id,'aria-label':field.label,label:fieldLabel(field),labelPosition:'left',labelWidth,fieldClassName:'eva-member-picker__field',
        rules:[...(field.required?[{required:true,whitespace:true,message:'请输入'+field.label}]:[]),...(field.maxLength?[{max:field.maxLength,message:field.label+'最多 '+field.maxLength+' 个字符'}]:[])],
        placeholder:field.placeholder,maxLength:field.maxLength,autoFocus:field.autoFocus===true||(field.autoFocus===undefined&&fieldList.length===1)});
      const footer=h(Actions,{onCancel,onSubmit:submission.submit,busy:submission.busy,submitLabel:typeof submit==='function'?submit(chosen):submit});
      return h(Modal,{className:('eva-members-modal eva-picker-modal eva-member-picker-modal '+className).trim(),width:680,title,visible,zIndex,onCancel,footer,getPopupContainer,maskClosable:true},
        h(Form,{...submission.formProps,form:formApi,initValues:initialValues,className:'eva-member-picker'+(hasFields?'':' eva-member-picker--selection-only'),style:{'--eva-member-picker-label-w':labelWidth,'--eva-member-picker-extra-fields':(Math.max(0,fieldList.length-1)*52)+'px','--eva-member-picker-error-height':(Object.values(formState.errors||{}).filter(Boolean).length*24)+'px'}},
          hasFields&&fieldList.map(fieldNode),
          h(SelectionField,{field:'memberIds',noLabel:!hasFields,label:fieldLabel(memberField),labelPosition:'left',labelWidth,fieldClassName:'eva-member-picker__members'+(hasFields?'':' eva-member-picker__members--selection-only'),rules:[{validator:(_,value)=>items.filter(item=>(value||[]).includes(item.id)&&!item.disabled).length>=required,message:'请至少选择 '+required+' 位'+(/^[A-Za-z]/.test(memberLabel)?' ':'')+memberLabel}]},
            h('div',{className:'eva-member-picker__panel',...(hasFields?{'aria-labelledby':'eva-member-picker-members-label'}:{'aria-label':memberLabel})},
              h('div',{className:'eva-member-picker__available'},
                searchEnabled&&h('div',{className:'eva-member-picker__toolbar'},h(Input,{value:query,onChange:setQuery,showClear:true,prefix:SearchIcon?h(SearchIcon,{size:16}):null,placeholder:searchPlaceholder,'aria-label':searchLabel})),
                h('div',{className:'eva-member-picker__candidates'+(groupless?' eva-member-picker__candidates--groupless':'')},pickerGroups.map((group,groupIndex)=>{const rows=visibleItems.filter(item=>group.items?group.items.includes(item.id):item.kind===group.kind);const candidateList=rows.map(item=>h('label',{key:item.id,className:'eva-member-picker__candidate'},h(single?Radio:Checkbox,{'aria-label':'选择'+item.name,name:'eva-member-picker-choice',checked:ids.includes(item.id),disabled:!!item.disabled,onChange:()=>{if(!item.disabled)toggle(item.id);}}),identity(item),item.selectionHint&&h('span',{className:'eva-picker-selection-hint'},item.selectionHint)));if(!rows.length)return null;const headId=groupId+'-group-'+groupIndex;return groupless?h('div',{key:'groupless',className:'eva-member-picker__candidate-flat','aria-label':group.label},candidateList):h('section',{key:group.kind||group.label,className:'eva-member-picker__candidate-group',role:'group','aria-labelledby':headId},h('div',{className:'eva-member-picker__candidate-group-head'},h('span',{className:'eva-member-picker__group-title',id:headId},group.label),' ',h('span',{className:'eva-member-picker__group-count'},rows.length),h('span',{className:'eva-member-picker__candidate-group-rule','aria-hidden':true})),candidateList)}),!visibleItems.length&&h('div',{className:'eva-member-picker__empty'},h('p',null,query.trim()?noResultsText:emptyTitle),!query.trim()&&emptyDescription&&h('small',null,emptyDescription)))),
              h('aside',{className:'eva-member-picker__selected','aria-label':'已选'+selectionNoun},
                h('div',{className:'eva-member-picker__selected-head'},h('strong',null,'已选 '+chosen.length),h(Button,{theme:'borderless',type:'tertiary',size:'small',disabled:!chosen.length,onClick:()=>setIds([])},'清空')),
                h('div',{className:'eva-member-picker__selected-list'},chosen.map(item=>h('div',{key:item.id,className:'eva-member-picker__selected-item'},h('span',{className:'eva-member-picker__selected-avatar'},identity(item,true)),h('span',{className:'eva-member-picker__selected-name','data-eva-tooltip':item.name,'data-eva-tooltip-clamp':''},h('span',{className:'eva-member-picker__selected-name-text'},item.name),(item.kind==='channel'?item.ai:item.kind!=='human'&&item.kind!=='project')&&root.EvaAIIdentity.badge(h)),h(Button,{theme:'borderless',type:'tertiary',size:'small',icon:h(CloseIcon,{size:16}),'aria-label':'移除 '+item.name,onClick:()=>toggle(item.id)}))),!chosen.length&&h('p',null,'从左侧选择'+selectionNoun)))),
            null),
          h(SubmissionError,{submission})));
    }
    function SinglePersonPicker({visible,title,items,onCancel,onSubmit,submit='确认'}){
      const [formApi,,values]=Form.useForm();
      const ids=values.memberIds||[],chosen=items.filter(item=>ids.includes(item.id)&&!item.disabled);
      const submission=useSubmission({active:visible,resetKey:title,onSubmit:()=>onSubmit(chosen)});
      R.useEffect(()=>{if(visible)formApi.reset();},[visible,title]);
      const footer=h(Actions,{onCancel,onSubmit:submission.submit,busy:submission.busy,submitLabel:submit});
      return h(Modal,{className:'eva-members-modal eva-members-modal--transfer',width:480,title,visible,onCancel,footer,maskClosable:true},
        h(Form,{...submission.formProps,form:formApi,initValues:{memberIds:[]}},
          h(SelectionField,{field:'memberIds',noLabel:true,rules:[{validator:(_,value)=>items.filter(item=>(value||[]).includes(item.id)&&!item.disabled).length===1,message:'请选择 1 位接任者'}]},
            h(SelectionBody,{items,selected:ids,onChange:next=>formApi.setValue('memberIds',next),single:true,renderIdentity:item=>identity(item),searchPlaceholder:'搜索可选成员',searchLabel:'搜索可选成员',searchIcon:SearchIcon?h(SearchIcon,{size:16}):null,emptyTitle:'暂无可接任的成员',emptyDescription:'当前范围内没有其他联系人可以接任'})),
          h(SubmissionError,{submission})));
    }
    function useState(){R.useSyncExternalStore(store.subscribe,store.getSnapshot);return {actorId:store.actorId()};}
    function ActorPicker(){const s=useState();return h('div',{className:'eva-members-actor'},h('span',null,'演示身份'),h(Select,{value:s.actorId,optionList:store.people().map(p=>({value:p.id,label:h(HumanIdentity,{id:p.id,compact:true})})),onChange:id=>store.setActor(id)}));}
    function RoleCreator({projectId,actor,onCreated,onCancel}){
      const submission=useSubmission({onSubmit:values=>{
        const name=values.name.trim(),existing=store.projectRoles(projectId).find(r=>r.name===name);
        const role=existing||store.saveProjectRole(projectId,actor,{name});
        onCreated(role);
      }});
      return h(Form,{...submission.formProps,className:'eva-role-create'},
        h('div',{className:'eva-role-create-heading'},h('label',{htmlFor:'eva-new-project-role',className:'eva-role-field-label'},'新建角色'),h(Button,{theme:'borderless',size:'small',onClick:onCancel},'取消新建')),
        h('div',{className:'eva-role-create-row'},
        h(Form.Input,{field:'name',noLabel:true,id:'eva-new-project-role',autoFocus:true,'aria-label':'新角色名称',maxLength:20,placeholder:'例如：产品、前端',rules:[{required:true,whitespace:true,message:'请输入角色名称'}],onKeyDown:e=>{e.stopPropagation();if(e.key==='Escape'){e.preventDefault();onCancel();}}}),
        h(Button,{theme:'solid',htmlType:'submit',loading:submission.busy},'创建并选中')),
        h(SubmissionError,{submission}));
    }
    function RoleAssignment({projectId,memberId,onMemberChange,onClose}){
      const s=useState(),[formApi]=Form.useForm(),[creating,setCreating]=R.useState(false);
      const initialValues={roleIds:store.memberRoles(projectId,memberId).map(r=>r.id)};
      const submission=useSubmission({active:!!memberId,resetKey:projectId+':'+memberId+':'+s.actorId,onSubmit:values=>{
        store.setMemberRoles(projectId,s.actorId,memberId,values.roleIds||[]);onClose();
      }});
      R.useEffect(()=>{if(memberId){formApi.reset();formApi.setValues(initialValues);}setCreating(false);},[projectId,memberId,s.actorId]);
      const member=memberId&&store.members(projectId).find(m=>m.id===memberId);
      const newRoleMenu=h('div',{className:'eva-role-create-area'},creating?
        h(RoleCreator,{projectId,actor:s.actorId,onCancel:()=>setCreating(false),onCreated:role=>{formApi.setValue('roleIds',[...new Set([...(formApi.getValue('roleIds')||[]),role.id])]);setCreating(false);}}):
        h(Button,{className:'eva-role-new',theme:'borderless',icon:h(PlusIcon,{size:16}),onClick:()=>setCreating(true)},'新建角色'));
      return h(Modal,{className:'eva-members-modal eva-project-role-modal',width:480,title:'设置项目角色',visible:!!memberId,onCancel:onClose,okText:'保存',cancelText:'取消',confirmLoading:submission.busy,onOk:submission.submit},member&&h('div',{className:'eva-project-role-content'},h(Form,{...submission.formProps,form:formApi,initValues:initialValues,className:'eva-project-role-form'},
        h('div',{className:'eva-role-field'},h('span',{id:'eva-role-member-label',className:'eva-role-field-label'},'成员'),h(Select,{className:'eva-members-select','aria-labelledby':'eva-role-member-label','aria-label':'选择成员',value:memberId,onChange:onMemberChange,optionList:store.members(projectId).map(m=>({value:m.id,label:m.kind==='human'?h(HumanIdentity,{id:m.id,compact:true}):m.kind==='clone'?h(CloneIdentity,{clone:m}):h(ProjectAgentIdentity,{agent:m})}))})),
        h('div',{className:'eva-role-field'},h('span',{id:'eva-role-selection-label',className:'eva-role-field-label'},'项目角色',h('span',{className:'eva-role-field-hint'},'可多选')),h('div',{className:'eva-role-options'},store.projectRoles(projectId).length?h(Form.CheckboxGroup,{field:'roleIds',id:'eva-role-selection',noLabel:true,direction:'vertical','aria-labelledby':'eva-role-selection-label','aria-label':'成员项目角色',options:store.projectRoles(projectId).map(r=>({value:r.id,label:r.name}))}):h('p',{className:'eva-members-muted'},'暂无项目角色'))),
        h('p',{className:'eva-members-muted eva-role-help'},'仅调整项目分工，不改变成员权限'),h(SubmissionError,{submission})),newRoleMenu));
    }
    function Members({scopeId}){
      const s=useState(),actor=s.actorId,sid=scopeId.startsWith('all:')?scopeId.slice(4):scopeId;
      const project=store.projectRecord(sid),scope=project||store.groupRecord(sid);
      const [addOpen,setAddOpen]=R.useState(false),[error,setError]=R.useState(''),[action,setAction]=R.useState(null),[details,setDetails]=R.useState(null),[identityProfile,setIdentityProfile]=R.useState(null),[roleMember,setRoleMember]=R.useState(null);
      const [removalApi]=Form.useForm();
      const removal=useSubmission({active:action?.type==='remove',resetKey:[sid,actor,action?.id].join(':'),onSubmit:values=>{store.remove(sid,actor,action.id,values.successors||{});setAction(null);}});
      R.useEffect(()=>{if(action?.type==='remove'){removalApi.reset();removalApi.setValues({successors:{}});}},[sid,actor,action?.type,action?.id]);
      R.useEffect(()=>{setAddOpen(false);setError('');setAction(null);setDetails(null);setIdentityProfile(null);setRoleMember(null);},[sid,actor]);
      if(!scope)return h('p',null,'该范围已不存在');
      const joined=store.canRead(sid,actor),manage=joined&&store.manager(sid,actor),all=scopeId.startsWith('all:'),isProject=!!project;
      const run=fn=>{try{fn();setError('');return true;}catch(e){setError(e.message);return false;}};
      const name=id=>store.person(id)?.name||id;
      const humanRows=scope.humans.map(m=>({...store.person(m.id),...m}));
      const rowClones=id=>scope.cloneIds.map(id=>store.clone(id)).filter(c=>c?.ownerId===id);
      const canEdit=!all&&joined;
      const openAction=(type,data)=>{setError('');setAction({type,...data});};
      const confirm=()=>{if(run(()=>{
        if(action.type==='removeEmployee')store.removeEmployee(sid,actor,action.id);
        if(action.type==='dissolve'){store.dissolveGroup(sid,actor);Toast&&Toast.success('群聊已解散');}
      }))setAction(null);};
      const columns=[{title:h('span',null,'成员'),width:'26%',dataIndex:'name',render:(v,row)=>h(Button,{className:'eva-members-identity-button',theme:'borderless',type:'tertiary',onClick:()=>setIdentityProfile(row.id)},['project-agent','employee'].includes(row.kind)?h(ProjectAgentIdentity,{agent:row}):h(HumanIdentity,{id:row.id,detail:isProject?roleNames[row.projectRole||row.role]:scope.ownerId===row.id?'群主':store.manager(sid,row.id)?'管理员':'成员'}))},
        {title:h('span',null,'AI 分身'),render:(_,row)=>{if(row.kind==='employee')return h('span',{className:'eva-members-muted'},row.role||'数字员工');if(row.kind==='project-agent')return h('span',{className:'eva-members-muted'},'项目分身 · 云端运行 · 不可移除');const cs=rowClones(row.id);return h('div',{className:'eva-members-clones'},...cs.slice(0,2).map(c=>h(Button,{key:c.id,className:'eva-members-identity-button',theme:'borderless',type:'tertiary',onClick:()=>setIdentityProfile(c.id)},h(CloneIdentity,{clone:c}))),cs.length>2&&h(Button,{size:'small',theme:'light',type:'tertiary',onClick:()=>setDetails(row.id)},'+'+(cs.length-2)),!cs.length&&h('span',{className:'eva-members-muted'},'未带入'));}},
        {title:h('span',null,'操作'),width:220,align:'right',render:(_,row)=>row.kind==='employee'?(canEdit&&(manage||row.by===actor)&&h(Button,{size:'small',theme:'borderless',type:'danger',onClick:()=>openAction('removeEmployee',{id:row.id})},'移除')):row.kind!=='project-agent'&&canEdit&&h('div',{className:'eva-members-actions'},isProject&&scope.ownerId===actor&&row.id!==actor&&h(Button,{size:'small',theme:'borderless',type:'tertiary',onClick:()=>run(()=>store.setAdmin(sid,actor,row.id,row.role!=='admin'))},row.role==='admin'?'取消管理员':'设为管理员'),scope.ownerId===actor&&row.id===actor&&humanRows.some(item=>item.id!==actor)&&h(Button,{size:'small',theme:'borderless',type:'tertiary',onClick:()=>openAction('transfer',{})},'转让'),((manage&&scope.ownerId!==row.id)||row.id===actor)&&h(Button,{size:'small',theme:'borderless',type:'danger',onClick:()=>openAction('remove',{id:row.id})},row.id===actor?'退出':'移除'))}];
      if(isProject)columns.splice(1,0,{title:h('span',null,'项目角色'),width:160,render:(_,row)=>h('span',{className:'eva-members-muted'},store.memberRoles(sid,row.id).map(r=>r.name).join('、')||'-')});
      return h('section',{className:'eva-members'},sid==='prod'&&new URLSearchParams(root.location.search).has('picker-preview')&&h(PickerPreview,{MemberPicker}),h('div',{className:'eva-members-toolbar'},h('div',null,h('h3',null,isProject?'项目成员':'群聊成员'),h('p',{className:'eva-members-muted'},joined?`${scope.humans.length} 位联系人 · ${scope.cloneIds.length} 个 AI 分身${store.projectAgent(isProject?sid:scope.projectId)?" · 1 个项目分身":""}`:"尚未加入")),h('div',{className:'eva-members-actions'},isProject&&canEdit&&manage&&h(Button,{theme:'light',type:'tertiary',onClick:()=>setRoleMember(actor)},'角色设置'),canEdit&&h(Button,{theme:'solid',type:'primary',icon:h(PlusIcon,{size:16}),onClick:()=>{setAddOpen(true);setError('');}},'添加成员'))),
        all&&h('p',{className:'eva-members-notice'},'全员群与项目成员保持一致。请前往项目设置 → 成员管理调整成员。'),
        error&&h('p',{role:'alert',className:'eva-members-error'},error),
        joined?h(R.Fragment,null,h(Table,{className:'eva-members-table',rowKey:'id',pagination:false,columns,dataSource:[...humanItems(humanRows,isProject?sid:undefined),...store.members(sid).filter(m=>['project-agent','employee'].includes(m.kind))],empty:'暂无成员'}),!isProject&&scope.ownerId===actor&&h(Button,{type:'danger',theme:'light',onClick:()=>openAction('dissolve',{})},'解散群聊')):h('p',{className:'eva-members-notice'},'尚未加入，不能查看成员或项目内容。请联系当前成员将你添加进来。'),
        isProject&&h(RoleAssignment,{projectId:sid,memberId:roleMember,onMemberChange:setRoleMember,onClose:()=>setRoleMember(null)}),
        h(cards.IdentityCard,{identity:identityProfile,onClose:()=>setIdentityProfile(null)}),
        h(MemberPicker,{key:sid+actor,visible:addOpen,title:isProject?'添加项目成员':'添加群聊成员',submit:'确认添加',items:joined&&!all?[...humanItems(store.candidates(sid,actor),isProject?sid:undefined),...cloneItems(actor,scope.projectId,sid)]:[],emptyTitle:isProject?'所有可添加成员均已加入项目':scope.projectId?'项目内可选成员均已加入当前群聊':'所有可选成员均已加入当前群聊',emptyDescription:!isProject&&scope.projectId?'如需添加其他人，请先将其加入项目':'',onCancel:()=>setAddOpen(false),onSubmit:chosen=>{store.transaction(staged=>{chosen.forEach(p=>p.kind==='clone'?staged.addClone(sid,actor,p.id):staged.addMember(sid,actor,p.id));});setAddOpen(false);}}),
        h(SinglePersonPicker,{key:'transfer'+sid+actor,visible:action?.type==='transfer',title:isProject?'转让项目负责人':'转让群主',submit:'确认转让',items:humanItems(humanRows.filter(p=>p.id!==actor),isProject?sid:undefined),onCancel:()=>setAction(null),onSubmit:chosen=>{store.transfer(sid,actor,chosen[0].id);setAction(null);}}),
        action?.type==='remove'&&h(Modal,{className:'eva-members-modal',title:'确认移除成员',visible:true,onCancel:()=>setAction(null),onOk:removal.submit,okButtonProps:{type:'danger'},confirmLoading:removal.busy,okText:'确认',cancelText:'取消'},
          h(Form,{...removal.formProps,form:removalApi,initValues:{successors:{}},className:'eva-member-removal-form'},
            h(HumanIdentity,{id:action.id}),h('p',null,`确认${action.id===actor?'退出':'移除 '+name(action.id)}？${isProject?(action.id===actor?'你及你的分身将同时退出项目内的群聊。':'该成员及其分身将同时退出项目内的群聊。'):'其分身也会离开本群。'}历史内容保留。负责人或群主须先转让。`),
            isProject&&Object.values(store.groupRecords()).filter(g=>g.projectId===sid&&g.ownerId===action.id).map(g=>h('div',{key:g.id,className:'eva-members-field'},h('label',{id:'eva-member-successor-'+g.id+'-label'},g.name),g.humans.length===1?h('p',{className:'eva-members-muted'},'该成员是唯一联系人，退出时自动解散此群及子区'):h(Form.Select,{field:'successors['+JSON.stringify(g.id)+']',id:'eva-member-successor-'+g.id,noLabel:true,className:'eva-members-select','aria-label':g.name+'的群主接任者',placeholder:'选择群主接任者',rules:[{required:true,message:'请选择群主接任者'}],optionList:g.humans.filter(m=>m.id!==action.id).map(m=>({value:m.id,label:h(HumanIdentity,{id:m.id,compact:true})}))}))),h(SubmissionError,{submission:removal}))),
        h(Modal,{className:'eva-members-modal',title:action?.type==='removeEmployee'?'确认移除数字员工':'解散群聊',visible:action?.type==='removeEmployee'||action?.type==='dissolve',onCancel:()=>setAction(null),onOk:confirm,okButtonProps:{type:'danger'},okText:'确认',cancelText:'取消'},action?.type==='removeEmployee'&&h(ProjectAgentIdentity,{agent:store.employee(action.id)}),action?.type==='removeEmployee'&&h('p',null,'移除后将无法在'+(isProject?'此项目':'此群聊')+'中 @ 此数字员工，历史内容保留。'),action?.type==='dissolve'&&h('p',null,'群聊及子区将不再可访问。'),error&&h('p',{role:'alert',className:'eva-members-error'},error)),
        h(Modal,{className:'eva-members-modal',title:details?name(details)+'的分身':'分身',visible:!!details&&!identityProfile,onCancel:()=>setDetails(null),footer:null},details&&rowClones(details).map(c=>h('div',{className:'eva-members-clone-row',key:c.id},h(Button,{theme:'borderless',type:'tertiary',onClick:()=>setIdentityProfile(c.id)},h(CloneIdentity,{clone:c})),canEdit&&(actor===details||manage)&&h(Button,{type:'danger',theme:'light',onClick:()=>run(()=>store.removeClone(sid,actor,c.id))},'移除分身')))));
    }
    // title / submitLabel / zIndex 只在「入口文案或层叠环境不同、创建链路相同」时覆盖，默认值保持群聊管理原有入口不变。
    function CreateGroup({projectId,visible,onClose,onCreated,title='新建群聊',submitLabel='创建群聊',zIndex}){
      const s=useState(),project=store.projectRecord(projectId),people=store.people().filter(p=>p.id!==s.actorId&&(!projectId||project?.humans.some(m=>m.id===p.id)));
      return h(MemberPicker,{key:projectId+':'+s.actorId,title,visible,zIndex,withName:true,memberLabel:'群成员',submit:submitLabel,items:[...humanItems(people),...cloneItems(s.actorId,projectId)],emptyTitle:projectId?'项目内暂无其他可选成员':'暂无可选成员',onCancel:onClose,onSubmit:(chosen,name)=>{const id='group-'+Date.now().toString(36);store.transaction(staged=>{staged.createGroup(id,name,projectId,s.actorId,chosen.filter(p=>p.kind==='clone').map(p=>p.id));chosen.filter(p=>p.kind==='human').forEach(p=>staged.addMember(id,s.actorId,p.id));});onCreated(id);onClose();}});
    }
    function FileLibrarySave({file,source,onClose,onSaved,allowedKinds}){
      const s=useState(),actor=s.actorId;
      R.useSyncExternalStore(files.subscribe,files.getSnapshot);
      const allTargets=files.writableSpaces(actor),targets=allowedKinds?.length?allTargets.filter(item=>allowedKinds.includes(item.kind)):allTargets;
      const defaultTarget=source?.projectId&&targets.some(item=>item.id===source.projectId)?source.projectId:files.personalSpace(actor);
      const [formApi,,values]=Form.useForm(),target=values.target??defaultTarget;
      const [savedId,setSavedId]=R.useState(null);
      const submission=useSubmission({active:!!file&&!savedId,resetKey:[file?.id,file?.name,source?.messageId,actor].join(':'),onSubmit:save});
      R.useEffect(()=>{const next=source?.projectId&&targets.some(item=>item.id===source.projectId)?source.projectId:files.personalSpace(actor);if(file){formApi.reset();formApi.setValues({target:next,parentId:0});}setSavedId(null);},[file?.id,file?.name,source?.messageId,actor]);
      const targetInfo=targets.find(item=>item.id===target),folders=target?files.list(target,actor).filter(item=>item.type==='folder'&&!item.deletedAt):[];
      const folderName=id=>{const names=[];let current=folders.find(item=>item.id===id),guard=0;while(current&&guard++<20){names.unshift(current.name);current=folders.find(item=>item.id===current.parent_id);}return names.join(' / ');};
      const folderOptions=[{value:0,label:'文件库根目录'},...folders.map(item=>({value:item.id,label:folderName(item.id)}))];
      const sourceLabel=source?.type==='ai-conversation'?'我的 Agent · '+(source.identityName||'AI'):source?.type==='chat'?'私聊 · '+(source.senderName||source.conversationTitle||'会话成员'):'群聊 · '+(source?.groupName||source?.conversationTitle||'来源群');
      function save(values){const id=files.saveConversationFile(actor,values.target,values.parentId??0,file,source);const record=files.snapshot(actor).find(item=>item.id===id);root.EvaFileMessage.markSaved(file,source,record);setSavedId(id);onSaved?.(record);}
      const open=()=>{if(savedId&&typeof root.__evaOpenDriveFile==='function')root.__evaOpenDriveFile(savedId);onClose();};
      return h(Modal,{className:'eva-members-modal eva-file-save-modal',title:savedId?'已存到文件库':'存到文件库',visible:!!file,onCancel:onClose,footer:h(Actions,{onCancel:onClose,cancelLabel:savedId?'关闭':'取消',form:savedId?undefined:submission.formProps.id,onSubmit:savedId?open:undefined,busy:submission.busy,submitLabel:savedId?'打开所在位置':'确认保存'}),width:520},file&&h(Form,{...submission.formProps,form:formApi,initValues:{target:defaultTarget,parentId:0},className:'eva-file-save-form'},
        h('div',{className:'eva-file-save-modal__file'},h('strong',{'data-eva-tooltip':file.name,'data-eva-tooltip-clamp':''},file.name),h('span',null,sourceLabel)),
        !savedId&&h(R.Fragment,null,
          h('div',{className:'eva-members-field'},h('label',{id:'eva-file-save-target-label',htmlFor:'eva-file-save-target'},'目标文件库'),h(Form.Select,{field:'target',noLabel:true,id:'eva-file-save-target','aria-label':'目标文件库',className:'eva-members-select',onChange:()=>formApi.setValue('parentId',0),rules:[{required:true,message:'请选择目标文件库'}],optionList:targets.map(item=>({value:item.id,label:item.name}))})),
          h('div',{className:'eva-members-field'},h('label',{id:'eva-file-save-folder-label',htmlFor:'eva-file-save-folder'},'目标文件夹'),h(Form.Select,{field:'parentId',noLabel:true,id:'eva-file-save-folder','aria-label':'目标文件夹',className:'eva-members-select',optionList:folderOptions})),
          targetInfo&&targetInfo.kind!=='personal'&&h('div',{className:'eva-members-notice'},h('strong',null,'保存后，目标文件库成员可访问该文件'),h('p',null,'不会因此获得原会话、其他消息或其他附件的访问权限。')),
          h('p',{className:'eva-members-muted'},'保存后会生成独立文件，并保留来源信息。')),
        savedId&&h('div',{className:'eva-members-notice'},h('strong',null,'保存成功'),h('p',null,'已生成独立文件，并保留来源信息。')),
        h(SubmissionError,{submission})));
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
      // ── 检索 ─────────────────────────────────────────────
      const needle=query.normalize('NFKC').toLocaleLowerCase();
      // 一旦开始检索，切换为单列相关度排序，不再展示分组与类型筛选。
      const searching=!!needle;
      // 名称子串匹配（拼音 / 首字母匹配已移除）。
      const match=m=>!needle||m.name.normalize('NFKC').toLocaleLowerCase().includes(needle);

      // ── 候选：唯一数据源 ─────────────────────────────────
      // 本人真人不出现在提及候选；项目管家不进入提及体系；本人 AI 分身保留。
      const isExcluded=m=>m.kind==='project-agent'||(m.kind==='human'&&m.id===s.actorId);
      const candidates=(sourceGroups?sourceGroups.flatMap(group=>group.items||[]):members).filter(m=>!isExcluded(m));
      const matched=candidates.filter(match);

      // ── 相关度排序（仅检索态使用）────────────────────────
      // 名称精确 > 名称前缀 > 名称包含；同级按命中位置、名称长度、原候选顺序。
      const rankName=m=>m.name.normalize('NFKC').toLocaleLowerCase();
      const rankIndex=m=>{const index=rankName(m).indexOf(needle);return index<0?Number.MAX_SAFE_INTEGER:index;};
      const relevance=m=>{const name=rankName(m),index=name.indexOf(needle);return name===needle?3:index===0?2:index>0?1:0;};
      const ranked=[...matched].sort((a,b)=>relevance(b)-relevance(a)||rankIndex(a)-rankIndex(b)||rankName(a).length-rankName(b).length);

      // ── 广播行 ───────────────────────────────────────────
      const aiCandidates=candidates.filter(m=>m.kind!=='human');
      const humanCount=candidates.length-aiCandidates.length;
      // 会话内有多个真人成员才提供「所有人」；AI 小队只有本人，自然被排除。
      const isTeam=!!sourceMembers;
      const aiSubtitle=(()=>{const hasClone=aiCandidates.some(m=>m.kind==='clone');const hasEmployee=aiCandidates.some(m=>m.kind==='employee');if(hasClone&&hasEmployee)return '提及所有 AI 分身与数字员工';if(hasEmployee)return '提及所有 AI 数字员工';if(hasClone)return '提及所有 AI 分身';return '提及所有 AI';})();
      let itemIndex=0;
      // ── 分组模型 ─────────────────────────────────────────
      // 任务评论按来源分组；我的 AI 小队按 AI 身份类型；普通 IM 按联系人 / AI 分身 / 数字员工。
      // 顺序固定，只渲染有结果的分组；分组标题仅在 ≥2 个有效分组时显示。
      const teamGroups=[{kind:'persona',title:'云端分身',items:matched.filter(m=>m.role==='persona')},{kind:'assistant',title:'个人助理',items:matched.filter(m=>m.role==='assistant')},{kind:'digital',title:'数字员工',items:matched.filter(m=>m.role!=='persona'&&m.role!=='assistant'&&m.kind!=='human')}];
      const kindGroups=[{kind:'human',title:'联系人',items:matched.filter(m=>m.kind==='human')},{kind:'clone',title:'AI 分身',items:matched.filter(m=>m.kind==='clone')},{kind:'employee',title:'数字员工',items:matched.filter(m=>m.kind==='employee')}];
      const baseGroups=(sourceGroups?sourceGroups.map(group=>({kind:group.kind,title:group.label,items:(group.items||[]).filter(m=>!isExcluded(m)).filter(match)})):isTeam?teamGroups:kindGroups).filter(group=>group.items.length);
      const effectiveKind=activeKind&&baseGroups.some(group=>group.kind===activeKind)?activeKind:null;
      const groups=effectiveKind?baseGroups.filter(group=>group.kind===effectiveKind):baseGroups;

      // ── 顶部类型筛选：仅未检索且 ≥2 个分组时出现 ───────────
      const chips=searching||baseGroups.length<2?null:h('div',{className:'eva-im-mention-chips',role:'group','aria-label':'按类型筛选'},
        h('button',{type:'button','data-eva-mention-kind':'all',className:'eva-im-mention-chip'+(effectiveKind?'':' is-active'),'aria-pressed':!effectiveKind,onMouseDown:e=>e.preventDefault(),onClick:()=>{setActiveKind(null);onActiveChange?.(0);}},'全部',h('span',{className:'eva-im-mention-chip-count'},baseGroups.reduce((sum,group)=>sum+group.items.length,0))),
        baseGroups.map(group=>h('button',{type:'button',key:group.kind,'data-eva-mention-kind':group.kind,className:'eva-im-mention-chip'+(effectiveKind===group.kind?' is-active':''),'aria-pressed':effectiveKind===group.kind,onMouseDown:e=>e.preventDefault(),onClick:()=>{setActiveKind(group.kind);onActiveChange?.(0);}},group.title,h('span',{className:'eva-im-mention-chip-count'},group.items.length))));
      const candidateProps=()=>{const index=itemIndex++;return {className:index===activeIndex?'is-active':'',onMouseMove:()=>onActiveChange?.(index),onFocus:()=>onActiveChange?.(index)};};
      const identityRow=(m,badge)=>h('span',{className:'eva-members-human-identity'},root.EvaAIIdentity.avatar(m.identityAppearance||m.appearance,32,h),h('span',{className:'eva-identity-copy'},h('span',{className:'eva-identity-name-row'},h('span',{className:'eva-identity-name-text','data-eva-tooltip':m.name,'data-eva-tooltip-clamp':''},m.name),badge&&root.EvaAIIdentity.badge(h))));
      const memberButton=m=>h('button',{type:'button',key:m.id,...candidateProps(),onMouseDown:e=>e.preventDefault(),onClick:()=>choose(m.name,m.id,m)},(m.identityAppearance||m.appearance)?identityRow(m,m.kind!=='squad'):['project-agent','employee'].includes(m.kind)?h(ProjectAgentIdentity,{agent:m}):m.kind==='clone'?h(CloneIdentity,{clone:store.clone(m.id)}):h(HumanIdentity,{id:m.id}));
      // 展示密度：未检索、未展开时每组默认只显示 5 条，超出用「展开其余 N 个」；展开后取消该组上限。
      const perGroupDefault=5;
      const groupRow=group=>h(R.Fragment,{key:group.kind||group.title},groups.length>1&&h('div',{className:'eva-im-mention-group'},group.title),(expanded[group.kind]?group.items:group.items.slice(0,perGroupDefault)).map(memberButton),group.items.length>perGroupDefault&&!expanded[group.kind]&&h('button',{type:'button','data-eva-mention-more':group.kind,className:'eva-im-mention-more',onMouseDown:e=>e.preventDefault(),onClick:()=>setExpanded(previous=>({...previous,[group.kind]:true}))},'展开其余 '+(group.items.length-perGroupDefault)+(group.kind==='human'?' 位':' 个')));
      const grouped=!searching;
      const hasRows=grouped?groups.length>0:ranked.length>0;
      const rowBody=grouped?groups.map(groupRow):ranked.map(memberButton);
      return h('section',{ref:panel,className:'eva-im-mention-picker',role:'dialog','aria-label':'提及成员',onKeyDown:e=>{if(e.key==='Escape'){e.preventDefault();e.stopPropagation();onClose();}if(e.key==='ArrowDown'||e.key==='ArrowUp'){const items=Array.from(panel.current.querySelectorAll('input,button'));const index=items.indexOf(document.activeElement);e.preventDefault();items[(index+(e.key==='ArrowDown'?1:-1)+items.length)%items.length]?.focus();}}},
        h('div',{className:'eva-im-mention-heading'},h('span',null,'提及成员')),
        chips,
        h('div',{className:'eva-im-mention-options'},broadcast&&!needle&&!effectiveKind&&(humanCount>0||aiCandidates.length>0)&&h(R.Fragment,null,humanCount>0&&h('button',{type:'button',...candidateProps(),onMouseDown:e=>e.preventDefault(),onClick:()=>choose('所有人','all')},h('span',{className:'eva-im-mention-all'},'@'),h('span',{className:'eva-im-mention-broadcast-copy'},'所有人',!isTeam&&h('small',null,'提及所有联系人'))),aiCandidates.length>0&&h('button',{type:'button',...candidateProps(),onMouseDown:e=>e.preventDefault(),onClick:()=>choose('所有 AI 成员','ai')},h('span',{className:'eva-im-mention-all'},'@'),h('span',{className:'eva-im-mention-broadcast-copy'},h('span',{className:'eva-identity-name-row'},h('span',{className:'eva-identity-name-text'},'所有 AI 成员'),root.EvaAIIdentity.badge(h)),!isTeam&&h('small',null,aiSubtitle)))),
          rowBody,
          needle&&!hasRows&&h('p',{className:'eva-im-mention-empty'},'没有匹配的成员')));
    }
    const cards=root.EvaIdentityCard.create({React:R,Modal:LegacyModal,Button,Switch,BackIcon,ProjectIcon,CameraIcon,ChevronRight,useNavigate},store);
    const ChatSettings=root.EvaChatSettings.create({React:R,forms,MarkdownView,TextArea,Card,PermissionList,FileTextIcon,SettingsIcon,Button,Modal,Input,Switch,Tag,PlusIcon,CircleMinusIcon,UserCogIcon,UserMinusIcon,TrashIcon,CloseIcon,BackIcon,SearchIcon,HumanIdentity,CloneIdentity,ProjectAgentIdentity,MemberPicker,SinglePersonPicker,humanItems,cloneItems,useState,IdentityCard:cards.IdentityCard,ProjectIdentity:cards.ProjectIdentity,AvatarEditor:cards.AvatarEditor,readAvatarFile:cards.readAvatarFile,useNavigate,Toast},store);
    return {...cards,HumanIdentity,ChatSettings,Members,ActorPicker,useState,MemberPicker,SinglePersonPicker,CreateGroup,FileLibrarySave,FileTransfer,MentionPicker,projectCreateCandidates};
  }};
})(window);
