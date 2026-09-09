(function(root){
  'use strict';
  // Components receive the runtime's existing React and Semi instances.
  root.EvaMembersUI={create({React:R,Button,Select,Modal,Table,Input,Tag,Checkbox,Radio,Switch,PlusIcon,CloseIcon,BackIcon,useNavigate},store,files){
    const h=R.createElement;
    function HumanIdentity({id,detail,compact=false}){const person=store.person(id);return h('span',{className:'eva-members-human-identity'+(compact?' is-compact':'')},h('img',{className:'eva-members-human-avatar',alt:'',src:id==='u-wangyilin'?root.__EVA_CURRENT_USER_PORTRAIT:root.EvaAvatar.personUri(id)}),h('span',{className:'eva-members-human-copy'},h('span',{className:'eva-members-human-name'},person?.name||id),detail&&h('span',{className:'eva-members-human-role'},detail)));}
    function CloneIdentity({clone}){return h('span',{className:'eva-members-ai-identity'},root.EvaAIIdentity.avatar(root.EvaAIIdentity.cloneAppearance(store.person(clone.ownerId)),32,h),h('span',{className:'eva-identity-copy'},h('span',{className:'eva-identity-name-row'},h('span',{className:'eva-identity-name-text'},clone.name),root.EvaAIIdentity.badge(h))));}
    function ProjectAgentIdentity({agent,size=32}){return h('span',{className:'eva-members-ai-identity'},root.EvaAIIdentity.avatar(agent.identityAppearance||root.EvaAIIdentity.projectAgentAppearance(),size,h),h('span',null,agent.name),root.EvaAIIdentity.badge(h));}
    const roleNames={owner:'负责人',admin:'管理员',member:'成员'};
    const PickerPreview=root.EvaPickerPreview.create({React:R,Button,Select,Modal,Input,Tag,Checkbox,Radio},store);
    const SelectionBody=PickerPreview.SelectionBody;
    function humanItems(people,pid,groupHint=false){const s=store.snapshot(),p=s.projects[pid],rank={owner:0,admin:1,member:2};return people.filter(person=>!root.__EVA_MEMBER_DEMO_IDS||root.__EVA_MEMBER_DEMO_IDS.includes(person.id)).map(person=>{const role=p?.humans.find(m=>m.id===person.id)?.role;return {...person,kind:'human',projectRole:role,detail:roleNames[role]||'',selectionHint:groupHint&&['owner','admin'].includes(role)?'加入后拥有群管理权限':''};}).sort((a,b)=>(rank[a.projectRole]??3)-(rank[b.projectRole]??3));}
    function cloneItems(actorId,pid,scopeId){const s=store.snapshot(),scope=s.projects[scopeId]||s.groups[scopeId];return s.clones.filter(c=>c.ownerId===actorId&&c.active!==false&&(!pid||s.projects[pid]?.cloneIds.includes(c.id))&&!scope?.cloneIds.includes(c.id)).map(c=>({...c,kind:'clone'}));}
    function MemberPicker({visible,title,items,onCancel,onSubmit,single=false,allowEmpty=false,submit='确认添加',withName=false,humanHint}){
      const [ids,setIds]=R.useState([]),[name,setName]=R.useState(''),[error,setError]=R.useState('');
      R.useEffect(()=>{setIds([]);setName('');setError('');},[visible,title]);
      const chosen=items.filter(p=>ids.includes(p.id)&&!p.disabled),valid=(allowEmpty||chosen.length>0)&&(!withName||!!name.trim());
      return h(Modal,{className:'eva-members-modal eva-picker-modal',width:640,title,visible,onCancel,footer:null},withName&&h('div',{className:'eva-picker-heading'},h(Input,{'aria-label':'群聊名称',placeholder:'群聊名称',value:name,onChange:setName})),h(SelectionBody,{items,selected:chosen.map(p=>p.id),onChange:setIds,single,humanHint}),chosen.length>0&&h('div',{className:'eva-picker-selected'},h('div',{className:'eva-picker-selection-title'},h('span',null,'已选 '+chosen.length+' 位'),h(Button,{size:'small',theme:'borderless',type:'tertiary',onClick:()=>setIds([])},'清空')),h('div',{className:'eva-picker-chips'},chosen.map(p=>h(Button,{key:p.id,size:'small',theme:'borderless','aria-label':'取消选择'+p.name,onClick:()=>setIds(ids.filter(id=>id!==p.id))},p.kind==='clone'?h(CloneIdentity,{clone:p}):h(HumanIdentity,{id:p.id,compact:true}))))),error&&h('p',{role:'alert',className:'eva-members-error'},error),h('div',{className:'eva-picker-footer'},h(Button,{onClick:onCancel},'取消'),h(Button,{theme:'solid',disabled:!valid,onClick:()=>{try{onSubmit(chosen,name.trim());}catch(e){setError(e.message);}}},typeof submit==='function'?submit(chosen):submit)));
    }
    function useState(){R.useSyncExternalStore(store.subscribe,store.getSnapshot);return store.snapshot();}
    function CloneChoice({actorId,projectId,value,onChange}){
      const s=useState();const choices=s.clones.filter(c=>c.ownerId===actorId&&c.active!==false&&(!projectId||s.projects[projectId]?.cloneIds.includes(c.id)));
      return h('div',{className:'eva-members-field'},h(SelectionBody,{items:choices.map(c=>({...c,kind:'clone'})),selected:value||[],onChange}));
    }
    function ActorPicker(){const s=useState();return h('div',{className:'eva-members-actor'},h('span',null,'演示身份'),h(Select,{value:s.actorId,optionList:s.people.filter(p=>p.active!==false).map(p=>({value:p.id,label:h(HumanIdentity,{id:p.id,compact:true})})),onChange:id=>store.setActor(id)}));}
    function AccountSwitcher({onAccount}){
      const s=useState(),[open,setOpen]=R.useState(false);
      return h(R.Fragment,null,h(Button,{className:'eva-account-switcher',theme:'borderless',type:'tertiary','aria-label':'当前项目演示身份：'+(store.person(s.actorId)?.name||'王宜林')+'，切换项目演示身份',onClick:()=>setOpen(true)},h(HumanIdentity,{id:s.actorId})),h(Modal,{className:'eva-members-modal',title:'切换项目演示身份',visible:open,footer:null,onCancel:()=>setOpen(false)},h('p',{className:'eva-members-muted'},'用于项目及群聊成员演示；个人 Eva 和我的 AI 固定使用王宜林的数据。'),h('div',{className:'eva-account-options'},s.people.filter(p=>p.active!==false&&(!root.__EVA_MEMBER_DEMO_IDS||root.__EVA_MEMBER_DEMO_IDS.includes(p.id))).map(p=>h(Button,{key:p.id,theme:p.id===s.actorId?'light':'borderless',type:p.id===s.actorId?'primary':'tertiary',onClick:()=>{store.setActor(p.id);setOpen(false);}},h(HumanIdentity,{id:p.id}),p.id===s.actorId&&h('span',{className:'eva-members-muted'},'当前')))),onAccount&&h(Button,{theme:'borderless',type:'tertiary',onClick:()=>{setOpen(false);onAccount();}},'账号设置')));
    }
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
        {title:'操作',width:220,align:'right',render:(_,row)=>row.kind==='employee'?(canEdit&&(manage||row.by===actor)&&h(Button,{size:'small',theme:'borderless',type:'danger',onClick:()=>openAction('removeEmployee',{id:row.id})},'移除')):row.kind!=='project-agent'&&canEdit&&h('div',{className:'eva-members-actions'},rowClones(row.id).length>0&&(manage||row.id===actor)&&h(Button,{size:'small',theme:'borderless',type:'tertiary',onClick:()=>setDetails(row.id)},'管理分身'),isProject&&scope.ownerId===actor&&row.id!==actor&&h(Button,{size:'small',theme:'borderless',type:'tertiary',onClick:()=>run(()=>store.setAdmin(sid,actor,row.id,row.role!=='admin'))},row.role==='admin'?'取消管理员':'设为管理员'),scope.ownerId===actor&&row.id===actor&&h(Button,{size:'small',theme:'borderless',type:'tertiary',onClick:()=>openAction('transfer',{})},'转让'),((manage&&scope.ownerId!==row.id)||row.id===actor)&&h(Button,{size:'small',theme:'borderless',type:'danger',onClick:()=>openAction('remove',{id:row.id})},row.id===actor?'退出':'移除'))}];
      if(isProject)columns.splice(1,0,{title:'项目角色',width:160,render:(_,row)=>h('span',{className:'eva-members-muted'},store.memberRoles(sid,row.id).map(r=>r.name).join('、')||'-')});
      return h('section',{className:'eva-members'},sid==='prod'&&new URLSearchParams(root.location.search).has('picker-preview')&&h(PickerPreview),h('div',{className:'eva-members-toolbar'},h('div',null,h('h3',null,isProject?'项目成员':'群聊成员'),h('p',{className:'eva-members-muted'},joined?`${scope.humans.length} 位人类 · ${scope.cloneIds.length} 个个人分身${store.projectAgent(isProject?sid:scope.projectId)?" · 1 个项目分身":""}`:"尚未加入")),h('div',{className:'eva-members-actions'},isProject&&canEdit&&manage&&h(Button,{theme:'light',type:'tertiary',onClick:()=>setRoleMember(actor)},'角色设置'),canEdit&&h(Button,{theme:'solid',type:'primary',onClick:()=>{setAddOpen(true);setError('');}},'添加成员'))),
        all&&h('p',{className:'eva-members-notice'},'全员群与项目成员保持一致。请前往项目设置 → 成员管理调整成员。'),
        error&&h('p',{role:'alert',className:'eva-members-error'},error),
        joined?h(R.Fragment,null,h(Table,{className:'eva-members-table',rowKey:'id',pagination:false,columns,dataSource:[...humanItems(humanRows,isProject?sid:scope.projectId),...store.members(sid).filter(m=>['project-agent','employee'].includes(m.kind))],empty:'暂无成员'}),!isProject&&scope.ownerId===actor&&h(Button,{type:'danger',theme:'light',onClick:()=>openAction('dissolve',{})},'解散群聊')):h('p',{className:'eva-members-notice'},'尚未加入，不能查看成员或项目内容。请联系当前成员将你添加进来。'),
        isProject&&h(RoleAssignment,{projectId:sid,memberId:roleMember,onMemberChange:setRoleMember,onClose:()=>setRoleMember(null)}),
        h(cards.IdentityCard,{identity:identityProfile,onClose:()=>setIdentityProfile(null)}),
        h(MemberPicker,{key:sid+actor,visible:addOpen,title:isProject?'添加项目成员':'添加群聊成员',submit:'确认添加',items:joined&&!all?[...humanItems(store.candidates(sid,actor),scope.projectId,!isProject),...cloneItems(actor,scope.projectId,sid)]:[],onCancel:()=>setAddOpen(false),onSubmit:chosen=>{store.transaction(staged=>{chosen.forEach(p=>p.kind==='clone'?staged.addClone(sid,actor,p.id):staged.addMember(sid,actor,p.id));});setAddOpen(false);}}),
        h(MemberPicker,{key:'transfer'+sid+actor,visible:action?.type==='transfer',title:isProject?'转让项目负责人':'转让群主',single:true,submit:'确认转让',items:humanItems(humanRows.filter(p=>p.id!==actor),isProject?sid:scope.projectId),onCancel:()=>setAction(null),onSubmit:chosen=>{store.transfer(sid,actor,chosen[0].id);setAction(null);}}),
        h(Modal,{className:'eva-members-modal',title:({remove:'确认移除成员',removeEmployee:'确认移除数字员工',transfer:isProject?'转让负责人':'转让群主',dissolve:'解散群聊'})[action?.type]||'',visible:!!action&&action.type!=='transfer',onCancel:()=>setAction(null),onOk:confirm,okText:'确认',cancelText:'取消'},action?.type==='removeEmployee'&&h(ProjectAgentIdentity,{agent:store.employee(action.id)}),action?.type==='removeEmployee'&&h('p',null,'移除后将不能在该范围内提及此数字员工，历史内容保留。'),action?.type==='remove'&&h(HumanIdentity,{id:action.id}),action?.type==='remove'&&h('p',null,`确认${action.id===actor?'退出':'移除 '+name(action.id)}？${isProject?'其分身及项目内群聊关系将一并移除。':'其分身也会离开本群。'}历史内容保留。负责人或群主须先转让。`),action?.type==='remove'&&isProject&&Object.values(s.groups).filter(g=>g.projectId===sid&&g.ownerId===action.id).map(g=>h('div',{key:g.id,className:'eva-members-field'},h('label',null,g.name),g.humans.length===1?h('p',{className:'eva-members-muted'},'该成员是唯一人类，退出时自动解散此群及子区'):h(Select,{className:'eva-members-select',placeholder:'选择群主接任者',value:successors[g.id],onChange:id=>setSuccessors({...successors,[g.id]:id}),optionList:g.humans.filter(m=>m.id!==action.id).map(m=>({value:m.id,label:h(HumanIdentity,{id:m.id,compact:true})}))}))),action?.type==='dissolve'&&h('p',null,'群聊及子区将不再可访问。'),error&&h('p',{role:'alert',className:'eva-members-error'},error)),
        h(Modal,{className:'eva-members-modal',title:details?name(details)+'的分身':'分身',visible:!!details&&!identityProfile,onCancel:()=>setDetails(null),footer:null},details&&rowClones(details).map(c=>h('div',{className:'eva-members-clone-row',key:c.id},h(Button,{theme:'borderless',type:'tertiary',onClick:()=>setIdentityProfile(c.id)},h(CloneIdentity,{clone:c})),canEdit&&(actor===details||manage)&&h(Button,{type:'danger',theme:'light',onClick:()=>run(()=>store.removeClone(sid,actor,c.id))},'移除分身')))));
    }
    function CreateGroup({projectId,visible,onClose,onCreated}){
      const s=useState(),people=s.people.filter(p=>p.active!==false&&p.id!==s.actorId&&(!projectId||s.projects[projectId]?.humans.some(m=>m.id===p.id)));
      return h(MemberPicker,{key:projectId+':'+s.actorId,title:'新建群聊',visible,withName:true,submit:'创建群聊',items:[...humanItems(people,projectId,true),...cloneItems(s.actorId,projectId)],onCancel:onClose,onSubmit:(chosen,name)=>{const id='group-'+Date.now().toString(36);store.transaction(staged=>{staged.createGroup(id,name,projectId,s.actorId,chosen.filter(p=>p.kind==='clone').map(p=>p.id));chosen.filter(p=>p.kind==='human').forEach(p=>staged.addMember(id,s.actorId,p.id));});onCreated(id);onClose();}});
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
      const folderOptions=[{value:0,label:'空间根目录'},...folders.map(item=>({value:item.id,label:folderName(item.id)}))];
      const sourceLabel=source?.type==='ai-conversation'?'我的 AI · '+(source.identityName||'AI'):source?.type==='chat'?'私聊 · '+(source.senderName||source.conversationTitle||'会话成员'):'群聊 · '+(source?.groupName||source?.conversationTitle||'来源群');
      const save=()=>{try{if(!target)throw Error('请选择目标空间');const id=files.saveConversationFile(actor,target,parentId,file,source);const record=files.snapshot(actor).find(item=>item.id===id);root.EvaFileMessage.markSaved(file,source,record);setSavedId(id);setError('');onSaved?.(record);}catch(e){setError(e.message||'保存失败');}};
      const open=()=>{if(savedId&&typeof root.__evaOpenDriveFile==='function')root.__evaOpenDriveFile(savedId);onClose();};
      return h(Modal,{className:'eva-members-modal eva-file-save-modal',title:savedId?'已存到文件库':'存到文件库',visible:!!file,onCancel:onClose,footer:null,width:520},file&&h(R.Fragment,null,
        h('div',{className:'eva-file-save-modal__file'},h('strong',{title:file.name},file.name),h('span',null,sourceLabel)),
        !savedId&&h(R.Fragment,null,
          h('div',{className:'eva-members-field'},h('label',null,'目标空间'),h(Select,{className:'eva-members-select',value:target,onChange:value=>{setTarget(value);setParentId(0);setError('');},optionList:targets.map(item=>({value:item.id,label:item.name}))})),
          h('div',{className:'eva-members-field'},h('label',null,'目标文件夹'),h(Select,{className:'eva-members-select',value:parentId,onChange:setParentId,optionList:folderOptions})),
          targetInfo&&targetInfo.kind!=='personal'&&h('div',{className:'eva-members-notice'},h('strong',null,'保存后，目标空间成员可访问该文件'),h('p',null,'不会因此获得原会话、其他消息或其他附件的访问权限。')),
          h('p',{className:'eva-members-muted'},'文件只有在你确认后才会存入文件库，系统关联由来源自动生成。')),
        savedId&&h('div',{className:'eva-members-notice'},h('strong',null,'保存成功'),h('p',null,'已生成独立文件，并保留只读的来源关联。')),
        error&&h('p',{role:'alert',className:'eva-members-error'},error),
        h('div',{className:'eva-picker-footer'},h(Button,{onClick:onClose},savedId?'关闭':'取消'),h(Button,{theme:'solid',type:'primary',onClick:savedId?open:save},savedId?'打开所在位置':'确认保存'))));
    }
    function FileTransfer({file,source,onClose}){
      return h(FileLibrarySave,{file,source:{...source,type:'group',conversationId:source?.threadId||source?.groupId,messageId:source?.messageId||((source?.threadId||source?.groupId)+':'+(file?.id||file?.name)),projectId:source?.projectId},allowedKinds:['project'],onClose});
    }
    function MentionPicker({scopeId,members:sourceMembers,visible,onClose,onChoose}){
      const s=useState(),members=sourceMembers||(scopeId&&store.canRead(scopeId,s.actorId)?store.groupMembers(scopeId):[]);
      return h(Modal,{className:'eva-members-modal',title:'提及成员',visible,onCancel:onClose,footer:null},h('p',{className:'eva-members-muted'},sourceMembers?'选择需要协作的 AI；所有人只通知人类。':'每位成员都可以提及项目 AI；所有人只通知人类。'),h('div',{className:'eva-members-mention-list'},h(Button,{onClick:()=>{onChoose('所有人');onClose();}},'所有人（'+members.filter(m=>m.kind==='human').length+' 位人类）'),members.map(m=>h(Button,{key:m.id,theme:'borderless',onClick:()=>{onChoose(m.name);onClose();}},m.identityAppearance?h('span',{className:'eva-members-human-identity'},root.EvaAIIdentity.avatar(m.identityAppearance,32,h),h('span',{className:'eva-identity-copy'},h('span',{className:'eva-identity-name-row'},h('span',{className:'eva-identity-name-text'},m.name),root.EvaAIIdentity.badge(h)))):['project-agent','employee'].includes(m.kind)?h(ProjectAgentIdentity,{agent:m}):m.kind==='clone'?h(CloneIdentity,{clone:store.clone(m.id)}):h(HumanIdentity,{id:m.id})))));
    }
    const cards=root.EvaIdentityCard.create({React:R,Modal,Button,BackIcon,useNavigate},store);
    const ChatSettings=root.EvaChatSettings.create({React:R,Button,Modal,Input,Switch,PlusIcon,CloseIcon,BackIcon,HumanIdentity,CloneIdentity,ProjectAgentIdentity,MemberPicker,humanItems,cloneItems,useState,IdentityCard:cards.IdentityCard,useNavigate},store);
    return {...cards,HumanIdentity,ChatSettings,AccountSwitcher,Members,CloneChoice,ActorPicker,useState,CreateGroup,FileLibrarySave,FileTransfer,MentionPicker};
  }};
})(window);
