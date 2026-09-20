/* Octo-Web ChannelSetting adaptation, Apache-2.0.
 * Source: Mininglamp-OSS/octo-web c2e2aee, features/channelSetting and ui/ChannelSettingRows.
 * Eva adapter replaces server services with the shared prototype membership store.
 * Panel state belongs here; it never replaces or rekeys the conversation underneath.
 */
(function(root){
'use strict';
root.EvaChatSettings={create(ui,store){
 const {React:R,Button,Modal,Input,Switch,Tag,PlusIcon,CircleMinusIcon,CloseIcon,BackIcon,SearchIcon,HumanIdentity,CloneIdentity,ProjectAgentIdentity,MemberPicker,SinglePersonPicker,humanItems,cloneItems,useState,IdentityCard,ProjectIdentity,AvatarEditor,readAvatarFile,useNavigate}=ui,h=R.createElement;
 function Row({title,value,onClick,danger=false}){return h(onClick?'button':'div',{type:onClick?'button':undefined,className:'eva-chat-setting-row'+(danger?' is-danger':''),onClick},h('span',null,title),value!==undefined&&h('span',{className:'eva-chat-setting-value'},value));}
 function Toggle({title,value,onChange,disabled=false}){return h('div',{className:'eva-chat-setting-row'},h('span',null,title),h(Switch,{'aria-label':title,checked:!!value,onChange,size:'small',disabled}));}
 function EditRow({title,value='',maxLength=50,multiline=false,allowEmpty=true,onSave,readOnly=false}){
  const [editing,setEditing]=R.useState(false),[draft,setDraft]=R.useState(''),[error,setError]=R.useState('');
  if(!editing)return h(Row,{title,value:value||'未设置',onClick:readOnly?undefined:()=>{setDraft(value);setError('');setEditing(true);}});
  return h('div',{className:'eva-chat-setting-edit'},h('label',null,title),multiline?h('textarea',{'aria-label':title,value:draft,maxLength,onChange:e=>setDraft(e.target.value),rows:5}):h(Input,{'aria-label':title,value:draft,maxLength,onChange:setDraft}),h('div',{className:'eva-chat-setting-edit-actions'},h('small',null,draft.length+' / '+maxLength),h(Button,{size:'small',theme:'borderless',onClick:()=>setEditing(false)},'取消'),h(Button,{size:'small',theme:'solid',disabled:draft===value||(!allowEmpty&&!draft.trim()),onClick:()=>{try{onSave(draft.trim());setEditing(false);}catch(e){setError(e.message);}}},'保存')),error&&h('p',{role:'alert'},error));
 }
 // Shared identity renderer and member tile for every member grid (group settings,
 // thread settings and the read-only full member list). One implementation only.
 function memberIdentity(p){return p.identityAppearance?h('span',{className:'eva-members-human-identity'},root.EvaAIIdentity.avatar(p.identityAppearance,32,h),h('span',{className:'eva-identity-name-row'},h('span',{className:'eva-members-human-name eva-identity-name-text',title:p.name},p.name),root.EvaAIIdentity.badge(h))):['project-agent','employee'].includes(p.kind)?h(ProjectAgentIdentity,{agent:p}):p.kind==='clone'?h(CloneIdentity,{clone:p}):h(HumanIdentity,{id:p.id});}
 function MemberTile({p,role,ownerId,onClick}){return h('button',{type:'button',className:'eva-chat-member-tile',onClick},(p.identityAppearance||p.kind==='clone')?h(R.Fragment,null,root.EvaAIIdentity.avatar(p.identityAppearance||(p.kind==='clone'?root.EvaAIIdentity.cloneAppearance(store.person(p.ownerId)):{name:p.name,sourceName:'Eva',avatar:p.avatar||root.__EVA_COLLEAGUE_PORTRAIT,logo:root.__EVA_COLLEAGUE_PORTRAIT}),48,h),h('span',{className:'eva-chat-tile-caption'},h('span',null,p.name),root.EvaAIIdentity.badge(h))):memberIdentity(p),role&&h('span',{className:'eva-chat-member-role'+(p.id===ownerId?' is-owner':'')},role));}
 function ChatSettings({channel,onClose,onManageProject,onClear,sessionInfoOnly=false,conversationActions,fixedGroupActions}){
  const navigate=useNavigate();
  const s=useState(),actor=s.actorId,id=channel.id,all=id.startsWith('all:'),sid=all?id.slice(4):id,g=s.groups[sid]||s.projects[sid],fixed=Array.isArray(channel.fixedMembers),group=fixed||!sessionInfoOnly&&!!g&&!channel.chatType?.includes('direct')&&!id.startsWith('dm-'),allowed=group&&store.canRead(id,actor),manage=allowed&&store.manager(id,actor),owner=allowed&&g.ownerId===actor;
  const settings=store.chatSettings(id),prefs=store.chatPreferences(id,actor),governance=group&&!fixed&&typeof store.groupGovernance==='function'?store.groupGovernance(id):{manualManagerIds:[],inheritedManagerIds:[],managerIds:[],botAdminIds:[],allowNoMention:true,groupMd:''},editableFixed=!!fixed&&!!fixedGroupActions?.onEditMembers,[page,setPage]=R.useState('main'),[picker,setPicker]=R.useState(null),[confirm,setConfirm]=R.useState(null),[error,setError]=R.useState(''),[profile,setProfile]=R.useState(null),[memberQuery,setMemberQuery]=R.useState(''),[groupMdEditing,setGroupMdEditing]=R.useState(false),[groupMdDraft,setGroupMdDraft]=R.useState(''),[avatarSource,setAvatarSource]=R.useState(null);
  const closeRef=R.useRef(null);
  R.useLayoutEffect(()=>{const previous=document.activeElement;closeRef.current?.focus({preventScroll:true});return()=>{if(previous?.isConnected)previous.focus({preventScroll:true});};},[]);
  R.useEffect(()=>{setPage('main');setPicker(null);setConfirm(null);setError('');setProfile(null);setMemberQuery('');setGroupMdEditing(false);setGroupMdDraft('');setAvatarSource(null);},[id,actor]);
  const run=fn=>{try{fn();setError('');return true;}catch(e){setError(e.message);return false;}};
  const update=patch=>store.setChatSettings(id,actor,patch),personal=patch=>store.setChatPreferences(id,actor,patch);
  const updateAvatar=avatar=>update({avatar});
  const members=fixed?channel.fixedMembers:allowed?store.groupMembers(id):[],humans=allowed?humanItems(g.humans.map(m=>({...store.person(m.id),...m})),g.projectId||sid):[],ordered=fixed?members:[...humans.map(p=>({...p,kind:'human'})),...members.filter(p=>p.kind!=='human')];
  const person=store.person(channel.personId),bot=store.clone(channel.identityId),name=settings.name||channel.name,projectContext=group&&allowed?store.conversationContext(id,actor):null,normalizedMemberQuery=memberQuery.trim().normalize('NFKC').toLocaleLowerCase(),visibleMembers=ordered.filter(p=>!normalizedMemberQuery||String(p.name||'').normalize('NFKC').toLocaleLowerCase().includes(normalizedMemberQuery));
  const identity=memberIdentity;
  const section=(...children)=>h('section',{className:'eva-chat-setting-section'},...children);
  const prefRows=section(h(Toggle,{title:'消息免打扰',value:prefs.mute,onChange:v=>run(()=>personal({mute:v}))}),h(Toggle,{title:'聊天置顶',value:conversationActions?conversationActions.pinned:prefs.top,onChange:v=>run(()=>conversationActions?conversationActions.togglePinned(v):personal({top:v}))}),group&&h(Row,{title:'清空聊天记录',danger:true,onClick:()=>setConfirm('clear')}));
  const title=page==='main'?(group?'聊天信息（'+members.length+'）':'聊天信息'):({members:'群聊成员（'+members.length+'）',manage:'群聊管理',groupmd:'GROUP.md'})[page];
  const role=p=>fixed?null:p.id===g?.ownerId?'群主':p.kind==='human'&&governance.managerIds.includes(p.id)?'管理员':null;
  const eligibleRemove=p=>p.kind==='project-agent'?false:p.kind==='employee'?(manage||p.by===actor):p.kind==='clone'?(manage||p.ownerId===actor):(manage&&p.id!==g.ownerId&&p.id!==actor);
  const openFixedAction=action=>{onClose();requestAnimationFrame(action);};
  const ownerSuccessors=owner?humans.filter(p=>p.id!==actor):[];
  const managerCandidates=humans.filter(p=>p.id!==g?.ownerId&&!governance.managerIds.includes(p.id));
  const botMembers=ordered.filter(p=>p.kind!=='human'),botAdminMembers=botMembers.filter(p=>governance.botAdminIds.includes(p.id)),botAdminCandidates=botMembers.filter(p=>!governance.botAdminIds.includes(p.id));
  const managementMember=(p,label)=>h('div',{className:'eva-chat-management-member-main'},identity(p),h(Tag,{className:'eva-chat-management-role-tag',color:'grey',size:'small'},label));
  const removeButton=(label,onClick)=>h(Button,{className:'eva-chat-management-remove',theme:'borderless',type:'tertiary',size:'small',icon:h(CircleMinusIcon,{size:20,strokeWidth:1.75}),'aria-label':label,onClick});
  const managementPage=page==='manage'&&manage&&h(R.Fragment,null,
   section(h('div',{className:'eva-chat-management-heading'},h('div',{className:'eva-chat-management-heading-main'},h('strong',null,'群主、管理员')),owner&&h(Button,{theme:'borderless',disabled:!managerCandidates.length,onClick:()=>setPicker('manager')},'添加管理员')),...ordered.filter(p=>p.kind==='human'&&role(p)).map(p=>h('div',{className:'eva-chat-member-list-row',key:p.id},managementMember(p,role(p)),owner&&governance.manualManagerIds.includes(p.id)&&!governance.inheritedManagerIds.includes(p.id)&&p.id!==g.ownerId&&removeButton('移除管理员 '+p.name,()=>run(()=>store.setGroupManager(id,actor,p.id,false)))))),
   section(h('div',{className:'eva-chat-management-heading'},h('div',{className:'eva-chat-management-heading-main'},h('strong',null,'Bot 管理员'),h('small',null,'可管理群资料、GROUP.md 和普通成员')),h(Button,{theme:'borderless',disabled:!botAdminCandidates.length,onClick:()=>setPicker('botAdmin')},'添加 Bot 管理员')),botAdminMembers.length?botAdminMembers.map(p=>h('div',{className:'eva-chat-member-list-row',key:p.id},managementMember(p,'Bot 管理员'),manage&&removeButton('移除 Bot 管理员 '+p.name,()=>run(()=>store.setGroupBotAdmin(id,actor,p.id,false))))):h('div',{className:'eva-chat-setting-row'},h('span',{className:'eva-members-muted'},'暂无 Bot 管理员'))),
   section(h('div',{className:'eva-chat-management-heading'},h('div',{className:'eva-chat-management-heading-main'},h('strong',null,'Bot 回复规则'))),h('div',{className:'eva-chat-management-setting'},h('div',{className:'eva-chat-management-setting-copy'},h('span',null,'允许 Bot 免 @ 回答'),h('small',null,'仅对已由主人开启免 @ 的 Bot 生效。关闭后，本群聊和子区中的所有 Bot 都必须被明确 @ 才会回答。')),h(Switch,{'aria-label':'允许 Bot 免 @ 回答',checked:governance.allowNoMention,onChange:value=>run(()=>store.setGroupAllowNoMention(id,actor,value)),size:'small'}))),
   !all&&owner&&section(h(Row,{title:'转让群主',onClick:()=>setPicker('transfer')}))
  );
  const groupMdPage=page==='groupmd'&&h(R.Fragment,null,h('p',{className:'eva-chat-settings-note'},'记录本群的协作约定，供群成员与 AI 参考。'),section(h('div',{className:'eva-chat-setting-edit'},h('label',{htmlFor:'eva-group-md-preview'},'GROUP.md'),h('textarea',{id:'eva-group-md-preview','aria-label':'GROUP.md 内容',rows:12,placeholder:'尚未配置 GROUP.md',readOnly:!groupMdEditing,value:groupMdEditing?groupMdDraft:governance.groupMd,onChange:e=>setGroupMdDraft(e.target.value)}),manage&&h('div',{className:'eva-chat-setting-edit-actions'},groupMdEditing?h(R.Fragment,null,h(Button,{theme:'borderless',onClick:()=>{setGroupMdEditing(false);setGroupMdDraft(governance.groupMd);}},'取消'),h(Button,{theme:'solid',disabled:groupMdDraft===governance.groupMd,onClick:()=>{if(run(()=>store.setGroupMd(id,actor,groupMdDraft)))setGroupMdEditing(false);}},'保存')):h(Button,{theme:'solid',onClick:()=>{setGroupMdDraft(governance.groupMd);setGroupMdEditing(true);}},'编辑')))));
  return h('aside',{className:'eva-chat-settings','aria-label':'聊天信息管理',onKeyDown:e=>{if(e.key==='Escape'&&!picker&&!confirm&&!profile){e.stopPropagation();page==='main'?onClose():setPage('main');}}},
   h('header',{className:'eva-chat-settings-head'},h('button',{ref:closeRef,type:'button','aria-label':page==='main'?'关闭聊天信息':'返回聊天信息',onClick:()=>page==='main'?onClose():setPage('main')},h(page==='main'?CloseIcon:BackIcon,{size:20})),h('h3',null,title)),
   h('div',{className:'eva-chat-settings-body'},error&&h('p',{role:'alert',className:'eva-members-error'},error),
    page==='main'&&h(R.Fragment,null,
     group?section(h('div',{className:'eva-chat-member-grid'},ordered.slice(0,19).map(p=>h(MemberTile,{key:p.id,p,role:role(p),ownerId:g.ownerId,onClick:()=>setProfile(p)})),(allowed&&!all||editableFixed)&&h('button',{type:'button',className:'eva-chat-member-add','aria-label':editableFixed?'添加 AI 团队成员':'添加群聊成员',onClick:editableFixed?()=>openFixedAction(fixedGroupActions.onEditMembers):()=>setPicker('add')},h(PlusIcon,{size:26}))),h(Row,{title:'查看全部 '+members.length+' 名成员',onClick:()=>{setMemberQuery('');setPage('members');}})):
      section(h('button',{className:'eva-chat-person-card',type:'button',onClick:()=>setProfile(sessionInfoOnly?{id:channel.identityId,name:channel.identityName,kind:'ai-direct',identityAppearance:channel.identityAppearance}:bot?{...bot,kind:'clone'}:person?{...person,kind:'human'}:{id,name:channel.name,kind:'external'})},sessionInfoOnly?identity({name:channel.identityName,identityAppearance:channel.identityAppearance}):bot?h(CloneIdentity,{clone:bot}):person?h(HumanIdentity,{id:person.id}):h(R.Fragment,null,h('img',{src:channel.identityAvatarUrl||root.EvaAvatar.personUri(id),alt:'',draggable:false}),h('strong',null,channel.name)))),
     projectContext&&section(h(Row,{title:'所属项目',value:h(ProjectIdentity,{project:projectContext,name:projectContext.projectName}),onClick:()=>navigate('/collab?evaProject='+encodeURIComponent(projectContext.projectId))})),
     !fixed&&group&&section(h(EditRow,{title:'群聊名称',value:name,allowEmpty:false,readOnly:!manage,onSave:v=>update({name:v})}),h(Row,{title:'群头像',value:h('img',{className:'eva-chat-group-avatar',src:settings.avatar||root.EvaAvatar.groupUri(id,channel.color),alt:'',draggable:false}),onClick:manage?()=>setPicker('avatar'):undefined}),h(EditRow,{title:'群公告',value:settings.notice,multiline:true,maxLength:400,readOnly:!manage,onSave:v=>update({notice:v})}),h(Row,{title:'GROUP.md',value:governance.groupMd?'已配置':'未配置',onClick:()=>setPage('groupmd')}),manage&&h(Row,{title:'群聊管理',onClick:()=>setPage('manage')})),
     fixedGroupActions&&section(h(EditRow,{title:'团队名称',value:name,allowEmpty:false,onSave:fixedGroupActions.onRename})),
     fixedGroupActions&&section(h(Row,{title:'解散 AI 团队',danger:true,onClick:()=>openFixedAction(fixedGroupActions.onDissolve)})),
     prefRows,
     !group&&section(h(Row,{title:'清空聊天记录',danger:true,onClick:()=>setConfirm('clear')})),
     group&&!fixed&&!all&&h('div',{className:'eva-chat-terminal-actions'},h(Button,{className:'eva-chat-exit-button',type:'danger',theme:'outline',onClick:()=>setConfirm(owner?'ownerLeave':'leave')},'退出群聊'),owner&&h(Button,{type:'danger',theme:'solid',onClick:()=>setConfirm('dissolve')},'解散群聊'))),
    page==='members'&&h(
     R.Fragment,
     null,
     h('div',{className:'eva-chat-member-search-block'},
      h(Input,{className:'eva-chat-member-search','aria-label':'搜索群聊成员',value:memberQuery,onChange:setMemberQuery,showClear:true,prefix:SearchIcon?h(SearchIcon,{size:16}):null,placeholder:'搜索'}),
      all&&h('p',{className:'eva-chat-settings-note eva-chat-member-page-note'},'全员群成员与项目成员同步，不能在群内单独增删或退出。')
     ),
     section(...visibleMembers.map(p=>h('div',{className:'eva-chat-member-list-row',key:p.id},h('button',{type:'button',onClick:()=>setProfile(p)},identity(p)),role(p)&&h('span',{className:'eva-members-muted'},role(p)),!fixed&&!all&&eligibleRemove(p)&&h(Button,{size:'small',theme:'borderless',type:'danger',onClick:()=>setConfirm({remove:p})},'移除'))))
    ),
    managementPage,
    groupMdPage,
   ),
   h(MemberPicker,{visible:picker==='add',title:'添加群聊成员',items:allowed&&!all?[...humanItems(store.candidates(id,actor),g.projectId,true),...cloneItems(actor,g.projectId,id)]:[],emptyTitle:g?.projectId?'项目内可选成员均已加入当前群聊':'所有可选成员均已加入当前群聊',emptyDescription:g?.projectId?'如需添加其他人，请先将其加入项目':'',onCancel:()=>setPicker(null),onSubmit:chosen=>{store.transaction(staged=>chosen.forEach(p=>p.kind==='clone'?staged.addClone(id,actor,p.id):staged.addMember(id,actor,p.id)));setPicker(null);}}),
   h(MemberPicker,{visible:picker==='manager',title:'添加群管理员',items:managerCandidates,groups:[{kind:'human',label:'联系人'}],emptyTitle:'暂无可设置的群管理员',onCancel:()=>setPicker(null),onSubmit:chosen=>{store.transaction(staged=>chosen.forEach(p=>staged.setGroupManager(id,actor,p.id,true)));setPicker(null);}}),
   h(MemberPicker,{visible:picker==='botAdmin',title:'添加 Bot 管理员',items:botAdminCandidates,groups:[{kind:'bot',label:'AI 成员',items:botAdminCandidates.map(p=>p.id)}],emptyTitle:'群内暂无可设置的 AI 成员',onCancel:()=>setPicker(null),onSubmit:chosen=>{store.transaction(staged=>chosen.forEach(p=>staged.setGroupBotAdmin(id,actor,p.id,true)));setPicker(null);}}),
   h(SinglePersonPicker,{visible:picker==='transfer',title:'转让群主',submit:'确认转让',items:humans.filter(p=>p.id!==actor),onCancel:()=>setPicker(null),onSubmit:chosen=>{store.transfer(id,actor,chosen[0].id);setPicker(null);}}),
   !fixedGroupActions&&h(Modal,{className:'eva-members-modal',title:'群头像',visible:picker==='avatar',footer:null,onCancel:()=>{setAvatarSource(null);setPicker(null);}},avatarSource?h(AvatarEditor,{bare:true,current:settings.avatar||root.EvaAvatar.groupUri(id,channel.color),initialImage:avatarSource,onCancel:()=>setAvatarSource(null),onSave:value=>{if(run(()=>updateAvatar(value))){setAvatarSource(null);setPicker(null);}}}):h(R.Fragment,null,h('input',{type:'file',accept:'image/png,image/jpeg,image/webp','aria-label':'上传群头像',onChange:e=>{const f=e.target.files?.[0];e.target.value='';if(!f)return;readAvatarFile(f,1024*1024).then(img=>{setError('');setAvatarSource(img);},err=>setError(err.message));}}),h(Button,{theme:'borderless',onClick:()=>{if(run(()=>updateAvatar('')))setPicker(null);}},'恢复默认头像'))),
   h(IdentityCard,{identity:profile,onClose:()=>setProfile(null)}),
   h(Modal,{className:'eva-members-modal',title:confirm==='clear'?'清空聊天记录':confirm==='leave'||confirm==='ownerLeave'?'退出群聊':confirm==='dissolve'?'解散群聊':confirm?.remove?'确认移除成员':'确认操作',visible:!!confirm,onCancel:()=>setConfirm(null),okText:confirm==='clear'?'清空':confirm==='leave'?'退出群聊':confirm==='dissolve'?'解散群聊':'确认',cancelText:'取消',okButtonProps:['clear','leave','dissolve'].includes(confirm)?{type:'danger'}:undefined,...(confirm==='ownerLeave'?{footer:ownerSuccessors.length?h('div',{className:'eva-group-owner-leave-footer-actions'},h(Button,{onClick:()=>setConfirm(null)},'取消'),h(Button,{theme:'solid',onClick:()=>{setConfirm(null);setPicker('transfer');}},'转让群主')):h(R.Fragment,null,h(Button,{onClick:()=>setConfirm(null)},'取消'))}:{}),onOk:()=>{if(run(()=>{if(confirm==='clear')onClear();else if(confirm==='leave'){store.leaveGroup(id,actor);onClose();}else if(confirm==='dissolve'){store.dissolveGroup(id,actor);onClose();}else if(confirm?.remove){const p=confirm.remove;p.kind==='employee'?store.removeEmployee(id,actor,p.id):p.kind==='clone'?store.removeClone(id,actor,p.id):store.remove(id,actor,p.id);}}))setConfirm(null);}},h('p',null,confirm==='clear'?'清空你在此设备的当前聊天记录，其他成员的记录不受影响。':confirm==='leave'?'退出后，你及你的分身将离开本群，并失去全部子区访问权。历史内容不会被改写。':confirm==='ownerLeave'?(ownerSuccessors.length?'群主退出前需要先转让群主。请选择一位群成员接任群主，转让完成后你即可退出群聊。':'群聊没有其他可接任成员，群主暂不能退出群聊。如不再需要本群，可解散群聊及全部子区。'):confirm==='dissolve'?'解散后，本群及全部子区将不再可访问。':confirm?.remove?'确认移除 '+confirm.remove.name+'？':''),confirm?.remove&&identity(confirm.remove),error&&h('p',{role:'alert',className:'eva-members-error'},error)));
 }
 // Read-only member area for thread (子区) settings. Threads inherit the parent
 // group's members and roles, so the full member list reuses the same in-panel
 // page as group settings (search + role rows) with every add/remove control omitted.
 function ThreadMembers({groupId,actorId}){
  const s=useState(),[profile,setProfile]=R.useState(null),[allOpen,setAllOpen]=R.useState(false),[memberQuery,setMemberQuery]=R.useState('');
  const sid=groupId.startsWith('all:')?groupId.slice(4):groupId,g=s.projects[sid]||s.groups[sid];
  if(!g||!store.canRead(groupId,actorId))return null;
  const governance=typeof store.groupGovernance==='function'?store.groupGovernance(groupId):{managerIds:[]};
  const humans=humanItems(g.humans.map(m=>({...store.person(m.id),...m})),g.projectId||sid);
  const members=store.groupMembers(groupId);
  const ordered=[...humans.map(p=>({...p,kind:'human'})),...members.filter(p=>p.kind!=='human')];
  const threadRole=p=>p.id===g.ownerId?'群主':p.kind==='human'&&governance.managerIds.includes(p.id)?'管理员':null;
  if(allOpen){
   const normalized=memberQuery.trim().normalize('NFKC').toLocaleLowerCase();
   const visibleMembers=ordered.filter(p=>!normalized||String(p.name||'').normalize('NFKC').toLocaleLowerCase().includes(normalized));
   return h('div',{className:'eva-chat-settings eva-thread-members-page',role:'dialog','aria-label':'群聊成员','aria-modal':'false',onKeyDown:e=>{if(e.key==='Escape'){e.stopPropagation();setAllOpen(false);}}},
    h('header',{className:'eva-chat-settings-head'},h('button',{type:'button','aria-label':'返回子区信息',onClick:()=>setAllOpen(false)},h(BackIcon,{size:20})),h('h3',null,'群聊成员（'+members.length+'）')),
    h('div',{className:'eva-chat-settings-body'},
     h('div',{className:'eva-chat-member-search-block'},
      h(Input,{className:'eva-chat-member-search','aria-label':'搜索群聊成员',value:memberQuery,onChange:setMemberQuery,showClear:true,prefix:SearchIcon?h(SearchIcon,{size:16}):null,placeholder:'搜索'}),
      h('p',{className:'eva-chat-settings-note eva-chat-member-page-note'},'子区继承所属群聊的成员与角色，不能单独增删。')),
     h('section',{className:'eva-chat-setting-section'},...visibleMembers.map(p=>h('div',{className:'eva-chat-member-list-row',key:p.id},h('button',{type:'button',onClick:()=>setProfile(p)},memberIdentity(p)),threadRole(p)&&h('span',{className:'eva-members-muted'},threadRole(p)))))),
    h(IdentityCard,{identity:profile,onClose:()=>setProfile(null)}));
  }
  return h(R.Fragment,null,
   h('section',{className:'eva-chat-setting-section'},
    h('div',{className:'eva-chat-member-grid'},ordered.slice(0,19).map(p=>h(MemberTile,{key:p.id,p,role:threadRole(p),ownerId:g.ownerId,onClick:()=>setProfile(p)}))),
    h(Row,{title:'查看全部 '+members.length+' 名成员',onClick:()=>{setMemberQuery('');setAllOpen(true);}})),
   h(IdentityCard,{identity:profile,onClose:()=>setProfile(null)}));
 }
 ChatSettings.ThreadMembers=ThreadMembers;
 ChatSettings.Row=Row;
 return ChatSettings;
}};
})(window);
