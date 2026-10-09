(function (root) {
  'use strict';
  root.__evaPatch('im', function (source) {
function ThreadCreateForm({label,placeholder,initialValue='',maxLength=THREAD_NAME_MAX_LENGTH,loading=false,error,labels,showVoiceInput=false,showCounter=false,formVariant='modal',modalTitle,resetKey,onSubmit,onCancel,onChange}) {
 const h=React.createElement,{Form,useSubmission,SubmissionError}=evaForms,[api,state,values]=Form.useForm(),input=reactExports.useRef(null);
 const submission=useSubmission({resetKey,onSubmit:data=>onSubmit(data.name.trim())});
 reactExports.useEffect(()=>{api.setValues({name:initialValue},{isOverride:true});},[initialValue,resetKey]);
 const name=values.name??'',id=submission.formProps.id+'-name';
 const change=value=>{api.setValue('name',value);onChange?.(value);};
 const actions=h(evaForms.Actions,{onCancel,cancelLabel:labels.cancel,submitLabel:loading?labels.creating:labels.create,form:submission.formProps.id,busy:loading||submission.busy});
 const form=h(Form,{...submission.formProps,form:api,initValues:{name:initialValue},className:'wk-thread-create-form'+(formVariant==='confirm'?' wk-thread-create-form--confirm':'')},
  label&&h('label',{className:'wk-thread-create-form__label',htmlFor:id,id:id+'-label'},label),
  h('div',{className:'wk-thread-create-form__input-row'},
   h(Form.Input,{pure:true,field:'name',id,ref:input,className:'wk-thread-create-form__input',placeholder,maxLength,autoFocus:true,disabled:loading||submission.busy,onChange,
    validator:value=>getNameError(value||'',maxLength,labels)||'', 'aria-describedby':id+'-error'}),
   showVoiceInput&&h(VoiceInputButton,{inputRef:{get current(){return input.current?.inputElement||input.current;}},onTranscribed:(text,mode,selection)=>{let next=text;if(mode==='selection'&&selection)next=name.slice(0,selection.from)+text+name.slice(selection.to);else if(mode!=='all'){const at=selection?.from??name.length;next=name.slice(0,at)+text+name.slice(at);}change(next);},size:'sm'})),
  (state.errors?.name||error||showCounter)&&h('div',{className:'wk-thread-create-form__meta'},h(Form.ErrorMessage,{error:state.errors?.name||error,errorMessageId:id+'-error'}),showCounter&&h('span',{className:'wk-thread-create-form__counter'},name.length+' / '+maxLength)),
  h(SubmissionError,{submission}),
  !modalTitle&&actions);
 return modalTitle?h(evaForms.Dialog,{visible:true,title:modalTitle,onCancel,size:'compact',selectInitialText:!!initialValue,footer:actions,className:'eva-thread-create-dialog'},form):form;
}
function ThreadCreateDialog({visible,title,onCancel,...props}) {
 const [resetKey,setResetKey]=reactExports.useState(0);
 reactExports.useEffect(()=>{if(visible)setResetKey(key=>key+1);},[visible]);
 return visible&&React.createElement(ThreadCreateForm,{...props,resetKey,onCancel,modalTitle:title});
}
function EvaForwardThreadForm({maxLength,onSubmit,onCancel}) {
 const h=React.createElement,{Form,useSubmission,SubmissionError}=evaForms,[api,state]=Form.useForm(),submission=useSubmission({onSubmit:values=>onSubmit(values.name.trim())});
 return h(Form,{...submission.formProps,form:api,className:'eva-fp-thread-form'},
  h('div',{className:'eva-fp-picker-new'},
   h(Form.Input,{field:'name',pure:true,className:'eva-fp-picker-new-input',autoFocus:true,placeholder:'输入子区名称',maxLength,'aria-label':'新子区名称',rules:[{required:true,whitespace:true,message:'请输入子区名称'},{max:maxLength,message:'子区名称不能超过'+maxLength+'个字符'}],onKeyDown:event=>{if(event.key==='Escape'){event.preventDefault();event.stopPropagation();onCancel();}}}),
   h(evaForms.Actions,{compact:true,onCancel,submitLabel:'确定',form:submission.formProps.id,busy:submission.busy})),
  h(Form.ErrorMessage,{error:state.errors?.name,errorMessageId:'name-errormessage'}),h(SubmissionError,{submission}));
}
function evaRailIcon(name){
 const nodes={'Pin':[
  ["path", { d: "M12 17v5", key: "bb1du9" }],
  [
    "path",
    {
      d: "M9 10.76a2 2 0 0 1-1.11 1.79l-1.78.9A2 2 0 0 0 5 15.24V16a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1v-.76a2 2 0 0 0-1.11-1.79l-1.78-.9A2 2 0 0 1 15 10.76V7a1 1 0 0 1 1-1 2 2 0 0 0 0-4H8a2 2 0 0 0 0 4 1 1 0 0 1 1 1z",
      key: "1nkz8b"
    }
  ]
],'PinOff':[
  ["path", { d: "M12 17v5", key: "bb1du9" }],
  ["path", { d: "M15 9.34V7a1 1 0 0 1 1-1 2 2 0 0 0 0-4H7.89", key: "znwnzq" }],
  ["path", { d: "m2 2 20 20", key: "1ooewy" }],
  [
    "path",
    {
      d: "M9 9v1.76a2 2 0 0 1-1.11 1.79l-1.78.9A2 2 0 0 0 5 15.24V16a1 1 0 0 0 1 1h11",
      key: "c9qhm2"
    }
  ]
],'Bell':[
  ["path", { d: "M10.268 21a2 2 0 0 0 3.464 0", key: "vwvbt9" }],
  [
    "path",
    {
      d: "M3.262 15.326A1 1 0 0 0 4 17h16a1 1 0 0 0 .74-1.673C19.41 13.956 18 12.499 18 8A6 6 0 0 0 6 8c0 4.499-1.411 5.956-2.738 7.326",
      key: "11g9vi"
    }
  ]
],'BellOff':[
  ["path", { d: "M10.268 21a2 2 0 0 0 3.464 0", key: "vwvbt9" }],
  [
    "path",
    {
      d: "M17 17H4a1 1 0 0 1-.74-1.673C4.59 13.956 6 12.499 6 8a6 6 0 0 1 .258-1.742",
      key: "178tsu"
    }
  ],
  ["path", { d: "m2 2 20 20", key: "1ooewy" }],
  ["path", { d: "M8.668 3.01A6 6 0 0 1 18 8c0 2.687.77 4.653 1.707 6.05", key: "1hqiys" }]
],'BrushCleaning':[
  ["path", { d: "m16 22-1-4", key: "1ow2iv" }],
  [
    "path",
    {
      d: "M19 14a1 1 0 0 0 1-1v-1a2 2 0 0 0-2-2h-3a1 1 0 0 1-1-1V4a2 2 0 0 0-4 0v5a1 1 0 0 1-1 1H6a2 2 0 0 0-2 2v1a1 1 0 0 0 1 1",
      key: "11gii7"
    }
  ],
  ["path", { d: "M19 14H5l-1.973 6.767A1 1 0 0 0 4 22h16a1 1 0 0 0 .973-1.233z", key: "bju7h4" }],
  ["path", { d: "m8 22 1-4", key: "s3unb" }]
],'EyeOff':[
  [
    "path",
    {
      d: "M10.733 5.076a10.744 10.744 0 0 1 11.205 6.575 1 1 0 0 1 0 .696 10.747 10.747 0 0 1-1.444 2.49",
      key: "ct8e1f"
    }
  ],
  ["path", { d: "M14.084 14.158a3 3 0 0 1-4.242-4.242", key: "151rxh" }],
  [
    "path",
    {
      d: "M17.479 17.499a10.75 10.75 0 0 1-15.417-5.151 1 1 0 0 1 0-.696 10.75 10.75 0 0 1 4.446-5.143",
      key: "13bj9a"
    }
  ],
  ["path", { d: "m2 2 20 20", key: "1ooewy" }]
],'FolderPlus':[
  ["path", { d: "M12 10v6", key: "1bos4e" }],
  ["path", { d: "M9 13h6", key: "1uhe8q" }],
  [
    "path",
    {
      d: "M20 20a2 2 0 0 0 2-2V8a2 2 0 0 0-2-2h-7.9a2 2 0 0 1-1.69-.9L9.6 3.9A2 2 0 0 0 7.93 3H4a2 2 0 0 0-2 2v13a2 2 0 0 0 2 2Z",
      key: "1kt360"
    }
  ]
],'FolderInput':[
  [
    "path",
    {
      d: "M2 9V5a2 2 0 0 1 2-2h3.9a2 2 0 0 1 1.69.9l.81 1.2a2 2 0 0 0 1.67.9H20a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2v-1",
      key: "fm4g5t"
    }
  ],
  ["path", { d: "M2 13h10", key: "pgb2dq" }],
  ["path", { d: "m9 16 3-3-3-3", key: "6m91ic" }]
],'Pencil':[
  [
    "path",
    {
      d: "M21.174 6.812a1 1 0 0 0-3.986-3.987L3.842 16.174a2 2 0 0 0-.5.83l-1.321 4.352a.5.5 0 0 0 .623.622l4.353-1.32a2 2 0 0 0 .83-.497z",
      key: "1a8usu"
    }
  ],
  ["path", { d: "m15 5 4 4", key: "1mk7zo" }]
],'MessageCirclePlus':[['path',{d:'M2.992 16.342a2 2 0 0 1 .094 1.167l-1.065 3.29a1 1 0 0 0 1.236 1.168l3.413-.998a2 2 0 0 1 1.099.092 10 10 0 1 0-4.777-4.719',key:'mp1'}],['path',{d:'M8 12h8',key:'mp2'}],['path',{d:'M12 8v8',key:'mp3'}]],'ChevronRight':[["path", { d: "m9 18 6-6-6-6", key: "mthhwq" }]],'Star':[["path",{d:"M11.525 2.295a.53.53 0 0 1 .95 0l2.31 4.679a2.123 2.123 0 0 0 1.595 1.16l5.166.756a.53.53 0 0 1 .294.904l-3.736 3.638a2.123 2.123 0 0 0-.611 1.878l.882 5.14a.53.53 0 0 1-.771.56l-4.618-2.428a2.122 2.122 0 0 0-1.973 0L6.396 21.01a.53.53 0 0 1-.77-.56l.881-5.139a2.122 2.122 0 0 0-.611-1.879L2.16 9.795a.53.53 0 0 1 .294-.906l5.165-.755a2.122 2.122 0 0 0 1.597-1.16z",key:"star"}]],'StarOff':[["path",{d:"m10.344 4.688 1.181-2.393a.53.53 0 0 1 .95 0l2.31 4.679a2.12 2.12 0 0 0 1.595 1.16l5.166.756a.53.53 0 0 1 .294.904l-3.237 3.152",key:"19ctli"}],["path",{d:"m17.945 17.945.43 2.505a.53.53 0 0 1-.771.56l-4.618-2.428a2.12 2.12 0 0 0-1.973 0L6.396 21.01a.53.53 0 0 1-.77-.56l.881-5.139a2.12 2.12 0 0 0-.611-1.879L2.16 9.795a.53.53 0 0 1 .294-.906l5.165-.755a8 8 0 0 0 .4-.099",key:"ptqqvy"}],["path",{d:"m2 2 20 20",key:"1ooewy"}]]};
 evaRailIcon.components||={};const Icon=evaRailIcon.components[name]||=createLucideIcon(name,nodes[name]);return React.createElement(Icon,{size:16,strokeWidth:1.7,className:'ctx-icon','aria-hidden':true});
}
function EvaSharedContextMenus({menus=[],onHide},forwardedRef){
 const h=React.createElement,[position,setPosition]=reactExports.useState(null),[submenu,setSubmenu]=reactExports.useState(null),ref=reactExports.useRef(null),opener=reactExports.useRef(null);
 const hide=()=>{setPosition(null);setSubmenu(null);onHide?.();if(opener.current?.isConnected)opener.current.focus({preventScroll:true});};
 reactExports.useImperativeHandle(forwardedRef,()=>({show:(event,anchor=event.currentTarget)=>{event.preventDefault();event.stopPropagation();opener.current=anchor;const rect=anchor.getBoundingClientRect();setSubmenu(null);setPosition({x:event.type==='click'?rect.right:event.clientX||rect.left,y:event.type==='click'?rect.bottom:event.clientY||rect.bottom,minY:document.querySelector('.topbar')?.getBoundingClientRect().bottom||0});},hide,isShow:()=>!!position}));
 reactExports.useLayoutEffect(()=>{if(!position||!ref.current)return;const n=ref.current,r=n.getBoundingClientRect();n.style.left=Math.max(8,Math.min(position.x+5,innerWidth-r.width-8))+'px';n.style.top=Math.max(position.minY+8,Math.min(position.y,innerHeight-r.height-8))+'px';n.focus({preventScroll:true});},[position]);
 reactExports.useEffect(()=>{if(!position)return;const close=event=>{if(!ref.current?.contains(event.target))hide();};const key=event=>{if(event.key==='Escape'){event.preventDefault();hide();}};document.addEventListener('pointerdown',close);document.addEventListener('keydown',key);window.addEventListener('resize',hide);return()=>{document.removeEventListener('pointerdown',close);document.removeEventListener('keydown',key);window.removeEventListener('resize',hide);};},[position]);
 const keyboard=event=>{const item=event.target.closest('[role="menuitem"]'),list=item?.parentElement||event.currentTarget.querySelector(':scope > ul[role="menu"]');if(!list)return;const items=[...list.children].filter(n=>n.getAttribute('role')==='menuitem'),index=item?items.indexOf(item):-1;if(['ArrowDown','ArrowUp','Home','End'].includes(event.key)){event.preventDefault();const next=index<0?(event.key==='ArrowUp'||event.key==='End'?items.length-1:0):(event.key==='Home'?0:event.key==='End'?items.length-1:(index+(event.key==='ArrowDown'?1:-1)+items.length)%items.length);items[next]?.focus();}else if(!item)return;else if(event.key==='ArrowRight'&&item.dataset.children){event.preventDefault();setSubmenu(Number(item.dataset.index));requestAnimationFrame(()=>item.querySelector('[role="menuitem"]')?.focus());}else if(event.key==='ArrowLeft'&&list.classList.contains('eva-context-submenu')){event.preventDefault();setSubmenu(null);list.parentElement.focus();}else if(event.key==='Enter'||event.key===' '){event.preventDefault();item.click();}else if(event.key==='Tab'){hide();}};
 const render=(item,index,child=false)=>item.separator?h('div',{key:index,className:'wk-ctx-sep',role:'separator'}):h('li',{key:index,role:'menuitem',tabIndex:-1,className:item.danger?'wk-ctx-danger':'','data-index':index,'data-children':item.children?'true':undefined,'aria-haspopup':item.children?'menu':undefined,'aria-expanded':item.children?submenu===index:undefined,onMouseEnter:()=>{if(!child)setSubmenu(item.children?index:null);},onClick:event=>{event.stopPropagation();if(item.children){setSubmenu(index);return;}hide();item.onClick?.();}},item.icon,h('span',null,item.title),item.children&&h(React.Fragment,null,evaRailIcon('ChevronRight'),submenu===index&&h('ul',{className:'eva-context-submenu',role:'menu',ref:n=>{if(n){n.style.left='calc(100% + 8px)';n.style.right='auto';n.style.top='0px';const r=n.getBoundingClientRect();if(r.right>innerWidth-8){n.style.left='auto';n.style.right='calc(100% + 8px)';}if(r.bottom>innerHeight-8)n.style.top=Math.min(0,innerHeight-8-r.bottom)+'px';}}},item.children.map((c,i)=>render(c,i,true)))));
 return position?h('div',{ref,tabIndex:-1,className:'wk-contextmenus wk-contextmenus-open eva-context-menu',style:{left:position.x,top:position.y,maxHeight:'calc(100vh - '+(position.minY+16)+'px)'},onKeyDown:keyboard,onContextMenu:event=>event.preventDefault()},h('ul',{role:'menu'},menus.map((item,i)=>render(item,i)))):null;
}
function evaConversationRailMenus({store,actorId,channel,thread,recent,onEditCategory}){
 const id=thread?.id||channel.id,prefs=store.chatPreferences(id,actorId),mute=store.conversationMuted(id,actorId),menus=[];
 const item=(title,icon,onClick)=>({title,icon:evaRailIcon(icon),onClick});
 const run=fn=>{try{fn();}catch(error){if(typeof Toast!=="undefined")Toast.error(error.message||'操作未完成，请重试');}};
 if(recent)menus.push(evaPinMenuItem(store,actorId,id));
 if((thread?.unread??channel.unread)>0)menus.push(item('清除未读','BrushCleaning',()=>store.clearConversationUnread(id,actorId)));
 if(store.conversationFollowed(id,actorId)){
  menus.push(item('取消关注','StarOff',()=>run(()=>store.unfollowConversation(id,actorId))));
 }else{
  const categories=store.conversationCategories(actorId),children=categories.map(category=>({title:category.name,onClick:()=>run(()=>store.followConversation(id,actorId,category.id))}));
  if(children.length)children.push({separator:true});
  children.push(item('新建分组','FolderPlus',()=>onEditCategory({initialChannelIds:[id]})));
  menus.push({title:'添加到关注',icon:evaRailIcon('Star'),children});
 }
 menus.push(evaMuteMenuItem(store,actorId,id));
 if(recent)menus.push({separator:true},item('不显示该会话','EyeOff',()=>store.hideRecentConversation(id,actorId)));
 if(!recent&&thread){menus.push({separator:true},item('隐藏子区','EyeOff',()=>store.setChatPreferences(id,actorId,{hidden:true})));}
 if(!recent&&!thread&&!store.conversationContext(id,actorId)){
  const categories=store.conversationCategories(actorId),current=store.conversationCategory(actorId,channel);
  const children=categories.filter(c=>c.id!==current).map(c=>({title:c.name,onClick:()=>run(()=>store.moveConversationCategory(actorId,channel,c.id))}));
  if(children.length)children.push({separator:true});
  children.push(item('新建分组','FolderPlus',()=>onEditCategory({initialChannelIds:[id]})));
  menus.push({separator:true},{title:'移动到分组',icon:evaRailIcon('FolderInput'),children});
 }
 return menus;
}
function evaCategoryRailMenus({category,onCreateGroup,onRename,onDelete}){
 const menus=[{title:'在此分组新建群聊',icon:evaRailIcon('MessageCirclePlus'),onClick:()=>onCreateGroup(category.id)},
  {title:'编辑分组',icon:evaRailIcon('Pencil'),onClick:()=>onRename(category)}];
 if(category.id!=='scope:other')menus.push({separator:true},{title:'删除分组',icon:React.createElement(Trash2,{size:16,strokeWidth:1.7,className:'ctx-icon','aria-hidden':true}),danger:true,onClick:()=>onDelete(category)});
 return menus;
}

function evaForwardIcon(name,props){
  const nodes={
    search:[['circle',{cx:'11',cy:'11',r:'8'}],['path',{d:'m21 21-4.3-4.3'}]],
    bot:[['path',{d:'M12 8V4H8'}],['rect',{width:'16',height:'12',x:'4',y:'8',rx:'2'}],['path',{d:'M2 14h2'}],['path',{d:'M20 14h2'}],['path',{d:'M15 13v2'}],['path',{d:'M9 13v2'}]],
    'layout-grid':[['rect',{width:'7',height:'7',x:'3',y:'3',rx:'1'}],['rect',{width:'7',height:'7',x:'14',y:'3',rx:'1'}],['rect',{width:'7',height:'7',x:'14',y:'14',rx:'1'}],['rect',{width:'7',height:'7',x:'3',y:'14',rx:'1'}]],
    users:[['path',{d:'M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2'}],['circle',{cx:'9',cy:'7',r:'4'}],['path',{d:'M22 21v-2a4 4 0 0 0-3-3.87'}],['path',{d:'M16 3.13a4 4 0 0 1 0 7.75'}]],
    'chevron-down':[['path',{d:'m6 9 6 6 6-6'}]],
    // 全站统一的子区图标（Lucide corner-down-right），与 009-5 的 ThreadIcon 同源
    'corner-down-right':[['path',{d:'m15 10 5 5-5 5',key:'1mk7zo'}],['path',{d:'M4 4v7a4 4 0 0 0 4 4h12',key:'zqzwo1'}]],
    plus:[['path',{d:'M5 12h14'}],['path',{d:'M12 5v14'}]],
    x:[['path',{d:'M18 6 6 18'}],['path',{d:'m6 6 12 12'}]]
  };
  evaForwardIcon.components||={};const Icon=evaForwardIcon.components[name]||=createLucideIcon(name,nodes[name]);
  return React.createElement(Icon,{size:16,strokeWidth:1.75,'aria-hidden':true,...(props||{})});
}
function evaRecentActivity(store,actorId,id,seedAt){
  const messages=store.messagesFor(id,actorId);
  return messages.reduce((latest,message)=>String(message.createdAt||'')>latest?String(message.createdAt):latest,String(seedAt||''));
}
// 转发目标统一目录：最近会话（大群、人类私聊、AI 单聊）、AI 小队、项目群与子区、联系人、AI 身份。
// 左侧「最近」与大群、私聊、AI 单聊同源，不含子区；子区只从群卡片的「发送至」选择。
function evaForwardCatalog(actorId){
  const ms=evaMembers().store,model=evaMembers().ui.identityModel,priv=window.EvaAIPrivateConversations,mine=actorId==='u-wangyilin';
  const profileOf=id=>{const profile=model.resolve(id);return profile?{name:profile.name,appearance:profile.appearance}:null;};
  const humans=(ms.people?ms.people():[]).filter(p=>p.id!==actorId).map(p=>({id:p.id,personId:p.id,type:'human',kind:'私聊',name:p.name,updatedAt:'',avatarUrl:window.EvaAvatar.personUri(p.id)}));
  const agents=[];
  if(mine){
    const team=window.EvaAITeam&&window.EvaAITeam.getSnapshot();
    ((team&&team.identities)||[]).filter(identity=>identity.role==='persona'||identity.role==='assistant').forEach(identity=>{
      const profile=profileOf(identity.id);
      agents.push({id:identity.id,type:'agent',kind:'私聊',role:identity.role,name:(profile&&profile.name)||identity.name,appearance:profile&&profile.appearance,
        sessions:((team&&team.sessions)||[]).filter(session=>session.identityId===identity.id).map(session=>({channelId:priv.threadRecord(identity.id,session).channel_id,sessionId:session.id,name:session.title,updatedAt:session.updatedAt}))
          .sort((a,b)=>String(b.updatedAt||'').localeCompare(String(a.updatedAt||'')))});
    });
    const digital=window.EvaDigitalEmployeesStore;
    (digital?digital.teamIds():[]).forEach(id=>{
      const employee=digital.get(id);if(!employee)return;
      agents.push({id,type:'agent',kind:'私聊',role:'employee',name:employee.name,appearance:digital.appearance(employee),
        sessions:digital.sessions(id).map(session=>({channelId:priv.threadRecord(id,session).channel_id,sessionId:session.id,name:session.title,updatedAt:session.updatedAt}))});
    });
  }
  const aiTeams=mine?(window.EvaMyAITeamGroup?window.EvaMyAITeamGroup.forwardChannels():[]).map(group=>{
    const avatarUrl=window.EvaAvatar.groupUri(group.id),seenThreads=new Set();
    return {...group,type:'ai-team',kind:'群聊',avatarUrl,
      threads:(group.threads||[]).filter(thread=>{if(!thread||!thread.id||seenThreads.has(thread.id))return false;seenThreads.add(thread.id);return true;})
        .map(thread=>({id:thread.id,name:thread.name,type:'ai-team-thread',kind:'子区',parentId:group.id,parentName:group.name,updatedAt:thread.updatedAt||group.updatedAt,avatarUrl}))};
  }):[];
  const groupById={},threadParent={};
  // 同一群可能来自消息数据源、项目数据源与非项目数据源，合并成右侧卡片与搜索共用的一份。
  const rememberGroup=group=>{
    if(!group||!group.id)return;
    const previous=groupById[group.id]||{},merged={...previous};
    Object.keys(group).forEach(key=>{if(group[key]!==undefined)merged[key]=group[key];});
    merged.threads=(group.threads||[]).length?group.threads:(previous.threads||[]);
    groupById[group.id]=merged;
    (merged.threads||[]).forEach(thread=>{if(thread&&thread.id)threadParent[thread.id]=group.id;});
  };
  const snap=ms.snapshot();
  const projects=Object.values(snap.projects).filter(project=>ms.canRead(project.id,actorId)).map(project=>{
    const ctx=ms.conversationContext('all:'+project.id,actorId);
    return {id:project.id,name:(ctx&&ctx.projectName)||project.name||project.id,colorKey:ctx&&ctx.colorKey,
      groups:ms.channels(project.id,actorId).map(channel=>({id:channel.id,type:'group',kind:'群聊',name:channel.name,isAll:!!channel.allMembers,color:channel.color,category:'space:'+project.id,colorKey:ctx&&ctx.colorKey,projectId:project.id,projectName:(ctx&&ctx.projectName)||project.name,updatedAt:channel.lastAt,avatarUrl:window.EvaAvatar.groupUri(channel.id,channel.color),
        threads:(channel.threads||[]).filter(thread=>!thread.deleted).map(thread=>({id:thread.id,type:'thread',kind:'子区',name:thread.name,parentId:channel.id,parentName:channel.name,projectId:project.id,projectName:(ctx&&ctx.projectName)||project.name,colorKey:ctx&&ctx.colorKey,updatedAt:thread.updated_at||thread.updatedAt||channel.lastAt,avatarUrl:window.EvaAvatar.groupUri(channel.id,channel.color)}))}))};
  });
  const plainGroups=Object.values(snap.groups).filter(group=>!group.projectId&&ms.canRead(group.id,actorId)).map(group=>{
    const threads=Object.keys(snap.threads||{}).filter(threadId=>snap.threads[threadId]===group.id).map(threadId=>snap.threadDetails[threadId]).filter(detail=>detail&&!detail.deleted)
      .map(detail=>({id:detail.id,type:'thread',kind:'子区',name:detail.name,parentId:group.id,parentName:group.name,updatedAt:detail.updated_at||detail.updatedAt||detail.created_at,avatarUrl:window.EvaAvatar.groupUri(group.id,group.color)}))
      .sort((a,b)=>String(b.updatedAt||'').localeCompare(String(a.updatedAt||'')));
    return {id:group.id,type:'group',kind:'群聊',name:group.name,colorKey:null,category:'scope:other',color:group.color,updatedAt:group.lastAt,threads,avatarUrl:window.EvaAvatar.groupUri(group.id,group.color)};
  });
  const recent=[],seen=new Set();
  const push=row=>{if(row&&row.id&&!seen.has(row.id)&&(!row.type||row.type==='human'||row.type==='agent'||row.type==='agent-session'||ms.canReadForwardSource(row.id,actorId))){seen.add(row.id);recent.push(row);}};
  const addChannel=channel=>{
    if(!channel)return;
    if(channel.personId){const person=ms.personRecord(channel.personId);push({id:channel.id,type:'human',kind:'私聊',personId:channel.personId,name:(person&&person.name)||channel.name,updatedAt:channel.lastAt,avatarUrl:window.EvaAvatar.personUri(channel.personId)});return;}
    if(channel.identityId||channel.identityAppearance){
      const profile=profileOf(channel.identityId);
      const title=channel.sessionTitle||String(channel.name||'').split(' / ').slice(1).join(' / ')||channel.name;
      push({id:channel.id,type:'agent-session',kind:'私聊',identityId:channel.identityId,name:title,agentName:(profile&&profile.name)||'',appearance:profile&&profile.appearance,updatedAt:channel.lastAt});
      return;
    }
    const ctx=ms.conversationContext(channel.id,actorId),name=(ctx&&ctx.groupName)||channel.name;
    const group={id:channel.id,type:'group',kind:'群聊',name,projectName:ctx&&ctx.projectName,projectId:ctx&&ctx.projectId,colorKey:ctx&&ctx.colorKey,category:channel.category,color:channel.color,updatedAt:channel.lastAt,avatarUrl:window.EvaAvatar.groupUri(channel.id,channel.color),
      threads:(channel.threads||[]).filter(thread=>!thread.deleted).map(thread=>({id:thread.id,type:'thread',kind:'子区',name:thread.name,parentId:channel.id,parentName:name,projectName:ctx&&ctx.projectName,projectId:ctx&&ctx.projectId,colorKey:ctx&&ctx.colorKey,updatedAt:thread.updated_at||thread.updatedAt||channel.lastAt,avatarUrl:window.EvaAvatar.groupUri(channel.id,channel.color)}))};
    rememberGroup(group);push(group);
  };
  (messageSource('all').channels||[]).forEach(addChannel);
  (ms.directChannels(actorId)||[]).forEach(addChannel);
  projects.forEach(project=>project.groups.forEach(group=>{rememberGroup(group);push(group);}));
  plainGroups.forEach(group=>{rememberGroup(group);push(group);});
  aiTeams.forEach(group=>{
    rememberGroup(group);
    push({id:group.id,type:'ai-team',kind:'群聊',name:group.name,updatedAt:group.updatedAt,avatarUrl:group.avatarUrl,threads:group.threads});
  });
  agents.forEach(agent=>agent.sessions.forEach(session=>push({id:session.channelId,type:'agent-session',kind:'私聊',identityId:agent.id,name:session.name,agentName:agent.name,appearance:agent.appearance,updatedAt:session.updatedAt})));
  recent.sort((a,b)=>String(b.updatedAt||'').localeCompare(String(a.updatedAt||'')));
  return {humans,agents,aiTeams,projects,plainGroups,recent,groupById,threadParent};
}
// 搜索态「关注」分组排序：与消息-关注共用同一份 followOrders 与置顶项目数据。
function evaForwardFollowRank(store,actorId){
  const snap=store.snapshot(),orders=(snap&&snap.followOrders&&snap.followOrders[actorId])||{},rank=new Map();
  const push=ids=>(ids||[]).forEach(id=>{if(!rank.has(id))rank.set(id,rank.size);});
  push(orders.categories);
  Object.keys(orders).filter(key=>key!=='categories').forEach(key=>push(orders[key]));
  (store.pinnedProjects?store.pinnedProjects(actorId):[]).forEach(id=>{push([id]);push(['space:'+id]);});
  return rank;
}
// 转发面板只订阅存在的 AI 小队数据源，缺失时保持默认值。
function evaForwardNoopSubscribe(){return()=>{};}
// 转发面板（设计确认稿 V3）：左侧默认「最近」、搜索态按分组查找，右侧已选区、预览与留言；群可展开选择或新建子区。
function EvaForwardMessagesDialog({request,store,actorId,onClose,onSent}){
  const h=React.createElement,[host,setHost]=reactExports.useState(null),
    [query,setQuery]=reactExports.useState(''),
    [chosen,setChosen]=reactExports.useState({}),[note,setNote]=reactExports.useState(''),
    [expandedGroups,setExpandedGroups]=reactExports.useState({}),[picker,setPicker]=reactExports.useState(null),
    [pickerUp,setPickerUp]=reactExports.useState(false),[createOpen,setCreateOpen]=reactExports.useState(false),
    [draftThread,setDraftThread]=reactExports.useState(null);
  // 目标目录读成员数据；新建子区（群 / AI 小队）或新群后必须按同一份状态重算。
  const revision=reactExports.useSyncExternalStore(evaMembers().store.subscribe,evaMembers().store.getSnapshot);
  const teamGroupStore=window.EvaMyAITeamGroup,aiTeamStore=window.EvaAITeam;
  const teamGroupsRevision=reactExports.useSyncExternalStore(teamGroupStore?teamGroupStore.subscribe:evaForwardNoopSubscribe,()=>teamGroupStore?teamGroupStore.getSnapshot():0);
  const teamRevision=reactExports.useSyncExternalStore(aiTeamStore?aiTeamStore.subscribe:evaForwardNoopSubscribe,()=>aiTeamStore?aiTeamStore.getSnapshot():0);
  const catalog=reactExports.useMemo(()=>evaForwardCatalog(actorId),[actorId,revision,teamGroupsRevision,teamRevision]);
  const noteRef=reactExports.useRef(null),selectedRef=reactExports.useRef(null),pendingReveal=reactExports.useRef(null),candidatesRef=reactExports.useRef(null);
  const agentById=id=>catalog.agents.find(agent=>agent.id===id);
  const groupById=id=>catalog.groupById[id];
  const destinationsOf=agent=>[{id:'new:'+agent.id,name:'新会话'},...agent.sessions.slice(0,5)];
  const count=Object.values(chosen).reduce((total,entry)=>total+(entry.type==='agent'||entry.type==='group'?entry.sessions.length:1),0);
  const setRevealed=(updater,id)=>{pendingReveal.current=id;setChosen(updater);};
  const toggleTarget=row=>setRevealed(previous=>{const next={...previous};if(next[row.id])delete next[row.id];else next[row.id]={type:'target',row};return next;},row.id);
  const toggleAgentIdentity=agent=>setRevealed(previous=>{const next={...previous};if(next[agent.id])delete next[agent.id];else next[agent.id]={type:'agent',agent,sessions:['new:'+agent.id]};return next;},agent.id);
  const toggleAgentSession=(agent,channelId)=>setRevealed(previous=>{
    const next={...previous},entry=next[agent.id];
    if(entry&&entry.type==='agent'){
      if(entry.sessions.includes(channelId)){if(entry.sessions.length===1)delete next[agent.id];else next[agent.id]={...entry,sessions:entry.sessions.filter(item=>item!==channelId)};}
      else next[agent.id]={...entry,sessions:[...entry.sessions,channelId]};
    }else next[agent.id]={type:'agent',agent,sessions:[channelId]};
    return next;},agent.id);
  const toggleDestination=(agent,destinationId)=>setChosen(previous=>{
    const entry=previous[agent.id];if(!entry||entry.type!=='agent')return previous;
    const sessions=entry.sessions.includes(destinationId)?entry.sessions.filter(item=>item!==destinationId):[...entry.sessions,destinationId];
    const next={...previous};if(sessions.length)next[agent.id]={...entry,sessions};else delete next[agent.id];
    return next;});
  // 群卡片默认只发本群，展开后才在「发送至」里多选已有子区或就地新建子区。
  const groupRowOf=row=>{
    if(row.type==='group'||row.type==='ai-team')return groupById(row.id)||row;
    if(row.type==='thread'||row.type==='ai-team-thread')return groupById(row.parentId||catalog.threadParent[row.id]);
    return null;
  };
  const toggleGroupIdentity=group=>setRevealed(previous=>{const next={...previous};if(next[group.id])delete next[group.id];else next[group.id]={type:'group',groupId:group.id,sessions:['self']};return next;},group.id);
  const toggleGroupDestination=(group,destinationId)=>setRevealed(previous=>{
    const entry=previous[group.id];
    if(!entry||entry.type!=='group')return {...previous,[group.id]:{type:'group',groupId:group.id,sessions:[destinationId]}};
    const sessions=entry.sessions.includes(destinationId)?entry.sessions.filter(item=>item!==destinationId):[...entry.sessions,destinationId];
    const next={...previous};if(sessions.length)next[group.id]={...entry,sessions};else delete next[group.id];
    return next;},group.id);
  const removeEntry=id=>setChosen(previous=>{const next={...previous};delete next[id];setDraftThread(null);return next;});
  const clearAll=()=>{setChosen({});setPicker(null);setDraftThread(null);};
  const onToggle=row=>{
    if(row.type==='agent-session'){const agent=agentById(row.identityId);if(agent)toggleAgentSession(agent,row.id);else toggleTarget(row);return;}
    if(row.type==='agent'){toggleAgentIdentity(row);return;}
    if(row.type==='group'||row.type==='ai-team'){const group=groupRowOf(row);if(group)toggleGroupIdentity(group);return;}
    if(row.type==='thread'||row.type==='ai-team-thread'){const group=groupRowOf(row);if(group)toggleGroupDestination(group,row.id);return;}
    toggleTarget(row);
  };
  const isChecked=row=>{
    if(row.type==='agent-session'){const entry=chosen[row.identityId];return !!(entry&&entry.type==='agent'&&entry.sessions.includes(row.id));}
    if(row.type==='thread'||row.type==='ai-team-thread'){const group=groupRowOf(row),entry=group&&chosen[group.id];return !!(entry&&entry.type==='group'&&entry.sessions.includes(row.id));}
    return !!chosen[row.id];
  };
  reactExports.useEffect(()=>{
    const id=pendingReveal.current;pendingReveal.current=null;
    if(!id||!selectedRef.current)return;
    const node=selectedRef.current.querySelector('[data-selected-id="'+window.CSS.escape(id)+'"]');
    if(node)node.scrollIntoView({block:'nearest',behavior:'smooth'});
  },[chosen]);
  reactExports.useEffect(()=>{const node=candidatesRef.current;if(node)node.scrollTop=0;},[query]);
  reactExports.useEffect(()=>{
    // 「创建群聊并发送」弹窗在面板之上：Escape 只交给它自己关闭，面板保持打开与已选状态。
    const onKey=event=>{if(event.key!=='Escape')return;if(createOpen)return;event.preventDefault();if(draftThread){setDraftThread(null);return;}if(picker){setPicker(null);return;}onClose();};
    document.addEventListener('keydown',onKey);
    return()=>document.removeEventListener('keydown',onKey);
  },[onClose,picker,draftThread,createOpen]);
  // 「发送至」下拉菜单接入全站唯一失焦关闭控制器（docs/弹窗失焦关闭规范.md）。
  reactExports.useEffect(()=>{
    if(!picker||!window.EvaPopupDismiss)return undefined;
    return window.EvaPopupDismiss.watch({
      id:'eva-forward-picker',
      isOpen:()=>true,
      close:()=>setPicker(null),
      keep:()=>host&&host.querySelector('.eva-fp-picker.is-open'),
      token:()=>picker
    });
  },[picker,host]);
  const resizeNote=()=>{const node=noteRef.current;if(!node)return;node.style.height='auto';node.style.height=Math.min(node.scrollHeight,66)+'px';node.scrollTop=node.scrollHeight;};
  // 下拉菜单不固定向下弹出：下方放不下且上方空间更大时，原地向上弹出。
  const openPicker=(id,control,optionCount)=>{
    if(picker===id){setPicker(null);return;}
    const rect=control.getBoundingClientRect(),bounds=(selectedRef.current||document.documentElement).getBoundingClientRect();
    const menuHeight=Math.min(optionCount*34+10,232),below=bounds.bottom-rect.bottom,above=rect.top-bounds.top;
    setPickerUp(below<menuHeight&&above>below);
    setPicker(id);
  };
  const projectTone=row=>window.EvaProjectAppearance?window.EvaProjectAppearance.get({id:row.projectId||row.id,colorKey:row.colorKey}):null;
  const avatarNode=row=>{
    if(row.type==='human')return h('img',{className:'eva-fp-avatar',src:row.avatarUrl||window.EvaAvatar.personUri(row.personId||row.id),width:36,height:36,alt:'',draggable:false});
    if(row.type==='agent'||row.type==='agent-session')return h(EvaAIIdentityAvatar,{appearance:row.appearance,size:36});
    if(row.avatarUrl)return h('img',{className:'eva-fp-avatar',src:row.avatarUrl,width:36,height:36,alt:'',draggable:false});
    if(row.type==='group'||row.type==='thread'){
      const tone=projectTone(row);
      return h('span',{className:'eva-fp-avatar eva-fp-avatar--group','aria-hidden':true,
        style:tone?{color:tone.accent,background:tone.surface,border:'1px solid '+tone.border}:{color:'#67718a',background:'#eef1f5',border:'1px solid #dde2ea'}},evaForwardIcon('users',{size:20}));
    }
    return h('span',{className:'eva-fp-avatar eva-fp-avatar--group eva-fp-avatar--team','aria-hidden':true},evaForwardIcon('bot',{size:20}));
  };
  const contextNode=row=>{
    if(row.type==='agent-session')return h('span',{className:'eva-fp-context'},h('span',{className:'eva-fp-context-text'},row.agentName),h(AiBadge,{size:'small'}));
    if(row.type==='thread'||row.type==='ai-team-thread'){
      const label=[row.projectName,row.parentName].filter(Boolean).join(' / ')||row.parentName||'';
      return label?h('span',{className:'eva-fp-context'},
        row.projectName?h('span',{className:'eva-fp-context-project',style:{color:projectTone(row)?projectTone(row).accent:'#6778ff'}},evaForwardIcon('layout-grid',{size:13})):null,
        h('span',{className:'eva-fp-context-text'},label)):null;
    }
    if(row.type==='group'&&row.projectName)return h('span',{className:'eva-fp-context'},
      h('span',{className:'eva-fp-context-project',style:{color:projectTone(row)?projectTone(row).accent:'#6778ff'}},evaForwardIcon('layout-grid',{size:13})),
      h('span',{className:'eva-fp-context-text'},row.projectName));
    if(row.type==='agent')return h('span',{className:'eva-fp-context'},h('span',{className:'eva-fp-context-text'},'发起新会话'));
    return null;
  };
  const rowNode=row=>{
    const checked=isChecked(row),context=contextNode(row);
    return h('div',{key:row.id,className:'eva-fp-row-wrap'},
      h('div',{className:'eva-fp-row-head'+(checked?' is-checked':'')},
        h('label',{className:'eva-fp-row'+(checked?' is-checked':'')},
          h('input',{type:'checkbox',checked:!!checked,onChange:()=>onToggle(row)}),
          avatarNode(row),
          h('span',{className:'eva-fp-info'},
            context,
            h('span',{className:'eva-fp-name'+((row.type==='agent-session'||row.type==='agent'||context)?' eva-fp-name--strong':'')},
              h('span',{className:'eva-fp-name-text'},row.name),
              row.type==='agent'?h(AiBadge,{size:'small'}):null)),
          h('span',{className:'eva-fp-kind'},row.kind))));
  };
  const searchResults=reactExports.useMemo(()=>{
    const raw=query.trim().toLowerCase();
    if(!raw)return null;
    const tokens=raw.split(/\s+/).filter(Boolean);
    const score=name=>{const value=String(name||'').toLowerCase();if(value===raw)return 4;if(value.startsWith(raw))return 3;if(tokens.length&&tokens.every(token=>value.includes(token)))return 2;return 0;};
    const combined=row=>[row.projectName,row.parentName,row.name].filter(Boolean).join(' ').toLowerCase();
    const fuzzy=row=>tokens.length&&tokens.every(token=>combined(row).includes(token))?1:0;
    const followRank=evaForwardFollowRank(store,actorId);
    const rankOf=row=>followRank.get(row.id)??followRank.get(row.category)??followRank.get('space:'+row.projectId)??999;
    const buckets={follow:[],contacts:[],ai:[],conversations:[]};
    const add=(row,value)=>{
      if(!value)return;
      const bucket=store.conversationFollowed(row.id,actorId)?'follow':row.type==='human'?'contacts':row.type==='agent'||row.type==='agent-session'?'ai':'conversations';
      const items=buckets[bucket],existing=items.find(item=>item.row.id===row.id);
      if(existing){if(value>existing.score)existing.score=value;return;}
      items.push({row,score:value});
    };
    catalog.humans.forEach(row=>add(row,score(row.name)));
    catalog.agents.forEach(agent=>{
      add(agent,score(agent.name));
      agent.sessions.forEach(session=>{
        const row={id:session.channelId,type:'agent-session',kind:'私聊',identityId:agent.id,name:session.name,agentName:agent.name,appearance:agent.appearance,updatedAt:session.updatedAt};
        add(row,score(row.name)||fuzzy({name:agent.name+' '+session.name}));
      });
    });
    const conversations=[],conversationSeen=new Set();
    const collect=row=>{if(!row||conversationSeen.has(row.id))return;conversationSeen.add(row.id);conversations.push(row);};
    catalog.recent.forEach(collect);
    catalog.projects.forEach(project=>project.groups.forEach(collect));
    catalog.plainGroups.forEach(collect);
    catalog.aiTeams.forEach(collect);
    // 子区只在群卡片的「发送至」里选择，但搜索要覆盖全部群（含消息数据源里的演示群）的子区。
    Object.values(catalog.groupById).forEach(group=>(group.threads||[]).forEach(collect));
    conversations.forEach(row=>add(row,score(row.name)||fuzzy(row)));
    // 分组顺序：关注 → 联系人 → 我的 Agent → 群聊与子区；关注组内沿用消息-关注的排序。
    const labels={follow:'关注',contacts:'联系人',ai:'我的 Agent',conversations:'群聊与子区'};
    return ['follow','contacts','ai','conversations'].filter(id=>buckets[id].length).map(id=>({id,label:labels[id],
      results:buckets[id].sort((a,b)=>b.score-a.score||rankOf(a.row)-rankOf(b.row)||String(b.row.updatedAt||'').localeCompare(String(a.row.updatedAt||''))).map(item=>item.row)}));
  },[query,catalog,store,actorId]);
  const leftContent=()=>{
    if(searchResults){
      return searchResults.length?searchResults.map(group=>h('section',{key:group.id,className:'eva-fp-search-group'},
        h('div',{className:'eva-fp-group-title'},group.label),
        group.results.map(row=>rowNode(row))))
        :h('div',{className:'eva-fp-empty'},'没有找到相关对象',h('small',null,'试试其他名称'));
    }
    return catalog.recent.length?h(React.Fragment,null,h('div',{className:'eva-fp-group-title'},'最近'),catalog.recent.map(row=>rowNode(row))):h('div',{className:'eva-fp-empty'},'暂无可转发的最近会话');
  };
  const previewText=()=>{
    const messages=request.messages||[];
    if(!messages.length)return '';
    if(request.mode==='merge')return '[合并转发] 共 '+messages.length+' 条消息 · '+String(messages[0].text||messages[0].file&&messages[0].file.name||'聊天记录').replace(/\s+/g,' ');
    const first=messages[0];
    const digest=first.kind==='file'?'[文件] '+(first.file&&first.file.name||'附件'):String(first.text||'').replace(/\s+/g,' ');
    return messages.length>1?'[逐条转发 '+messages.length+' 条消息] '+digest:digest;
  };
  const entryCard=(id,entry)=>{
    if(entry.type==='target'){
      const row=entry.row;
      return h('div',{key:id,className:'eva-fp-selected','data-selected-id':id},
        h('div',{className:'eva-fp-selected-row'},
          avatarNode(row),
          h('span',{className:'eva-fp-info eva-fp-selected-info'},
            contextNode(row),
            h('span',{className:'eva-fp-name'},h('span',{className:'eva-fp-name-text'},row.name))),
          h('button',{type:'button',className:'eva-fp-remove','aria-label':'移除 '+row.name,onClick:()=>removeEntry(id)},evaForwardIcon('x',{size:16}))));
    }
    if(entry.type==='group'){
      const group=groupById(entry.groupId)||entry.group;
      const options=[{id:'self',name:'本群'},...(group.threads||[]).map(thread=>({id:thread.id,name:thread.name}))];
      const showPicker=!!expandedGroups[entry.groupId]||entry.sessions.some(destination=>destination!=='self');
      const summary=entry.sessions.length===1?((options.find(option=>option.id===entry.sessions[0])||{}).name||'请选择发送目标'):'已选 '+entry.sessions.length+' 个会话';
      const creatable=group.type==='group'||group.type==='ai-team';
      const threadNameMax=group.type==='ai-team'?100:30;
      return h('div',{key:id,className:'eva-fp-selected eva-fp-selected--group','data-selected-id':id},
        h('div',{className:'eva-fp-selected-row'},
          avatarNode(group),
          h('span',{className:'eva-fp-info eva-fp-selected-info'},
            contextNode(group),
            h('span',{className:'eva-fp-name eva-fp-name--strong'},h('span',{className:'eva-fp-name-text'},group.name))),
          h('button',{type:'button',className:'eva-fp-row-toggle','aria-expanded':showPicker,'aria-label':(showPicker?'收起':'展开')+group.name+'的发送目标',
            onClick:()=>setExpandedGroups(previous=>({...previous,[entry.groupId]:!showPicker}))},evaForwardIcon('chevron-down',{size:14})),
          h('button',{type:'button',className:'eva-fp-remove','aria-label':'移除 '+group.name,onClick:()=>{if(picker===id)setPicker(null);removeEntry(id);}},evaForwardIcon('x',{size:14}))),
        showPicker?h('div',{className:'eva-fp-picker'+(picker===id?' is-open':'')+(picker===id&&pickerUp?' is-up':'')},
          h('span',{className:'eva-fp-picker-label'},'发送至'),
          h('button',{type:'button',className:'eva-fp-picker-control','aria-expanded':picker===id,onClick:event=>openPicker(id,event.currentTarget,options.length+(creatable?1:0))},
            h('span',{className:'eva-fp-picker-summary'},summary),evaForwardIcon('chevron-down',{size:14})),
          picker===id?h('div',{className:'eva-fp-picker-menu',role:'group','aria-label':'选择 '+group.name+' 的发送目标'},
            options.map(option=>h('label',{key:option.id,className:'eva-fp-picker-option'},
              h('input',{type:'checkbox',checked:entry.sessions.includes(option.id),onChange:()=>toggleGroupDestination(group,option.id)}),
              option.id==='self'?null:evaForwardIcon('corner-down-right',{size:14,className:'eva-fp-picker-option-icon'}),
              h('span',null,option.name))),
            creatable?(draftThread&&draftThread.groupId===group.id
              ?h(EvaForwardThreadForm,{key:group.id,maxLength:threadNameMax,onSubmit:name=>createThreadFromForward(group,name),onCancel:()=>setDraftThread(null)})
              :h('button',{type:'button',className:'eva-fp-picker-new-btn',onClick:()=>setDraftThread({groupId:group.id,name:''})},evaForwardIcon('plus',{size:14}),'新建子区'))
              :null):null):null);
    }
    const agent=entry.agent,destinations=destinationsOf(agent);
    const extra=entry.sessions.filter(channelId=>!destinations.some(destination=>destination.id===channelId))
      .map(channelId=>{const session=agent.sessions.find(item=>item.channelId===channelId);return session?{id:channelId,name:session.name}:null;}).filter(Boolean);
    const all=destinations.concat(extra);
    const summary=entry.sessions.length===1?((all.find(destination=>entry.sessions.includes(destination.id))||{}).name||'请选择会话'):entry.sessions.length?'已选 '+entry.sessions.length+' 个会话':'请选择会话';
    return h('div',{key:id,className:'eva-fp-selected eva-fp-selected--agent','data-selected-id':id},
      h('div',{className:'eva-fp-selected-row'},
        avatarNode(agent),
        h('span',{className:'eva-fp-info eva-fp-selected-info'},
          h('span',{className:'eva-fp-name eva-fp-name--strong'},h('span',{className:'eva-fp-name-text'},agent.name),h(AiBadge,{size:'small'}))),
        h('button',{type:'button',className:'eva-fp-remove','aria-label':'移除 '+agent.name,onClick:()=>{if(picker===id)setPicker(null);removeEntry(id);}},evaForwardIcon('x',{size:14}))),
      h('div',{className:'eva-fp-picker'+(picker===id?' is-open':'')+(picker===id&&pickerUp?' is-up':'')},
        h('span',{className:'eva-fp-picker-label'},'发送至'),
        h('button',{type:'button',className:'eva-fp-picker-control','aria-expanded':picker===id,onClick:event=>openPicker(id,event.currentTarget,all.length)},
          h('span',{className:'eva-fp-picker-summary'},summary),evaForwardIcon('chevron-down',{size:14})),
        picker===id?h('div',{className:'eva-fp-picker-menu',role:'group','aria-label':'选择 '+agent.name+' 的发送会话'},
          all.map(destination=>h('label',{key:destination.id,className:'eva-fp-picker-option'},
            h('input',{type:'checkbox',checked:entry.sessions.includes(destination.id),onChange:()=>toggleDestination(agent,destination.id)}),
            h('span',null,destination.name)))):null));
  };
  const createSession=agent=>{
    if(agent.role==='employee'){
      const sessionId=window.EvaDigitalEmployeesStore.createThread(agent.id);
      return window.EvaAIPrivateConversations.threadRecord(agent.id,{id:sessionId}).channel_id;
    }
    const sessionId=window.EvaAITeam.createThread(agent.id);
    return window.EvaAIPrivateConversations.threadRecord(agent.id,{id:sessionId}).channel_id;
  };
  const createThreadFromForward=(group,name)=>{
    const teamGroup=group.type==='ai-team';

      // 与群内「新建子区」同一数据链路：真实登记子区并继承父群项目与权限。
      let threadId;
      if(teamGroup){
        threadId=window.EvaMyAITeamGroup.createThread(group.id,{name});
      }else{
        const now=new Date().toISOString();
        threadId='th-'+Date.now().toString(36)+'-'+Math.random().toString(36).slice(2,6);
        store.createThread(threadId,group.id,{id:threadId,name,status:1,created_at:now,updated_at:now,creator_name:(store.person(actorId)||{}).name||'',member_count:1,message_count:0},actorId);
      }
      setDraftThread(null);
      toggleGroupDestination(groupById(group.id)||group,threadId);
  };
  const submit=()=>{
    const text=note.trim();
    try{
      for(const entry of Object.values(chosen)){
        if(entry.type==='target'){
          const row=entry.row;
          if(row.personId)store.openDirect(actorId,row.personId);
          store.forwardMessages(request.sourceId,row.id,actorId,request.messages,request.mode,text);
          continue;
        }
        if(entry.type==='group'){
          for(const destination of entry.sessions)store.forwardMessages(request.sourceId,destination==='self'?entry.groupId:destination,actorId,request.messages,request.mode,text);
          continue;
        }
        for(const destination of entry.sessions){
          const channelId=destination.startsWith('new:')?createSession(entry.agent):destination;
          store.forwardMessages(request.sourceId,channelId,actorId,request.messages,request.mode,text);
        }
      }
      onSent();
    }catch(error){Toast.error(error.message||'消息未能转发，请重试');}
  };
  const entries=Object.entries(chosen);
  // 蒙版覆盖标题栏下方的整个客户端内容区（含会话列表栏），与设计确认稿 .veil{position:fixed;inset:44px 0 0} 一致；
  // 挂到 document.body 避免被内容区层叠上下文限制，与删除消息弹窗同一挂载合同。
  return ReactDOM.createPortal(h('div',{ref:setHost,className:'eva-forward-host'},host&&h('div',{className:'eva-fp-veil',onPointerDown:event=>{if(event.target===event.currentTarget)onClose();}},
    h('div',{className:'eva-fp-modal',role:'dialog','aria-modal':true,'aria-label':'转发消息'},
      h('header',{className:'eva-fp-head'},h('h1',null,'转发消息'),
        h('button',{type:'button',className:'eva-fp-close','aria-label':'关闭转发弹窗',onClick:onClose},evaForwardIcon('x',{size:18}))),
      h('div',{className:'eva-fp-body'},
        h('section',{className:'eva-fp-left'},
          h('div',{className:'eva-fp-search-row'},
            h('div',{className:'eva-forward-search'},
              evaForwardIcon('search',{size:16}),
              h('input',{value:query,'aria-label':'搜索转发目标',placeholder:'搜索联系人、Agent、群聊及其子区',
                onChange:event=>setQuery(event.target.value)}),
              query?h('button',{type:'button',className:'eva-fp-search-clear','aria-label':'清空搜索',onClick:()=>{setQuery('');}},evaForwardIcon('x',{size:14})):null),
            h('button',{type:'button',className:'eva-fp-create-group',onClick:()=>setCreateOpen(true)},evaForwardIcon('plus',{size:14}),h('span',null,'新建群聊'))),
          h('div',{className:'eva-fp-candidates'+(searchResults?' is-searching':''),ref:candidatesRef},leftContent())),
        h('section',{className:'eva-fp-right'},
          h('div',{className:'eva-fp-selected-head'},
            h('strong',null,count>1?'分别发送给':'发送给'),
            h('span',{className:'eva-fp-selected-meta'},count?'已选择 '+count+' 个会话':''),
            h('button',{type:'button',className:'eva-fp-clear',disabled:!entries.length,onClick:clearAll},'清空')),
          h('div',{className:'eva-fp-selected-list',ref:selectedRef},
            entries.length?entries.map(([id,entry])=>entryCard(id,entry)):h('div',{className:'eva-fp-empty'},'从左侧选择转发对象')),
          h('div',{className:'eva-fp-preview','aria-label':'转发内容预览'},h('span',{className:'eva-fp-preview-text'},previewText())),
          h('textarea',{ref:noteRef,className:'eva-fp-note',rows:1,placeholder:'添加留言（可选）',value:note,
            onInput:event=>{setNote(event.target.value);resizeNote();}}))),
      h('footer',{className:'eva-fp-foot'},
        h(Button,{onClick:onClose},'取消'),
        h(Button,{theme:'solid',type:'primary',disabled:!count,onClick:submit},count>1?'分别发送（'+count+'）':'发送')))),
    // 新建群聊复用群聊管理的同一组件，只改文案；创建成功后作为已选对象放回右栏，面板不关闭。
    createOpen?h(evaMembers().ui.CreateGroup,{visible:true,title:'创建群聊并发送',submitLabel:'创建并发送',zIndex:1200,onClose:()=>setCreateOpen(false),onCreated:id=>{
      const record=store.snapshot().groups[id];
      const group={id,type:'group',kind:'群聊',name:(record&&record.name)||'新群聊',colorKey:null,category:'scope:other',color:record&&record.color,updatedAt:new Date().toISOString(),threads:[],avatarUrl:window.EvaAvatar.groupUri(id,record&&record.color)};
      setRevealed(previous=>({...previous,[id]:{type:'group',groupId:id,group,sessions:['self']}}),id);
    }}):null),document.body);
}
// Octo ReplyBlock structure; Eva supplies the existing message snapshot.
function EvaReplyBlock({reply,onClick}) {
  const h=React.createElement;
  return h("div",{className:"wk-reply-block",onClick,role:onClick?"button":undefined,tabIndex:onClick?0:undefined,onKeyDown:onClick?event=>{if(event.key==="Enter"||event.key===" "){event.preventDefault();onClick(event)}}:undefined},h("div",{className:"wk-reply-block__bar"}),h("div",{className:"wk-reply-block__content"},h("span",{className:"wk-reply-block__name-row"},h("span",{className:"wk-reply-block__name"},reply.fromName)),h("span",{className:"wk-reply-block__digest"},reply.digest)));
}
function evaSelectionMessageKey(scope, message, index, messages) {
  if (message?.id || message?.fixtureId) return JSON.stringify([scope, message.id || message.fixtureId]);
  const signature = item => JSON.stringify([item?.kind,item?.sender?.uid,item?.time,item?.text,item?.file?.id,item?.file?.name,item?.ref,item?.thread]);
  const value = signature(message);
  const occurrence = messages.slice(0,index).filter(item => signature(item) === value).length;
  return JSON.stringify([scope,value,occurrence]);
}
function evaComposerMentionRange(editor){
 const selection=window.getSelection();if(!selection?.isCollapsed)return null;
 const node=selection.anchorNode,offset=selection.anchorOffset;
 if(node?.nodeType!==3||!editor.contains(node)||node.parentElement.closest('.mention-entity'))return null;
 const match=node.textContent.slice(0,offset).match(/(?:^|[\s，。！？、])@([^@\s，。！？、]*)$/u);
 if(!match)return null;
 const range=document.createRange();range.setStart(node,offset-match[1].length-1);range.setEnd(node,offset);return {range,query:match[1]};
}
function evaInsertComposerMention(editor,name,uid,replaceRange){
  if(!editor)return;
  if(replaceRange){const mention=document.createElement('span');mention.className='mention-entity';mention.contentEditable='false';mention.dataset.mentionUid=uid||'';mention.textContent='@'+name;replaceRange.deleteContents();replaceRange.insertNode(mention);const space=document.createTextNode(' ');mention.after(space);const range=document.createRange();range.setStartAfter(space);range.collapse(true);const selection=window.getSelection();selection.removeAllRanges();selection.addRange(range);editor.focus();return;}
  const last=editor.lastChild;
  if(last?.nodeType===3&&last.textContent.endsWith('@'))last.textContent=last.textContent.slice(0,-1);
  if(editor.textContent&&!/\s$/.test(editor.textContent))editor.appendChild(document.createTextNode(' '));
  const mention=document.createElement('span');mention.className='mention-entity';mention.contentEditable='false';mention.dataset.mentionUid=uid||'';mention.textContent='@'+name;
  editor.append(mention,document.createTextNode(' '));editor.focus();
  const range=document.createRange();range.selectNodeContents(editor);range.collapse(false);const selection=window.getSelection();selection.removeAllRanges();selection.addRange(range);
}
function evaEmojiRecentRead(key){try{const v=JSON.parse(window.localStorage.getItem(key));return Array.isArray(v)?v.filter(e=>typeof e==='string').slice(0,24):[];}catch(e){return[];}}
function evaEmojiRecentWrite(key,list){try{window.localStorage.setItem(key,JSON.stringify(list.slice(0,24)));}catch(e){}}
// 原型用 mock 表情集：100 个常用 emoji，分 6 组，不含肤色变体
function evaEmojiGroups(){return[
  {name:'表情',items:['😀','😃','😄','😁','😆','😅','😂','🤣','😊','🙂','🙃','😉','😌','😍','🥰','😘','😗','😙','😚','😋','😛','😜','🤪','😝','🤗','🤔','🤨','😐','😑','😶']},
  {name:'手势',items:['👍','👎','👌','✌️','🤞','🤟','👏','🙌','👐','🙏','💪','👋','🤝','✊','🤙','🖐️']},
  {name:'心情',items:['❤️','🧡','💛','💚','💙','💜','🖤','🤍','💔','💕','💯','❣️']},
  {name:'动物',items:['🐶','🐱','🐭','🐹','🐰','🦊','🐻','🐼','🐨','🐯','🦁','🐮']},
  {name:'食物',items:['🍎','🍊','🍋','🍉','🍇','🍓','🍑','🍒','🍔','🍕','🍟','🍰']},
  {name:'其他',items:['⚽','🏀','🎉','🎁','🎈','🔥','⭐','✨','💡','📌','✅','❌','❓','❗','🎯','🚀','🌈','👀']}
];}
function evaEmojiAll(){return evaEmojiGroups().reduce((all,g)=>all.concat(g.items),[]);}
// 「最近使用」以用户实际发送为准：扫描发出的文本，把其中出现的已知表情按出现顺序并入最近列表
function evaEmojiRecordFromText(text){
  if(!text)return;
  const key='aionui.emoji.recent';
  const used=evaEmojiAll().filter(e=>text.indexOf(e)>=0).sort((a,b)=>text.indexOf(a)-text.indexOf(b));
  if(!used.length)return;
  const prev=evaEmojiRecentRead(key);
  const merged=used.concat(prev.filter(e=>used.indexOf(e)<0)).slice(0,24);
  evaEmojiRecentWrite(key,merged);
}
function evaInsertComposerEmoji(editor,emoji,savedRange){
  if(!editor)return null;
  editor.focus();
  const selection=window.getSelection();
  let range=savedRange&&editor.contains(savedRange.startContainer)?savedRange:null;
  if(!range&&selection.rangeCount&&editor.contains(selection.anchorNode))range=selection.getRangeAt(0);
  if(!range){range=document.createRange();range.selectNodeContents(editor);range.collapse(false);}
  const node=document.createTextNode(emoji);
  range.deleteContents();range.insertNode(node);
  const after=document.createRange();after.setStartAfter(node);after.collapse(true);
  selection.removeAllRanges();selection.addRange(after);
  editor.focus();
  return after.cloneRange();
}
function EvaEmojiPicker(props){
  const visible=props.visible,onClose=props.onClose,onChoose=props.onChoose;
  const RECENT_KEY='aionui.emoji.recent';
  const groups=evaEmojiGroups();
  const [recent,setRecent]=reactExports.useState(function(){return evaEmojiRecentRead(RECENT_KEY);});
  const rootRef=reactExports.useRef(null);
  reactExports.useEffect(function(){
    if(!visible)return;
    setRecent(evaEmojiRecentRead(RECENT_KEY));// 每次打开刷新（记录发生在发送时）
    const onDoc=function(e){if(rootRef.current&&!rootRef.current.contains(e.target)&&!(e.target.closest&&e.target.closest('[aria-label="表情"]')))onClose();};
    const onKey=function(e){if(e.key==='Escape')onClose();};
    document.addEventListener('mousedown',onDoc);document.addEventListener('keydown',onKey);
    return function(){document.removeEventListener('mousedown',onDoc);document.removeEventListener('keydown',onKey);};
  },[visible]);
  if(!visible)return null;
  const pick=function(emoji){onChoose(emoji);};// 仅插入，不在此记录最近使用
  const cell=function(emoji,i){return React.createElement('button',{type:'button',key:emoji+':'+i,className:'eva-im-emoji-picker__cell','aria-label':emoji,onClick:function(){pick(emoji);}},emoji);};
  const section=function(name,items){return React.createElement('section',{className:'eva-im-emoji-picker__group',key:name},React.createElement('h4',{className:'eva-im-emoji-picker__title'},name),React.createElement('div',{className:'eva-im-emoji-picker__grid'},items.map(cell)));};
  return React.createElement('div',{className:'eva-im-emoji-picker',role:'dialog','aria-label':'表情',ref:rootRef},
    recent.length>0&&section('最近使用',recent),
    groups.map(function(g){return section(g.name,g.items);}));
}
function evaComposerPlainText(element) {
  // Chromium inserts empty block placeholders; innerText counts their BR twice.
  const read = node => {
    if (node.nodeType === 3) return node.nodeValue || "";
    if (node.nodeName === "BR") return "\n";
    let result = "";
    Array.from(node.childNodes).forEach((child, index) => {
      const block = child.nodeType === 1 && /^(DIV|P)$/.test(child.nodeName);
      if (block && index > 0) result += "\n";
      const emptyBlock = block && child.childNodes.length === 1 && child.firstChild.nodeName === "BR";
      if (!emptyBlock) result += read(child);
    });
    return result;
  };
  return read(element);
}
function evaIdentityAppearance(identity) {
  const original = window.__EVA_MY_ASSISTANT_IDENTITY;
  if(identity.role==='persona')return window.EvaAIIdentity.cloneAppearance({name:original.ownerName,id:original.ownerId});
  return window.EvaAIIdentity.assistantAppearance(identity);
}
function EvaAIIdentityAvatar({appearance,size=32}) {
  return window.EvaAIIdentity.avatar(appearance,size,React.createElement);
}

function evaPreviewFixture(file) {
  return window.__EVA_FILE_PREVIEW_FIXTURES?.[file?.sourceFileName||file?.name]||{};
}

function EvaWordPreviewRenderer({file,onError}) {
  const h=React.createElement;
  const [loaded,setLoaded]=reactExports.useState(false);
  const [failed,setFailed]=reactExports.useState(false);
  const url=file.previewUrl||file.url;
  const pages=evaPreviewFixture(file).pages;
  reactExports.useEffect(()=>{setLoaded(false);setFailed(false);},[url]);
  if(!file.previewUrl&&pages){
  return h('div',{className:'eva-word-preview','aria-label':'Word 文档内容'},pages.map((page,index)=>h('article',{className:'eva-word-preview__page',key:index,'aria-label':'第 '+(index+1)+' 页'},
    h('small',{className:'eva-word-preview__kicker'},page.kicker||'Word 文档'),
    h('h2',null,page.title||file.name),
    page.subtitle&&h('p',{className:'eva-word-preview__subtitle'},page.subtitle),
    (page.paragraphs||[]).map((paragraph,paragraphIndex)=>h('p',{key:'p'+paragraphIndex},paragraph)),
    (page.sections||[]).map((section,sectionIndex)=>h('section',{key:'s'+sectionIndex},h('h3',null,section.title),h('p',null,section.text))),
    h('footer',null,(index+1)+' / '+pages.length)
  )));
  }
  if(failed)return h('div',{className:'eva-word-preview-renderer eva-word-preview-renderer--error',role:'alert'},
    h('strong',null,'Word 文档暂时无法打开'),
    h('span',null,'请检查网络后重试，或使用顶部下载按钮在本地打开。'),
    h('button',{type:'button',onClick:()=>{setFailed(false);setLoaded(false);}},'重新加载'));
  return h('div',{className:'eva-word-preview-renderer','aria-busy':!loaded},
    !loaded&&h('div',{className:'eva-word-preview-renderer__loading',role:'status'},h('span',{className:'eva-word-preview-renderer__spinner'}),h('span',null,'正在打开 Word 文档…')),
    h('iframe',{key:failed?'retry':'document',className:'eva-word-preview-renderer__frame',src:url,title:(file.name||'Word 文档')+'在线阅读',sandbox:'allow-same-origin',onLoad:()=>setLoaded(true),onError:()=>{setFailed(true);onError?.('Word 文档加载失败');}}));
}

function EvaHtmlPreviewDocument(content,fileUrl) {
  try {
    const pageUrl=new URL(fileUrl,window.location.href);
    const documentModel=new DOMParser().parseFromString(content,'text/html');
    const declaredBase=documentModel.querySelector('base[href]');
    const resourceBase=new URL(declaredBase?.getAttribute('href')||pageUrl.href,pageUrl).href;
    documentModel.querySelectorAll('link[href],img[src],source[src],video[src],audio[src],script[src]').forEach(node=>{
      const attribute=node.hasAttribute('href')?'href':'src';
      const value=node.getAttribute(attribute);
      if(!value||/^(?:data:|blob:|#|mailto:|tel:|javascript:)/i.test(value))return;
      node.setAttribute(attribute,new URL(value,resourceBase).href);
    });
    if(declaredBase)declaredBase.setAttribute('href',resourceBase);
    return '<!doctype html>'+documentModel.documentElement.outerHTML;
  } catch (error) {
    console.warn('[EvaHtmlPreviewDocument] 资源地址解析失败，将使用原始 HTML。',error);
    return content;
  }
}

function EvaPresentationPreviewRenderer({file}) {
  const h=React.createElement;
  const fixture=evaPreviewFixture(file);
  const slides=fixture.slides;
  const [active,setActive]=reactExports.useState(0);
  reactExports.useEffect(()=>setActive(0),[file.name]);
  if(!slides?.length)return h('p',{className:'eva-file-preview-sidebar__empty'},'此文件未提供在线预览内容');
  const slide=slides[Math.min(active,slides.length-1)];
  return h('div',{className:'eva-presentation-preview','aria-label':'PPT 幻灯片内容'},
    h('div',{className:'eva-presentation-preview__stage'},h('article',{className:'eva-presentation-preview__slide is-'+(slide.accent||'violet'),'aria-label':'第 '+(active+1)+' 张幻灯片'},
      h('small',null,slide.eyebrow||'演示文稿'),h('h2',null,slide.title),h('p',null,slide.subtitle),
      slide.metric&&h('strong',{className:'eva-presentation-preview__metric'},slide.metric),
      slide.bullets&&h('ul',null,slide.bullets.map((item,index)=>h('li',{key:index},item))))),
    h('div',{className:'eva-presentation-preview__thumbs','aria-label':'幻灯片缩略图'},slides.map((item,index)=>h('button',{type:'button',key:index,className:index===active?'is-active':'',onClick:()=>setActive(index),'aria-label':'查看第 '+(index+1)+' 张'},h('span',null,index+1),h('small',null,item.title)))),
    h('div',{className:'eva-presentation-preview__controls'},h('button',{type:'button',disabled:active===0,onClick:()=>setActive(index=>Math.max(0,index-1))},'上一页'),h('span',null,(active+1)+' / '+slides.length),h('button',{type:'button',disabled:active===slides.length-1,onClick:()=>setActive(index=>Math.min(slides.length-1,index+1))},'下一页'))
  );
}

function EvaArchivePreviewRenderer({file}) {
  const h=React.createElement;
  const archive=evaPreviewFixture(file).archive;
  if(!archive)return h('p',{className:'eva-file-preview-sidebar__empty'},'此文件未提供在线预览内容');
  return h('div',{className:'eva-archive-preview','aria-label':'压缩包内容'},
    h('div',{className:'eva-archive-preview__summary'},h('span',null,h('strong',null,archive.entries.length),h('small',null,'项目')),h('span',null,h('strong',null,archive.compressedSize||'—'),h('small',null,'压缩后')),h('span',null,h('strong',null,archive.originalSize||'—'),h('small',null,'原始大小'))),
    h('div',{className:'eva-archive-preview__head'},h('span',null,'名称'),h('span',null,'类型'),h('span',null,'大小')),
    h('div',{className:'eva-archive-preview__list'},archive.entries.map((entry,index)=>h('div',{className:'eva-archive-preview__row',key:index},h('span',null,entry.path),h('small',null,entry.type),h('small',null,entry.size))))
  );
}

function EvaInlineProjectPanel({projectId,taskRequest}) {
  const h=React.createElement;
  const navigate=useNavigate();
  const [spaces,setSpaces]=reactExports.useState(()=>loadSpaces());
  const [activeProjectId,setActiveProjectId]=reactExports.useState(projectId);
  reactExports.useEffect(()=>setActiveProjectId(projectId),[projectId]);
  reactExports.useEffect(()=>()=>WKApp$1.routeRight.popAll(),[]);
  reactExports.useEffect(()=>{
    if(!taskRequest||taskRequest.projectId!==activeProjectId)return;
    const store=evaMembers().store,actor=store.actorId();
    if(!store.canRead(activeProjectId,actor)){Toast.error('你不是该任务所属项目的成员，无法查看任务');return;}
    const issue=evaTaskLinkIssue(taskRequest);
    if(!issue){Toast.error('任务不存在或已失效');return;}
    WKApp$1.routeRight.push(h(IssueDetailPage,{key:issue.id,issueId:issue.id,onChanged:()=>setSpaces(loadSpaces()),onClose:()=>WKApp$1.routeRight.pop()}));
  },[activeProjectId,taskRequest]);
  const space=spaces.find(item=>item.id===activeProjectId);
  if(!space)return null;
  setCurrentSpace(space.id,space.name);
  // 内联面板里的「全部项目」必须离开消息路由进入项目目录；仅置空 activeProjectId 只会让面板消失。
  const switchProject=id=>{if(id)setActiveProjectId(id);else navigate('/collab');};
  return h('section',{className:'eva-inline-project-panel','aria-label':space.name+' 项目页面'},
    h('div',{className:'eva-inline-project-panel__body'},
      h(SpaceFrame,{key:space.id,space,spaces,onSwitch:switchProject,onProjectUpdated:setSpaces})));
}

function EvaAssistantSourceCards({sources,value,disabled,onChange}) {
  const h=React.createElement;
  const group=reactExports.useId();
  return h('fieldset',{className:'eva-ai-team__source-options'},h('legend',null,'来源助理'),
    h('div',{className:'eva-ai-team__connection-list'},[...sources,{id:'__independent__',name:'不关联助理',online:true,independent:true}].map(l=>
      h('label',{key:l.id,className:'eva-ai-team__connection-option'+(value===l.id?' is-selected':'')},
        !l.independent&&h(EvaAIIdentityAvatar,{appearance:evaIdentityAppearance(l),size:32}),
        h('span',{className:'eva-ai-team__connection-title'},h('strong',{'data-eva-tooltip':l.name,'data-eva-tooltip-clamp':'true'},l.name),h('span',{className:'eva-ai-team__connection-status'},l.independent?'独立配置':!l.online?'本地离线':l.isDefault?'默认助理':'')),
        h('input',{type:'radio',name:group,value:l.id,checked:value===l.id,disabled:disabled||!l.online,onChange:()=>onChange(l.id),'aria-label':l.name})))));
}

function EvaAssistantEditorHost({children}) {
  const [request,setRequest]=reactExports.useState(null), host=reactExports.useRef(null);
  reactExports.useEffect(()=>{const open=options=>setRequest(options?{...options,key:Date.now()}:null);window.__evaOpenAssistantEditor=open;return()=>{if(window.__evaOpenAssistantEditor===open)delete window.__evaOpenAssistantEditor;};},[]);
  reactExports.useEffect(()=>{const close=()=>setRequest(null);window.addEventListener('hashchange',close);return()=>window.removeEventListener('hashchange',close);},[]);
  const close=()=>{const target=request?.returnFocus;setRequest(null);if(target?.focus)requestAnimationFrame(()=>target.isConnected&&target.focus());};
  return React.createElement(React.Fragment,null,children,React.createElement('div',{className:'eva-editor-host',ref:host}),request&&React.createElement(EvaAssistantEditor,{key:request.key,request,host,onClose:close}));
}
function EvaAssistantEditor({request,host,onClose}) {
  const h=React.createElement, store=window.EvaAITeam, snapshot=reactExports.useSyncExternalStore(store.subscribe,store.getSnapshot,store.getSnapshot);
  const persona=request.role==='persona', editing=request.mode==='edit';
  const existing=persona?snapshot.identities.find(i=>i.id===request.id):snapshot.localAssistants.find(i=>i.id===request.id);
  const {Form,useSubmission,SubmissionError}=evaForms;
  const [api,formState,formValues]=Form.useForm();
  const initialSource=editing?existing?.sourceAssistantId??null:request.sourceId??null;
  const sourceAssistantId=formValues.sourceAssistantId??null;
  const setSourceAssistantId=value=>api.setValue('sourceAssistantId',value);
  const local=snapshot.localAssistants.find(i=>i.id===sourceAssistantId);
  const config=(editing?existing?.configuration:snapshot.localAssistants.find(i=>i.id===initialSource)?.configuration)||{};
  const [initial]=reactExports.useState(()=>({sourceAssistantId:initialSource,name:persona?store.personaName():editing?existing?.name||'':'',description:config.description||'',identity:config.identity||'',personality:config.personality||'',about:config.about||'',skills:(config.skills||[]).join('\n'),collaboration:config.collaboration||'',model:config.model||'Qwen3.7 Plus',toolset:config.toolset??'四两的产品脑袋',avatar:persona?'':config.avatar||''}));
  const draft={name:'',description:'',identity:'',personality:'',about:'',skills:'',collaboration:'',model:'',toolset:'',avatar:'',...formValues};
  const setDraft=change=>api.setValues(change({...draft,...api.getValues()}));
  const submission=useSubmission({onSubmit:save}),busy=submission.busy;
  const [tab,setTab]=reactExports.useState('identity'),[iconOpen,setIconOpen]=reactExports.useState(false);
  const scope=reactExports.useRef(null);
  reactExports.useEffect(()=>{if(!iconOpen)return;const close=event=>{const field=scope.current?.querySelector('.eva-editor-avatar-upload');if(field&&!field.contains(event.target))setIconOpen(false);};document.addEventListener('pointerdown',close);return()=>document.removeEventListener('pointerdown',close);},[iconOpen]);
  const update=(key,value)=>api.setValue(key,value);
  const role=persona?'分身':'助理';
  const editorTitle=(editing?'编辑':'创建')+(persona?'云端分身':'个人助理');
  const syncLabel=editing?({synced:'已同步',syncing:'正在同步',waiting:'等待记忆同步',error:'同步失败'}[existing?.syncStatus]||'等待记忆同步'):'创建后同步';
  const tabs=[['identity',role+'身份',persona?'分身名称与 Eva 头像固定，可配置角色定位和能力范围。':'定义'+role+'是谁，包括名字、头像、角色定位和能力范围。'],['personality',role+'性格','描述表达方式、判断风格和协作习惯。'],['about','关于你','补充需要了解的个人背景与偏好。'],['skills','技能','配置可以使用的技能，每行一个。']];
  if(persona)tabs.push(['collaboration','协作','设置参与协作时的职责和规则。'],['source','来源与同步','选择来源助理后，配置与已授权记忆将自动同步到云端分身。']);
  function changeSource(value){const next=value==='__independent__'?null:value;setSourceAssistantId(next);const selected=snapshot.localAssistants.find(i=>i.id===next);if(selected)setDraft(d=>({...d,...selected.configuration,...(persona?{name:store.personaName(),avatar:''}:{}),skills:(selected.configuration.skills||[]).join('\n')}));}
  function applyTemplate(item){setDraft(d=>({...d,name:d.name||item.name, ...item.configuration,...(persona?{name:store.personaName(),avatar:''}:{}),skills:item.configuration.skills.join('\n')}));}
  async function quickCreate(){try{await submission.validate(['name']);setDraft(d=>({...d,identity:d.identity||('你是'+d.name+'，协助主人处理工作事项。'),personality:d.personality||'清晰、友善；关键决策由主人确认。'}));}catch{}}
  function chooseIcon(icon){update('avatar',icon);setIconOpen(false);}
  async function save(values,{isCurrent}){
    const next={...draft,...values},avatarValue=next.avatar.trim();
    if(!persona&&avatarValue&&!window.EvaAIIdentity.isAssistantIcon(avatarValue)&&!window.EvaAIIdentity.isAvatarImage(avatarValue))throw new Error('头像数据无效，请重新选择图标');
    const configuration={...next,skills:next.skills.split('\n').map(x=>x.trim()).filter(Boolean)};delete configuration.name;delete configuration.sourceAssistantId;
    let result;
    if(persona)result=editing?store.savePersona({id:request.id,name:next.name,configuration,sourceAssistantId}):await store.createPersona(sourceAssistantId,{name:next.name,configuration});
    else{result=store.saveLocalAssistant({mode:editing?'edit':'create',id:request.id,name:next.name,configuration});if(request.connect)result=await store.connectAssistant(result.id);}
    if(isCurrent()){request.onSaved?.(result);onClose();}
  }
  const previewAppearance=persona?window.EvaAIIdentity.cloneAppearance({name:window.__EVA_MY_ASSISTANT_IDENTITY?.ownerName,id:window.__EVA_MY_ASSISTANT_IDENTITY?.ownerId}):window.EvaAIIdentity.assistantAppearance({name:draft.name||role,configuration:{avatar:draft.avatar}});
  const editor=h('section',{className:'eva-create-assistant-modal',ref:scope,'aria-label':editorTitle},h(Form,{...submission.formProps,form:api,initValues:initial,className:'eva-assistant-form'},
      h('header',{className:'eva-create-assistant-modal__head'},persona?h(EvaAIIdentityAvatar,{appearance:previewAppearance,size:34}):h('div',{className:'eva-editor-avatar-upload'},
        h('button',{type:'button',className:'eva-editor-avatar-button','data-eva-tooltip':'选择头像图标','aria-label':draft.avatar?'更换助理头像':'选择助理头像图标',disabled:busy,'aria-expanded':iconOpen,onClick:()=>setIconOpen(v=>!v)},h(EvaAIIdentityAvatar,{appearance:previewAppearance,size:34}),h('span',{className:'eva-editor-avatar-action','aria-hidden':true},h(Plus$c,{size:12,strokeWidth:1.75}))),
        iconOpen&&h('div',{className:'eva-editor-avatar-picker',role:'listbox','aria-label':'助理头像图标'},window.EvaAIIdentity.assistantIcons().map(icon=>h('button',{key:icon,type:'button',role:'option','aria-selected':draft.avatar===icon,className:'eva-editor-avatar-option'+(draft.avatar===icon?' is-selected':''),disabled:busy,onClick:()=>chooseIcon(icon)},icon)))),
        h('div',{className:'eva-create-assistant-modal__identity'},h('span',{className:'eva-editor-kind'},editorTitle),h('div',{className:'eva-editor-title-row'},h(Form.Input,{field:'name',id:'eva-assistant-name',pure:true,rules:[{required:true,whitespace:true,message:'请填写'+role+'名称'}],'aria-label':role+'名称',placeholder:role+'名称',readonly:persona||existing?.isDefault,disabled:busy})),h(Form.ErrorMessage,{error:formState.errors?.name,errorMessageId:'eva-assistant-name-errormessage'}),h(Form.Input,{field:'description',pure:true,className:'eva-editor-description','aria-label':'简短描述',placeholder:'简短描述',disabled:busy}),persona&&h('span',null,local?'同步自：'+local.name:'独立配置')),
        h('div',{className:'eva-create-assistant-modal__head-actions'},
          h(Button,{theme:'outline',type:'tertiary',onClick:quickCreate,disabled:busy},'快速创建'),
          h(Dropdown,{trigger:'click',position:'bottomRight',getPopupContainer:()=>scope.current,clickToHide:true,render:h(Dropdown.Menu,null,snapshot.localAssistants.map(i=>h(Dropdown.Item,{key:i.id,onClick:()=>applyTemplate(i)},i.name)))},h('span',{className:'eva-ai-team__menu-anchor'},h(Button,{theme:'outline',type:'tertiary',disabled:busy},'使用模板'))),
          h(Button,{theme:'borderless',type:'tertiary',icon:h(X,{size:20}),'aria-label':'关闭编辑器',onClick:onClose}))),
      h('nav',{className:'eva-create-assistant-modal__tabs',role:'tablist','aria-label':role+'设置'},tabs.map(([key,label])=>h('button',{type:'button',role:'tab','aria-selected':tab===key,key,className:'eva-create-assistant-modal__tab'+(tab===key?' is-active':''),onClick:()=>setTab(key)},label))),
      h('div',{className:'eva-create-assistant-modal__body',role:'tabpanel'},h('p',{className:'eva-create-assistant-modal__hint'},tabs.find(t=>t[0]===tab)[2]),tab==='source'?h('div',{className:'eva-editor-source'},h(EvaAssistantSourceCards,{sources:snapshot.localAssistants,value:sourceAssistantId||'__independent__',disabled:busy,onChange:changeSource}),h('p',null,local?'默认自动同步配置；分身名称与 Eva 头像保持固定。更换来源并保存后将使用新助理配置。':'独立维护当前配置，不从助理同步'),local&&h('span',{role:'status'},sourceAssistantId===existing?.sourceAssistantId?'本地 → 云端 · '+syncLabel:'保存后自动同步')):tab==='identity'?h('div',{className:'eva-editor-identity-fields'},h(Form.TextArea,{field:tab,key:tab,pure:true,keepState:true,className:'eva-create-assistant-modal__editor','aria-label':tabs.find(t=>t[0]===tab)[1],placeholder:'支持 Markdown 格式，可用中文或英文书写',disabled:busy}),!persona&&h('div',{className:'eva-editor-avatar-help'},h('span',null,'点击顶部头像选择图标替换当前头像；不选择时默认使用 Eva 头像。保存后会在会话、消息、成员与选择器中保持一致。'),draft.avatar&&h(Button,{theme:'borderless',type:'tertiary',size:'small',disabled:busy,onClick:()=>update('avatar','')},'恢复默认头像'))):h(Form.TextArea,{field:tab,key:tab,pure:true,keepState:true,className:'eva-create-assistant-modal__editor','aria-label':tabs.find(t=>t[0]===tab)[1],placeholder:tab==='skills'?'每行填写一个技能':'支持 Markdown 格式，可用中文或英文书写',disabled:busy})),
      h(SubmissionError,{submission}),
      h('footer',{className:'eva-create-assistant-modal__footer'},h(React.Fragment,null,h('span',{hidden:true,id:'eva-assistant-model-label'},'模型'),h(Form.Select,{pure:true,field:'model',id:'eva-assistant-model',getPopupContainer:()=>scope.current,disabled:busy,optionList:[{value:'Qwen3.7 Plus',label:'Qwen3.7 Plus'}]})),
        draft.toolset&&h('span',{className:'eva-create-assistant-modal__chip'},draft.toolset,h(Button,{theme:'borderless',type:'tertiary',size:'small',icon:h(X,{size:12}),'aria-label':'移除'+draft.toolset,onClick:()=>update('toolset','')})),h('span',{className:'eva-create-assistant-modal__spacer'}),h(Button,{theme:'solid',type:'primary',className:'eva-create-assistant-modal__submit',loading:busy,onClick:submission.submit},editing?'保存':'创建'))));
  const inlineTarget=request.presentation==='personal-workspace'
    ? document.querySelector('.eva-personal-workspace__stage')
    : request.presentation==='ai-team-workspace'
      ? document.querySelector('.eva-ai-team__main')
      : null;
  return inlineTarget
    ? ReactDOM.createPortal(h('div',{className:'eva-assistant-editor-inline'},editor),inlineTarget)
    : h(evaForms.Dialog,{visible:true,accessibleName:persona?'配置 AI 分身':'配置个人助理',title:null,footer:null,closable:false,onCancel:onClose,size:'editor',className:'eva-editor-dialog',getPopupContainer:()=>host.current},editor);
}
// Mirrors Octo ChatComposer.buildPlaceholder and its zh-CN translation keys.
function evaIMPlaceholder(name) {
  return name ? '发送给 ' + name : '发送消息';
}
function EvaDeleteMessagesDialog({count,onCancel,onDelete}){
 const h=React.createElement,[host,setHost]=reactExports.useState(null),[error,setError]=reactExports.useState('');
 return ReactDOM.createPortal(h('div',{ref:setHost,className:'eva-im-delete-portal'},host&&h(evaForms.Dialog,{visible:true,title:'确定删除消息？',initialFocus:'cancel',className:'eva-im-delete-dialog',size:'compact',getPopupContainer:()=>host,maskClosable:true,onCancel,footer:h(evaForms.Actions,{onCancel,submitLabel:'删除',danger:true,onSubmit:()=>{try{onDelete();}catch(e){setError(e.message);}}})},h('p',null,'删除的消息将从你的会话记录中消失，但仍对会话内其他人可见'),error&&h('p',{role:'alert'},error))),document.body);
}
function EvaIMSelectionToolbar({count,onForward,onDelete,onExit}) {
  const h=React.createElement;
  // Lucide layers: https://github.com/lucide-icons/lucide/blob/main/icons/layers.svg
  const MergeIcon=reactExports.useMemo(()=>createLucideIcon('Layers',[
    ['path',{d:'M12.83 2.18a2 2 0 0 0-1.66 0L2.6 6.08a1 1 0 0 0 0 1.83l8.58 3.91a2 2 0 0 0 1.66 0l8.58-3.9a1 1 0 0 0 0-1.83z',key:'top'}],
    ['path',{d:'M2 12a1 1 0 0 0 .58.91l8.6 3.91a2 2 0 0 0 1.65 0l8.58-3.9A1 1 0 0 0 22 12',key:'middle'}],
    ['path',{d:'M2 17a1 1 0 0 0 .58.91l8.6 3.91a2 2 0 0 0 1.65 0l8.58-3.9A1 1 0 0 0 22 17',key:'bottom'}]
  ]),[]);
  const [confirm,setConfirm]=reactExports.useState(false);
  const actions=[['merge','合并转发',MergeIcon,()=>onForward('merge')],['individual','逐条转发',EvaForwardIcon,()=>onForward('individual')],['delete','删除',Trash2,()=>setConfirm(true)]];
  return h('section',{className:'eva-im-batch-toolbar',role:'region','aria-label':'消息多选'},
    h('span',{className:'eva-im-batch-count',role:'status'},'已选择 ',count,' 条消息'),
    h('div',{className:'eva-im-batch-actions'},actions.map(([key,label,Icon,action])=>h('button',{key,type:'button',className:'eva-im-batch-action',disabled:!count,onClick:action},h('span',{className:'eva-im-batch-icon'},h(Icon,{size:24})),h('span',null,label)))),
    h('button',{type:'button',className:'eva-im-batch-exit','aria-label':'退出多选','data-eva-tooltip':'退出多选（Esc）',onClick:onExit},h(X,{size:20})),
    confirm&&h(EvaDeleteMessagesDialog,{count,onCancel:()=>setConfirm(false),onDelete:()=>{onDelete();setConfirm(false);}}));
}
function EvaMergedHistory({messages}) {
  const h=React.createElement;
  return h('details',{className:'eva-im-merged-history'},h('summary',null,h('strong',null,'聊天记录'),h('span',null,messages.length+' 条消息 · 点击展开')),
    h('div',{className:'eva-im-merged-items'},messages.map((m,i)=>h('section',{key:i},h('header',null,m.name,' · ',m.time),m.file?h('p',null,'[文件] '+m.file.name):h(TextContent,{content:m.text||'',mentions:[]})))));
}

function evaRenderableMessage(message) {
  if (!message || typeof message !== 'object') return {kind:'system',text:'该消息暂时无法展示'};
  const model=evaMembers().ui.identityModel;
  const projectIdentity=value=>{
    if(Array.isArray(value))return value.map(projectIdentity);
    if(!value||typeof value!=='object')return value;
    const projected=Object.fromEntries(Object.entries(value).map(([key,item])=>[key,projectIdentity(item)]));
    const profile=model.resolve(value.uid||value.identityId||value.id);
    if(profile?.kind==='clone'&&typeof value.name==='string'){
      projected.name=(value.name.startsWith('@')?'@':'')+profile.name;
      projected.identityAppearance=profile.appearance;
      if('avatar' in projected)projected.avatar=profile.appearance.avatar;
    }
    if(Array.isArray(value.mentions))for(const mention of value.mentions){
      const p=model.resolve(mention.uid||mention.id);
      if(p?.kind==='clone'&&mention.name&&typeof projected.text==='string')projected.text=projected.text.split(mention.name).join('@'+p.name);
    }
    return projected;
  };
  const safe=projectIdentity(message);
  if (safe.kind!=='divider'&&safe.kind!=='system') {
    const sender=safe.sender&&typeof safe.sender==='object'?safe.sender:{};
    safe.sender={uid:'unknown',name:'未知成员',color:'#8a8f99',online:false,ai:false,...sender};
  }
  if (safe.kind==='file') {
    const file=safe.file&&typeof safe.file==='object'?safe.file:{};
    const name=String(file.name||'未命名文件');
    const suffix=name.includes('.')?name.split('.').pop():'';
    safe.file={...file,name,size:Number(file.size)||0,extension:String(file.extension||suffix||'file').toLowerCase()};
  }
  if (safe.kind==='threadcreated') {
    const thread=safe.thread&&typeof safe.thread==='object'?safe.thread:{};
    safe.thread={...thread,name:String(thread.name||'未命名子区'),replies:Number(thread.replies)||0,participants:Array.isArray(thread.participants)?thread.participants.filter(Boolean):[]};
  }
  return safe;
}
function evaTeamThreadSource(snapshot, identity, selected) {
  const records=snapshot.sessions.filter(record=>record.identityId===identity.id);
  // An unselected identity gets an empty draft topic, not another conversation's history.
  const visible=selected?records:[];
  return window.EvaAIPrivateConversations.source({identityId:identity.id,name:identity.name,
    appearance:evaIdentityAppearance(identity),records:visible,selectedId:selected?.id,
    messages:id=>(visible.find(record=>record.id===id)?.messages||[]).flatMap((message,index,all)=>{
      const day=new Date(message.time).toLocaleDateString('zh-CN',{month:'long',day:'numeric'});
      const divider=index===0||new Date(message.time).toDateString()!==new Date(all[index-1].time).toDateString();
      return [...(divider?[{kind:'divider',text:day}]:[]),{...message,
        sender:message.sender.uid==='self'?SENDERS['u-wangyilin']:{...message.sender,name:identity.name,identityAppearance:evaIdentityAppearance(identity)},
        time:new Date(message.time).toLocaleTimeString('zh-CN',{hour:'2-digit',minute:'2-digit',hour12:false})}];
    })});
}

function evaConversationMessages(base) {
  const memberStore=evaMembers().store,actorId=memberStore.actorId();
  const storyBase={...base};for(const id of memberStore.demoStoryGroups())if(window.__EVA_TOPIC_STORY_DEMO?.groups[id])storyBase[id]=(base[id]||[]).filter(message=>message.kind!=='text'&&message.kind!=='divider');
  const result=memberStore.directMessages(actorId,storyBase);
  if(actorId!=='u-wangyilin'||!Array.isArray(result['dm-hejing']))return result;
  if(result['dm-hejing'].some(message=>message.id==='dm-hejing-file-v1'))return result;
  return {...result,'dm-hejing':[...result['dm-hejing'],{
    id:'dm-hejing-file-v1',kind:'file',time:'14:31',sender:SENDERS['u-hejing'],
    file:{id:'attachment:dm-hejing:permission-matrix-v1',name:'文件库权限矩阵.pdf',size:806912,extension:'pdf',version:1}
  }]};
}

function evaRevealMessage(messageId) {
  if(!messageId)return;
  let attempts=0;
  const reveal=()=>{
    const node=Array.from(document.querySelectorAll('[data-eva-message-id]')).find(item=>item.dataset.evaMessageId===messageId);
    if(!node){if(attempts++<10)setTimeout(reveal,100);return;}
    node.scrollIntoView({block:'center'});
    node.classList.add('eva-message-source-highlight');
    setTimeout(()=>node.classList.remove('eva-message-source-highlight'),2200);
  };
  requestAnimationFrame(reveal);
}

function evaConversationSearchTimestamp(value, now=Date.now()) {
  if(typeof value==='number'&&Number.isFinite(value))return value;
  const text=String(value||'').trim();
  if(!text)return NaN;
  if(/^\d{1,2}:\d{2}(?::\d{2})?$/.test(text)){
    const [hour,minute,second='0']=text.split(':').map(Number);
    const date=new Date(now);
    date.setHours(hour,minute,second,0);
    return date.getTime();
  }
  const parsed=Date.parse(text);
  return Number.isFinite(parsed)?parsed:NaN;
}

function evaConversationSearchRecord(message,index,now=Date.now()) {
  if(!message||typeof message!=='object'||message.kind==='divider'||message.kind==='system')return null;
  const sender=message.sender&&typeof message.sender==='object'?message.sender:{};
  const file=message.file&&typeof message.file==='object'?message.file:{};
  const extension=String(file.extension||file.name?.split('.').pop()||'').toLowerCase();
  const imageExtensions=new Set(['png','jpg','jpeg','gif','webp','bmp','svg','heic','avif']);
  const videoExtensions=new Set(['mp4','mov','avi','mkv','webm','m4v']);
  const isImage=message.kind==='image'||imageExtensions.has(extension);
  const isVideo=message.kind==='video'||videoExtensions.has(extension);
  const type=isImage||isVideo?'media':message.kind==='file'?'file':'message';
  const candidates=[message.text,message.caption,message.note,message.title,message.thread?.name,message.ref?.title,message.ref?.desc,file.name];
  const displayText=String(candidates.find(value=>typeof value==='string'&&value.trim())||({file:'未命名文件',media:'图片或视频',message:'聊天消息'}[type]));
  const senderName=String(sender.name||'未知成员');
  const senderKey=String(sender.uid||sender.identityId||sender.id||senderName);
  return {message,index,type,mediaKind:isVideo?'video':isImage?'image':null,fileExtension:extension,sender,senderKey,senderName,
    displayText,searchText:(senderName+' '+candidates.filter(value=>typeof value==='string').join(' ')).toLocaleLowerCase('zh-CN'),
    timestamp:evaConversationSearchTimestamp(message.createdAt||message.updated_at||message.date||message.time,now)};
}

function evaConversationSearchFileSize(value) {
  const bytes=Number(value);
  if(!Number.isFinite(bytes)||bytes<0)return '';
  const units=['B','KB','MB','GB'];
  let amount=bytes,unit=0;
  while(amount>=1024&&unit<units.length-1){amount/=1024;unit+=1;}
  const digits=unit>0&&amount<100&&!Number.isInteger(amount)?1:0;
  return amount.toFixed(digits)+' '+units[unit];
}

function evaConversationSearchFileDate(timestamp) {
  if(!Number.isFinite(timestamp))return '';
  const date=new Date(timestamp);
  if(Number.isNaN(date.getTime()))return '';
  return String(date.getMonth()+1).padStart(2,'0')+'/'+String(date.getDate()).padStart(2,'0');
}

function evaSearchConversationMessages(messages,filters={}) {
  const now=Number.isFinite(filters.now)?filters.now:Date.now();
  const keyword=String(filters.keyword||'').trim().toLocaleLowerCase('zh-CN');
  const tab=filters.tab||'all',senders=new Set(filters.senders||[]),timeRange=filters.timeRange||'all';
  const today=new Date(now);today.setHours(0,0,0,0);const tomorrow=today.getTime()+86400000;
  const cutoff=timeRange==='today'?today.getTime():timeRange==='7d'?now-7*86400000:timeRange==='30d'?now-30*86400000:null;
  return (Array.isArray(messages)?messages:[]).map((message,index)=>evaConversationSearchRecord(message,index,now)).filter(Boolean).filter(record=>{
    if(tab!=='all'&&record.type!==tab)return false;
    if(keyword&&!record.searchText.includes(keyword))return false;
    if(senders.size&&!senders.has(record.senderKey))return false;
    if(cutoff!==null&&(!Number.isFinite(record.timestamp)||record.timestamp<cutoff||record.timestamp>=tomorrow))return false;
    return true;
  }).sort((left,right)=>{
    const leftTime=Number.isFinite(left.timestamp)?left.timestamp:0,rightTime=Number.isFinite(right.timestamp)?right.timestamp:0;
    const delta=leftTime-rightTime||left.index-right.index;
    return filters.sort==='oldest'?delta:-delta;
  });
}

function evaRevealConversationMessage(stream,index) {
  const node=stream?.children?.[index];
  if(!node)return;
  const reduced=!!window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
  // 高亮落在气泡本体而非整行：整行是 932px 通栏，短消息气泡仅 285×24，
  // 行级高亮的着色面积可达内容的十几倍，还会连带刷到头像/昵称/时间戳。
  // 取不到气泡（系统消息等无 body 结构）时回退整行，保证反馈不丢失。
  const target=node.querySelector(':scope > .wk-msg-row-content > .wk-msg-row-body')||node;
  const flash=()=>{
    target.classList.add('eva-conversation-search-hit');
    setTimeout(()=>target.classList.remove('eva-conversation-search-hit'),1800);
  };
  node.scrollIntoView({block:'center',behavior:reduced?'auto':'smooth'});
  if(reduced||!stream){flash();return;}
  // 平滑滚动要几百毫秒，期间起闪会被滚动本身吃掉——用户往往只看到最后一次。
  // 等滚动停稳（连续 3 帧 scrollTop 不变）再起闪；目标已在视区内时首帧即停稳，
  // 不引入额外延迟。帧数上限兜底，避免外部持续滚动时永不触发。
  let last=null,still=0,frames=0;
  const waitScrollEnd=()=>{
    const now=stream.scrollTop;
    if(now===last){if(++still>=3){flash();return;}}else{still=0;last=now;}
    if(++frames>90){flash();return;}
    requestAnimationFrame(waitScrollEnd);
  };
  requestAnimationFrame(waitScrollEnd);
}

function EvaConversationSearch({conversationId,conversationName,messages,onClose,onLocate,onPreview,onDownload}) {
  const h=React.createElement,inputRef=reactExports.useRef(null),composing=reactExports.useRef(false),fileMenuRefs=reactExports.useRef(new Map());
  const [draft,setDraft]=reactExports.useState(''),[keyword,setKeyword]=reactExports.useState(''),[tab,setTab]=reactExports.useState('all');
  const [senders,setSenders]=reactExports.useState([]),[sort,setSort]=reactExports.useState('newest'),[timeRange,setTimeRange]=reactExports.useState('all');
  const [filtersOpen,setFiltersOpen]=reactExports.useState(false),[limit,setLimit]=reactExports.useState(20),[activeIndex,setActiveIndex]=reactExports.useState(null);
  const normalizedMessages=reactExports.useMemo(()=>(messages||[]).map(evaRenderableMessage),[messages]);
  const allRecords=reactExports.useMemo(()=>normalizedMessages.map((message,index)=>evaConversationSearchRecord(message,index)).filter(Boolean),[normalizedMessages]);
  const senderOptions=reactExports.useMemo(()=>Array.from(new Map(allRecords.map(record=>[record.senderKey,{key:record.senderKey,name:record.senderName,sender:record.sender}])).values()),[allRecords]);
  reactExports.useEffect(()=>{inputRef.current?.focus();},[conversationId]);
  reactExports.useEffect(()=>{if(composing.current)return;const timer=setTimeout(()=>setKeyword(draft.trim()),240);return()=>clearTimeout(timer);},[draft]);
  reactExports.useEffect(()=>{setLimit(20);setActiveIndex(null);},[keyword,tab,senders.join('|'),sort,timeRange]);
  reactExports.useEffect(()=>{const escape=event=>{if(event.key!=='Escape')return;if(filtersOpen){event.stopPropagation();setFiltersOpen(false);return;}onClose();requestAnimationFrame(()=>document.querySelector('.eva-chat-search-entry')?.focus());};document.addEventListener('keydown',escape);return()=>document.removeEventListener('keydown',escape);},[filtersOpen,onClose]);
  const results=reactExports.useMemo(()=>evaSearchConversationMessages(normalizedMessages,{keyword,tab,senders,sort,timeRange}),[normalizedMessages,keyword,tab,senders,sort,timeRange]);
  const filterCount=(senders.length?1:0)+(sort!=='newest'?1:0)+(timeRange!=='all'?1:0);
  const shouldSearch=!!keyword||tab==='media'||tab==='file'||filterCount>0;
  const pending=!composing.current&&draft.trim()!==keyword;
  const close=()=>{onClose();requestAnimationFrame(()=>document.querySelector('.eva-chat-search-entry')?.focus());};
  const resetFilters=()=>{setSenders([]);setSort('newest');setTimeRange('all');};
  const toggleSender=key=>setSenders(value=>value.includes(key)?value.filter(item=>item!==key):[...value,key]);
  const highlight=text=>{const value=String(text||'').replace(/\s+/g,' ').replace(/[#*_>`~\[\]]/g,' ').trim(),needle=keyword.trim();if(!needle)return value;
    const lower=value.toLocaleLowerCase('zh-CN'),target=needle.toLocaleLowerCase('zh-CN'),parts=[];let start=0,match;
    while((match=lower.indexOf(target,start))>=0){if(match>start)parts.push(value.slice(start,match));parts.push(h('mark',{key:'m'+match},value.slice(match,match+needle.length)));start=match+needle.length;}
    if(start<value.length)parts.push(value.slice(start));return parts;};
  const locate=record=>{setActiveIndex(record.index);requestAnimationFrame(()=>onLocate(record.index));};
  const restoreFileMenuFocus=record=>requestAnimationFrame(()=>fileMenuRefs.current.get(record.index)?.focus());
  const resultButton=(record,children,label)=>h('button',{type:'button',className:'eva-conversation-search__result'+(record.type==='file'?' is-file':'')+(activeIndex===record.index?' is-active':''),'aria-label':label||'定位到 '+record.senderName+' 的消息',onClick:()=>locate(record)},...children);
  const fileResult=record=>{const size=evaConversationSearchFileSize(record.message.file?.size),date=evaConversationSearchFileDate(record.timestamp);
    const file=record.message.file,rowClass='eva-conversation-search__result is-file'+(activeIndex===record.index?' is-active':'');
    return h('div',{className:rowClass},
      h('button',{type:'button',className:'eva-conversation-search__file-open','aria-label':'预览文件 '+record.displayText,onClick:()=>onPreview?.(file)},
        h('span',{className:'eva-conversation-search__file-icon','aria-hidden':true},h(FileTypeIcon,{extension:record.fileExtension,name:record.displayText})),
        h('span',{className:'eva-conversation-search__result-main'},h('span',{className:'eva-conversation-search__file-title'},highlight(record.displayText)),h('span',{className:'eva-conversation-search__file-meta'},h('span',{className:'eva-conversation-search__file-sender'},record.senderName),record.sender.ai&&h(AiBadge,{size:'small'}),size&&h(React.Fragment,null,h('span',{className:'eva-conversation-search__file-separator','aria-hidden':true},'·'),h('span',null,size)),date&&h(React.Fragment,null,h('span',{className:'eva-conversation-search__file-separator','aria-hidden':true},'·'),h('time',{dateTime:new Date(record.timestamp).toISOString()},date))))),
      h(Dropdown,{trigger:'click',position:'bottomRight',clickToHide:true,render:h(Dropdown.Menu,{className:'eva-conversation-search__file-dropdown'},h(Dropdown.Item,{icon:h(MessageSquare,{size:18,'aria-hidden':true}),onClick:()=>{locate(record);restoreFileMenuFocus(record);}},'定位到聊天位置'),h(Dropdown.Item,{icon:h(Download$5,{size:18,'aria-hidden':true}),onClick:()=>{onDownload?.(file);restoreFileMenuFocus(record);}},'下载文件'))},
        h('span',{className:'eva-conversation-search__file-menu-anchor',onClick:event=>event.stopPropagation()},h('button',{ref:node=>{node?fileMenuRefs.current.set(record.index,node):fileMenuRefs.current.delete(record.index);},type:'button',className:'eva-conversation-search__file-menu','aria-label':'文件操作 '+record.displayText,'aria-haspopup':'menu'},h(Ellipsis,{size:20,'aria-hidden':true})))));};
  const tabs=[['all','全部'],['message','消息'],['media','图片/视频'],['file','文件']];
  const visibleResults=shouldSearch?results.slice(0,limit):[];
  return h('aside',{id:'eva-conversation-search-panel',className:'ch-right-panel ch-right-panel--search ch-right-panel--overlay','aria-label':'查找 '+(conversationName||'当前对话')+' 的聊天内容'},
    h('header',{className:'eva-chat-settings-head eva-conversation-search__head'},
      h('h3',null,'查找聊天内容'),
      h('button',{type:'button',className:'eva-conversation-search__close','aria-label':'关闭查找',onClick:close},h(X,{size:20,'aria-hidden':true}))),
    h('div',{className:'eva-conversation-search__query'},
      h('label',{className:'eva-conversation-search__input'},h(Search$1,{size:16,'aria-hidden':true}),h('input',{ref:inputRef,type:'search',value:draft,placeholder:'输入关键字搜索','aria-label':'输入关键字搜索',onChange:event=>setDraft(event.target.value),onCompositionStart:()=>{composing.current=true;},onCompositionEnd:event=>{composing.current=false;setDraft(event.currentTarget.value);setKeyword(event.currentTarget.value.trim());}}),draft&&h('button',{type:'button','aria-label':'清空搜索关键字',onClick:()=>{setDraft('');setKeyword('');inputRef.current?.focus();}},h(X,{size:16,'aria-hidden':true})))),
    h('div',{className:'eva-conversation-search__toolbar'},
      h('div',{className:'eva-conversation-search__tabs',role:'tablist','aria-label':'消息类型'},tabs.map(([key,label])=>h('button',{key,type:'button',role:'tab','aria-selected':tab===key,className:tab===key?'is-active':'',onClick:()=>setTab(key)},label))),
      h('button',{type:'button',className:'eva-conversation-search__filter'+(filtersOpen?' is-open':'')+(filterCount?' has-value':''),'aria-expanded':filtersOpen,'aria-controls':'eva-conversation-search-filters',onClick:()=>setFiltersOpen(value=>!value)},'筛选',filterCount?h('span',{className:'eva-conversation-search__filter-count','aria-label':filterCount+' 项筛选'},filterCount):h(ChevronDown,{size:15,'aria-hidden':true}))),
    filtersOpen&&h('section',{id:'eva-conversation-search-filters',className:'eva-conversation-search__filters','aria-label':'筛选聊天记录'},
      h('div',{className:'eva-conversation-search__filters-head'},h('strong',null,'筛选'),h('button',{type:'button',disabled:filterCount===0,onClick:resetFilters},'重置')),
      h('fieldset',null,h('legend',null,'发送人'),h('div',{className:'eva-conversation-search__sender-options'},senderOptions.map(option=>h('label',{key:option.key,className:senders.includes(option.key)?'is-selected':''},h('input',{type:'checkbox',checked:senders.includes(option.key),onChange:()=>toggleSender(option.key)}),option.sender.identityAppearance?h(EvaAIIdentityAvatar,{appearance:option.sender.identityAppearance,size:24}):h('img',{src:window.EvaAvatar.personUri(option.sender.uid||option.key),alt:''}),h('span',null,option.name),option.sender.ai&&h(AiBadge,{size:'small'}))),!senderOptions.length&&h('span',{className:'eva-conversation-search__no-sender'},'当前对话暂无发送人'))),
      h('fieldset',null,h('legend',null,'时间顺序'),h('div',{className:'eva-conversation-search__choice-row'},[['newest','最新优先'],['oldest','最早优先']].map(([value,label])=>h('button',{key:value,type:'button','aria-pressed':sort===value,className:sort===value?'is-selected':'',onClick:()=>setSort(value)},label)))),
      h('fieldset',null,h('legend',null,'发送时间'),h('div',{className:'eva-conversation-search__choice-row'},[['all','全部时间'],['today','今天'],['7d','最近 7 天'],['30d','最近 30 天']].map(([value,label])=>h('button',{key:value,type:'button','aria-pressed':timeRange===value,className:timeRange===value?'is-selected':'',onClick:()=>setTimeRange(value)},label)))),
      h('button',{type:'button',className:'eva-conversation-search__filters-done',onClick:()=>setFiltersOpen(false)},'完成')),
    h('div',{className:'eva-conversation-search__body','aria-busy':pending},
      pending&&h('div',{className:'eva-conversation-search__loading',role:'status'},h('span',{className:'eva-conversation-search__spinner','aria-hidden':true}),'正在查找…'),
      !pending&&!shouldSearch&&h('div',{className:'eva-conversation-search__empty'},h('span',{className:'eva-conversation-search__empty-icon','aria-hidden':true},h(Search$1,{size:34})),h('p',null,'输入关键字或使用筛选查找消息记录')),
      !pending&&shouldSearch&&results.length===0&&h('div',{className:'eva-conversation-search__empty'},h('span',{className:'eva-conversation-search__empty-icon','aria-hidden':true},h(Search$1,{size:34})),h('p',null,'没有找到匹配的聊天记录'),h('button',{type:'button',onClick:()=>{setDraft('');setKeyword('');setTab('all');resetFilters();inputRef.current?.focus();}},'清除条件')),
      !pending&&visibleResults.length>0&&h(React.Fragment,null,h('div',{className:'eva-conversation-search__summary',role:'status'},'找到 '+results.length+' 条聊天记录'),h('ol',{className:'eva-conversation-search__results'},visibleResults.map(record=>h('li',{key:(record.message.id||record.message.fixtureId||record.index)+':'+record.index},record.type==='file'?fileResult(record):resultButton(record,[
        h('span',{className:'eva-conversation-search__avatar'},record.sender.identityAppearance?h(EvaAIIdentityAvatar,{appearance:record.sender.identityAppearance,size:32}):h('img',{src:window.EvaAvatar.personUri(record.sender.uid||record.senderKey),alt:''})),
        h('span',{className:'eva-conversation-search__result-main'},h('span',{className:'eva-conversation-search__result-meta'},h('span',{className:'eva-conversation-search__sender'},record.senderName),record.sender.ai&&h(AiBadge,{size:'small'}),h('time',null,record.message.time||'')),h('span',{className:'eva-conversation-search__snippet'},highlight(record.displayText)),h('span',{className:'eva-conversation-search__kind'},record.type==='media'?(record.mediaKind==='video'?'视频':'图片'):'消息')),h('span',{className:'eva-conversation-search__locate'},'定位')])))),results.length>limit&&h('button',{type:'button',className:'eva-conversation-search__more',onClick:()=>setLimit(value=>value+20)},'加载更多'))));
}

function EvaAIThreadRenameForm({request,onClose,onSave,getContainer}) {
 const h=React.createElement,{Form,Dialog,useSubmission,SubmissionError}=evaForms;
 const submission=useSubmission({onSubmit:values=>onSave(values.name.trim())});
 return h(Dialog,{visible:true,title:'重命名会话',selectInitialText:true,className:'eva-ai-team__modal',size:'compact',getPopupContainer:getContainer,onCancel:onClose,onOk:submission.submit,okText:'保存',cancelText:'取消',confirmLoading:submission.busy},
  h(Form,{...submission.formProps,initValues:{name:request.title}},h(Form.Input,{field:'name',noLabel:true,maxLength:50,'aria-label':'会话名称',autoFocus:true,rules:[{required:true,whitespace:true,message:'请输入会话名称'}]}),h(SubmissionError,{submission})));
}
function EvaAITeamGroupEditor({visible,record,membersOnly=false,candidates,onClose,onSubmit,getContainer}) {
  const h=React.createElement;
  return h(evaMembers().ui.MemberPicker,{
    visible,
    title:membersOnly?'编辑 AI 小队成员':record?'编辑 AI 小队':'新建 AI 小队',
    className:'eva-ai-team__modal eva-ai-team-editor',
    items:candidates,
    groups:[{kind:'persona',label:'云端分身'},{kind:'assistant',label:'个人助理'},{kind:'digital',label:'数字员工'}],
    initialSelectedIds:(record?.memberIds||[]).filter(id=>candidates.some(item=>item.id===id)),
    minimumSelection:1,
    memberLabel:'AI 小队成员',
    nameField:membersOnly?null:{id:'eva-ai-team-name',label:'AI 小队名称',initialValue:record?.name||'',required:true,maxLength:50},
    searchLabel:'搜索我的 Agent 成员',
    searchPlaceholder:'搜索我的 Agent 成员',
    emptyTitle:'暂无可用的 AI 成员',
    emptyDescription:'请先创建或接入 AI 成员',
    submit:record?'保存':'创建',
    getPopupContainer:getContainer,
    onCancel:onClose,
    onSubmit:(chosen,name)=>onSubmit({name,memberIds:chosen.map(item=>item.id)})
  });
}

function EvaOverlayListScroll({enabled,children,className}) {
 const h=React.createElement,scroll=reactExports.useRef(null),content=reactExports.useRef(null),drag=reactExports.useRef(null),id=reactExports.useId(),[bar,setBar]=reactExports.useState({height:0,top:0,max:0,value:0,viewport:0}),timer=reactExports.useRef(null),[visible,setVisible]=reactExports.useState(true);
 const reveal=()=>{setVisible(true);clearTimeout(timer.current);timer.current=setTimeout(()=>{if(!drag.current)setVisible(false);},1200);};
 reactExports.useLayoutEffect(()=>{if(!enabled)return;const node=scroll.current;
  const measure=()=>{const viewport=node.clientHeight,max=Math.max(0,node.scrollHeight-viewport),height=max?Math.max(24,viewport*viewport/node.scrollHeight):0,top=max?node.scrollTop/max*(viewport-height):0;setBar({height,top,max,value:node.scrollTop,viewport});};
  const onScroll=()=>{measure();reveal();};
  measure();reveal();node.addEventListener('scroll',onScroll,{passive:true});const observer=new ResizeObserver(measure);observer.observe(node);observer.observe(content.current);return()=>{node.removeEventListener('scroll',onScroll);observer.disconnect();clearTimeout(timer.current);};
 },[enabled]);
 if(!enabled)return h('div',{className},children);
 const move=e=>{if(!drag.current)return;const range=bar.viewport-bar.height;scroll.current.scrollTop=drag.current.value+(e.clientY-drag.current.y)*bar.max/Math.max(1,range);};
 return h('div',{className:'eva-list-scroll-overlay',onPointerEnter:reveal,onPointerMove:reveal},h('div',{className:className+' eva-list-scroll-native',ref:scroll,id},h('div',{className:'eva-list-scroll-content',ref:content},children)),bar.max>0&&h('div',{className:'eva-list-scroll-track'+(visible?' is-visible':''),'aria-hidden':true},h('div',{className:'eva-list-scroll-thumb',style:{height:bar.height,transform:'translateY('+bar.top+'px)'},onPointerDown:e=>{e.preventDefault();reveal();clearTimeout(timer.current);drag.current={y:e.clientY,value:scroll.current.scrollTop};e.currentTarget.setPointerCapture(e.pointerId);},onPointerMove:move,onPointerUp:()=>{drag.current=null;reveal();},onPointerCancel:()=>{drag.current=null;reveal();}})));
}

// Semi owns tab presentation, keyboard interaction and overflow; ChannelsView owns selection.
function EvaTopicCreateDialog({visible,group,store,actorId,onSubmit,onCancel,onOpen}) {
 const h=React.createElement,{Form,useSubmission,SubmissionError}=evaForms,[api,state,values]=Form.useForm();
 const submission=useSubmission({active:visible,resetKey:group.id,onSubmit:data=>onSubmit(store.validateThreadName(group.id,data.name||''))});
 reactExports.useEffect(()=>{if(visible)api.setValues({name:''},{isOverride:true});},[visible,group.id]);
 const name=values.name||'',duplicate=name.trim()?store.threadNameConflict(group.id,name):null;
 return h(evaForms.Dialog,{visible,title:'新建子区',className:'eva-members-modal eva-topic-create eva-thread-create-dialog',width:420,onCancel,maskClosable:true,footer:h(evaForms.Actions,{onCancel,submitLabel:'创建并进入',form:submission.formProps.id,busy:submission.busy})},
  h(Form,{...submission.formProps,form:api},
   h('p',{id:'eva-topic-create-description',className:'eva-topic-create__hint'},'本群所有成员均可查看和参与'),
   h(Form.Input,{field:'name',pure:true,id:'eva-topic-create-name','aria-label':'子区名称','aria-describedby':'eva-topic-create-description',maxLength:30,placeholder:'例如：交付进度、问题反馈',validator:value=>{try{store.validateThreadName(group.id,value||'');return '';}catch(e){return e.message;}}}),
   h(Form.ErrorMessage,{error:state.errors?.name,errorMessageId:'eva-topic-create-name-errormessage'}),
   duplicate&&h('div',{className:'eva-topic-create__duplicate'},h('span',null,duplicate.status===2?'本群已有同名的已归档子区':'本群已有同名子区'),h(Button,{htmlType:'button',theme:'borderless',onClick:()=>{onCancel();onOpen(duplicate.id);}},duplicate.status===2?'查看已归档子区':'打开已有子区')),
   h(SubmissionError,{submission})));
}
function evaPinMenuItem(store,actorId,id) {
 const pinned=!!store.chatPreferences(id,actorId).top;
 return {title:pinned?'取消置顶':'置顶会话',icon:evaRailIcon(pinned?'PinOff':'Pin'),onClick:()=>store.setChatPreferences(id,actorId,{top:!pinned})};
}
function evaMuteMenuItem(store,actorId,id) {
 const muted=store.conversationMuted(id,actorId);
 return {title:muted?'取消免打扰':'设为免打扰',icon:evaRailIcon(muted?'BellOff':'Bell'),onClick:()=>store.setChatPreferences(id,actorId,{mute:!muted})};
}
function evaTopicMenus({store,actorId,group,thread,onRename,onArchive}) {
 const id=thread?.id||group.id;
 const items=[...(thread?[evaPinMenuItem(store,actorId,id)]:[]),evaMuteMenuItem(store,actorId,id),
  {title:thread?'复制子区链接':'复制聊天链接',icon:React.createElement(Link2,{size:16,className:'ctx-icon','aria-hidden':true}),onClick:async()=>{try{const url=new window.URL(window.location.href);url.hash='/messages?evaDM='+encodeURIComponent(group.id)+(thread?'&evaThread='+encodeURIComponent(thread.id):'');await window.navigator.clipboard.writeText(url.href);Toast.success('链接已复制');}catch{Toast.error('复制失败，请重试');}}}];
 if(thread&&store.canManageThread(thread.id,actorId))items.push({separator:true},{title:'重命名',icon:evaRailIcon('Pencil'),onClick:()=>onRename(thread)},{title:thread.status===2?'恢复子区':'归档子区',icon:React.createElement(thread.status===2?ArchiveRestore:Archive,{size:16,className:'ctx-icon','aria-hidden':true}),onClick:()=>onArchive(thread)});
 return items;
}

function evaRecentUnread(store,actorId,record) {
 return Math.max(store.conversationUnread(record.id,actorId,record.unread||0),Number(window.__EVA_RECENT_UNREAD_DEMO?.[record.id])||0);
}
function EvaRecentTopicNavigation({threads:listedThreads,group,store,actorId,activeId,onMain,onTopic,onCreate,onMenu}) {
 const h=React.createElement,selected=group.threads.find(thread=>thread.id===activeId),available=selected&&!listedThreads.some(thread=>thread.id===activeId)?[...listedThreads,selected]:listedThreads;
 const revision=store.getSnapshot();
 const order=reactExports.useMemo(()=>store.topicNavigation(group.id,actorId,group.threads).map(item=>item.id),[group,store,actorId,revision]);
 const threads=[...available].sort((a,b)=>order.indexOf(a.id)-order.indexOf(b.id));
 const MainIcon=reactExports.useMemo(()=>createLucideIcon('message-circle',[
  ['path',{d:'M7.9 20A9 9 0 1 0 4 16.1L2 22Z',key:'vv11sd'}]
 ]),[]);
 const scrollRef=reactExports.useRef(null),rootRef=reactExports.useRef(null),previous=reactExports.useRef(activeId);
 const [indicator,setIndicator]=reactExports.useState(null);
 const topicKey=threads.map(t=>t.id+':'+t.name+':'+t.status+':'+!!store.chatPreferences(t.id,actorId).top).join('|');
 reactExports.useLayoutEffect(()=>{
  const root=rootRef.current,scroll=scrollRef.current;if(!root||!scroll)return;
  const changed=previous.current!==activeId;previous.current=activeId;
  const measure=()=>{
   const tabs=[...scroll.querySelectorAll('[role=tab]')],main=tabs[0];if(!main)return;
   const viewport=scroll.getBoundingClientRect(),mainRect=main.getBoundingClientRect(),r=root.getBoundingClientRect();
   const selected=tabs.find(tab=>tab.getAttribute('aria-selected')==='true');
   if(selected){const t=selected.getBoundingClientRect(),left=selected===main?t.left:Math.max(t.left,mainRect.right),right=Math.min(t.right,viewport.right);setIndicator({left:left-r.left,width:Math.max(0,right-left),top:t.bottom-r.top-2});}
  };
  const center=(smooth)=>{
   const selected=scroll.querySelector('[role=tab][aria-selected=true]'),main=scroll.querySelector('[role=tab]');
   if(selected&&selected!==main){
    const viewport=scroll.getBoundingClientRect(),t=selected.getBoundingClientRect(),mainWidth=main.getBoundingClientRect().width;
    const left=Math.max(0,Math.min(scroll.scrollWidth-scroll.clientWidth,scroll.scrollLeft+t.left-viewport.left+t.width/2-(mainWidth+(scroll.clientWidth-mainWidth)/2)));
    scroll.scrollTo({left,behavior:smooth&&!window.matchMedia('(prefers-reduced-motion: reduce)').matches?'smooth':'auto'});
   }
   measure();
  };
  const frame=requestAnimationFrame(()=>center(changed));
  scroll.addEventListener('scroll',measure,{passive:true});
  let first=true;const observer=new ResizeObserver(()=>{if(first){first=false;measure();}else center(false);});observer.observe(scroll);
  if(changed&&!window.matchMedia('(prefers-reduced-motion: reduce)').matches){const stream=root.parentElement.querySelector('.ch-stream');if(stream){stream.getAnimations().forEach(animation=>animation.cancel());stream.animate([{opacity:.65},{opacity:1}],{duration:120,easing:'ease-out'});}}
  return()=>{cancelAnimationFrame(frame);observer.disconnect();scroll.removeEventListener('scroll',measure);};
 },[activeId,topicKey]);
 const reminders=reactExports.useMemo(()=>new Map([group,...group.threads].map(record=>[record.id,{count:evaRecentUnread(store,actorId,record),muted:store.conversationMuted(record.id,actorId)}])),[store,actorId,group,revision]);
 const mainKey='__eva_main_chat__';
 const label=(record,name,main=false)=>{
  const {count,muted}=reminders.get(record.id);
  return h('span',{'data-eva-topic-id':main?'':record.id,className:'eva-recent-topic-tabs__label'+(main?' eva-recent-topic-tabs__main-label':'')+(muted?' is-muted':'')},
   h('span',{className:'eva-recent-topic-tabs__name'},name),!main&&count===0&&store.chatPreferences(record.id,actorId).top&&h('span',{className:'eva-topic-pin','aria-label':'已置顶'},evaRailIcon('Pin')),count>0&&h('span',{className:'eva-recent-topic-tabs__unread'+(muted?' is-muted':''),'aria-label':count+' 条未读消息'},count>99?'99+':count),
   main&&h('span',{className:'eva-recent-topic-tabs__divider','aria-hidden':true}));
 };
 const allTabs=[{itemKey:mainKey,icon:h(MainIcon,{size:16,'aria-hidden':true}),tab:label(group,'主聊天',true)},
  ...threads.map(thread=>({itemKey:String(thread.id),icon:h(ThreadIcon,{size:16,'aria-hidden':true}),tab:label(thread,thread.name+(thread.status===2?'（已归档）':''))}))];
 return h('nav',{ref:rootRef,className:'eva-recent-topic-tabs','aria-label':'群聊子区',onContextMenu:event=>{const node=event.target.closest('[role=tab]')?.querySelector('[data-eva-topic-id]');if(node)onMenu(event,threads.find(t=>t.id===node.dataset.evaTopicId));},onKeyDown:event=>{if(event.key==='ContextMenu'||(event.shiftKey&&event.key==='F10')){const node=event.target.closest('[role=tab]')?.querySelector('[data-eva-topic-id]');if(node)onMenu(event,threads.find(t=>t.id===node.dataset.evaTopicId));}}},
  h('div',{ref:scrollRef,className:'eva-topic-scroll'},h(Tabs,{type:'line',size:'medium',activeKey:activeId?String(activeId):mainKey,tabList:allTabs,collapsible:false,tabPaneMotion:false,preventScroll:true,onChange:key=>key===mainKey?onMain():onTopic(threads.find(thread=>String(thread.id)===key).id)})),
  h('div',{className:'eva-recent-topic-actions'},h(Button,{theme:'borderless',type:'tertiary',className:'eva-recent-topic-tabs__create',icon:h(Plus$c,{size:16}),'aria-label':'新建子区',onClick:onCreate})),
  indicator&&h('span',{className:'eva-recent-topic-tabs__indicator','aria-hidden':true,style:{width:indicator.width,top:indicator.top,transform:'translateX('+indicator.left+'px)'}})
 );
}

function EvaThreadList({group,active,archived,hidden,store,actorId,onOpen,onCreate,onClose,onRename,onArchive,compact=false,selectedId,pickerOpen=true}) {
 const h=React.createElement,[query,setQuery]=reactExports.useState(''),[tab,setTab]=reactExports.useState('active');
 reactExports.useEffect(()=>{if(compact&&!pickerOpen){setQuery('');setTab('active');}},[compact,pickerOpen]);
 const revision=store.getSnapshot(),order=reactExports.useMemo(()=>compact?store.topicNavigation(group.id,actorId,group.threads).map(item=>item.id):[],[compact,group,store,actorId,revision]);
 const tabs=[['active','活跃中',active],['hidden','已隐藏',hidden],['archived','已归档',archived]],items=tabs.find(item=>item[0]===tab)[2].filter(t=>t.name.toLocaleLowerCase().includes(query.trim().toLocaleLowerCase())).sort((a,b)=>compact?order.indexOf(a.id)-order.indexOf(b.id):Number(!!store.chatPreferences(b.id,actorId).top)-Number(!!store.chatPreferences(a.id,actorId).top));
 return h('section',{className:'eva-thread-list'+(compact?' eva-thread-list--compact':''),'aria-label':'子区列表',onKeyDown:event=>{if(compact&&event.key==='Escape'){event.stopPropagation();onClose();}}},
  h('header',{className:'eva-chat-settings-head'},h('h3',null,compact?'全部子区':'子区'),h('button',{type:'button','aria-label':'关闭子区列表',onClick:onClose},h(X,{size:20}))),
  h('div',{className:'eva-thread-list-body'},
   compact?h(ForwardInput,{value:query,onChange:setQuery,showClear:true,prefix:h(Search$1,{size:16}),'aria-label':'搜索子区',placeholder:'搜索子区名称',autoFocus:true}):h(Button,{className:'wk-thread-panel-create-btn',icon:h(Plus$c,{size:16}),onClick:onCreate},'新建子区'),
   h('div',{className:'eva-thread-list-tabs',role:'tablist','aria-label':'子区状态'},tabs.map(([id,label,list])=>h('button',{key:id,type:'button',role:'tab','aria-selected':tab===id,'aria-controls':'eva-thread-tab-panel',id:'eva-thread-tab-'+id,onClick:()=>setTab(id)},label,h('span',null,list.length)))),
   h('div',{id:'eva-thread-tab-panel',role:'tabpanel','aria-labelledby':'eva-thread-tab-'+tab,className:'eva-thread-list-cards'},items.length?items.map(thread=>{
    const prefs=store.chatPreferences(thread.id,actorId);
    return h('article',{key:thread.id,className:'eva-thread-list-card'+(compact&&store.conversationMuted(thread.id,actorId)?' is-muted':'')},
     h('div',{className:'eva-thread-list-card-head'},h('button',{type:'button',className:'eva-thread-list-open',onClick:()=>onOpen(thread.id)},prefs.top&&h('span',{className:'eva-topic-pin','aria-label':'已置顶'},evaRailIcon('Pin')),compact&&selectedId===thread.id&&h(Check,{size:16,'aria-label':'当前子区'}),h('strong',null,thread.name),compact&&evaRecentUnread(store,actorId,thread)>0&&h('span',{className:'eva-recent-topic-tabs__unread'+(store.conversationMuted(thread.id,actorId)?' is-muted':'')},evaRecentUnread(store,actorId,thread)>99?'99+':evaRecentUnread(store,actorId,thread))),
      h(Dropdown,{trigger:'click',position:'bottomRight',clickToHide:true,render:h(Dropdown.Menu,null,
       ...evaTopicMenus({store,actorId,group,thread,onRename,onArchive}).map((item,index)=>item.separator?h(Dropdown.Divider,{key:'separator-'+index}):h(Dropdown.Item,{key:item.title,onClick:item.onClick,icon:item.icon},item.title)),
       h(Dropdown.Item,{onClick:()=>store.setChatPreferences(thread.id,actorId,{hidden:!prefs.hidden})},prefs.hidden?'恢复显示':'隐藏子区'))},h(Button,{theme:'borderless',size:'small',icon:h(Ellipsis,{size:16}),'aria-label':'子区操作 '+thread.name}))),
     !compact&&h('button',{type:'button',className:'eva-thread-list-summary',onClick:()=>onOpen(thread.id)},thread.last_message_content?(thread.last_message_sender_name?thread.last_message_sender_name+'：':'')+thread.last_message_content:'暂无消息'),
     !compact&&h('div',{className:'eva-thread-list-meta'},h('span',null,(thread.message_count||0)+' 条回复'),tab==='hidden'&&thread.status===2&&h('span',null,'已归档'),h('time',null,formatRelativeTime(thread.updated_at))),
     !compact&&tab==='hidden'&&h(Button,{theme:'borderless',size:'small',className:'eva-thread-list-restore',onClick:()=>store.setChatPreferences(thread.id,actorId,{hidden:false})},'恢复显示'));
   }):h('p',{className:'eva-thread-list-empty'},query?'未找到匹配的子区':tab==='active'?'暂无活跃子区':tab==='archived'?'暂无已归档子区':'暂无已隐藏子区'))));
}

function EvaAITeamPage() {
  const h = React.createElement, store = window.EvaAITeam, navigate=useNavigate();
  const snapshot = reactExports.useSyncExternalStore(store.subscribe, store.getSnapshot, store.getSnapshot);
  const digitalStore=window.EvaDigitalEmployeesStore;
  const groupStore=window.EvaMyAITeamGroup;
  reactExports.useSyncExternalStore(groupStore.subscribe,groupStore.getSnapshot,groupStore.getSnapshot);
  reactExports.useSyncExternalStore(digitalStore.subscribe,digitalStore.getSnapshot,digitalStore.getSnapshot);
  const digitalEmployees=digitalStore.teamIds().map(id=>digitalStore.get(id)).filter(Boolean);
  const {search:teamSearch}=useLocation(),teamParams=new URLSearchParams(teamSearch),requestedIdentityId=snapshot.identityAliases?.[teamParams.get('evaIdentity')]||teamParams.get('evaIdentity'),requestedSessionId=teamParams.get('evaSession'),requestedMessageId=teamParams.get('evaMessage');
  // 本地助理、云端分身和数字员工都是“我的 Agent”的独立对话入口；
  // 它们各自维护会话，不能借用另一个身份的当前会话。
  const teamIdentities = snapshot.identities.filter(i=>i.role==='assistant'||i.role==='persona'||i.role==='employee');
  const availableIdentities=[...teamIdentities,...digitalEmployees];
  const fixedMembers=[{id:'u-wangyilin',name:'王宜林',kind:'human'},
    ...teamIdentities.map(item=>({...item,kind:'ai-direct',identityAppearance:evaIdentityAppearance(item)})),
    ...digitalEmployees.map(item=>({...item,kind:'ai-direct',identityAppearance:digitalStore.appearance(item)}))];
  const teamGroups=groupStore.groups(),groupIds=new Set(teamGroups.map(group=>group.id));
  const teamThreadTime=item=>String(item.updated_at||item.updatedAt||item.created_at||item.createdAt||'');
  const threadPreferenceStore=evaMembers().store,threadPreferenceActor=threadPreferenceStore.actorId();
  reactExports.useSyncExternalStore(threadPreferenceStore.subscribe,threadPreferenceStore.getSnapshot);
  const orderedTeamThreads=items=>[...items].filter(item=>item.status!==2&&!threadPreferenceStore.chatPreferences(item.id,threadPreferenceActor).hidden).sort((a,b)=>Number(!!threadPreferenceStore.chatPreferences(b.id,threadPreferenceActor).top)-Number(!!threadPreferenceStore.chatPreferences(a.id,threadPreferenceActor).top)||teamThreadTime(b).localeCompare(teamThreadTime(a)));
  const unreadBadge=count=>count>0?h('span',{className:'eva-ai-team__session-unread','aria-label':count+' 条未读消息'},count>99?'99+':count):null;
  const unreadDot=label=>h('span',{className:'eva-ai-team__unread-dot',role:'status','aria-label':label});
  const requestedIdentity=groupIds.has(requestedIdentityId)?{id:requestedIdentityId}:availableIdentities.find(i=>i.id===requestedIdentityId);
  const sessionsFor=id=>groupIds.has(id)?orderedTeamThreads(groupStore.source(id,fixedMembers).channels[0].threads):snapshot.sessions.filter(session=>session.identityId===id).concat(digitalStore.sessions(id));
  const requestedSelection=id=>{const sessions=sessionsFor(id),explicit=requestedSessionId&&!groupIds.has(requestedSessionId)?sessions.find(session=>session.id===requestedSessionId):null;return{identityId:id,sessionId:explicit?.id||(requestedSessionId?null:sessions[0]?.id)}};
  const [selection, setSelection] = reactExports.useState(() => requestedSelection(requestedIdentity?.id||groupStore.id));
  const [rename,setRename]=reactExports.useState(null);
  const openRename=(identityId,record)=>setRename({identityId,id:record.id,title:record.title||record.name});
  const saveRename=name=>{if(groupIds.has(rename.identityId))groupStore.updateThread(rename.identityId,rename.id,{name});else (digitalEmployees.some(i=>i.id===rename.identityId)?digitalStore:store).renameThread(rename.identityId,rename.id,name);setRename(null);};
  const [collapsed,setCollapsed] = reactExports.useState(()=>Object.fromEntries([...teamGroups.map(group=>[group.id,!group.system]),...(requestedIdentity&&groupIds.has(requestedIdentity.id)?[[requestedIdentity.id,false]]:[])]));
  const [showAllTeamThreads,setShowAllTeamThreads]=reactExports.useState(()=>requestedIdentity&&groupIds.has(requestedIdentity.id)&&requestedSessionId?{[requestedIdentity.id]:true}:{});
  const [collapsedIdentitySessions,setCollapsedIdentitySessions]=reactExports.useState({});
  reactExports.useEffect(()=>{
    if(!requestedIdentity)return;
    const next=requestedSelection(requestedIdentity.id);
    setSelection(next);
    if(requestedSessionId&&!groupIds.has(requestedSessionId)&&!next.sessionId)setError('原会话已删除或当前不可访问');else setError('');
    if(groupIds.has(requestedIdentity.id)){
      setCollapsed(value=>({...value,[requestedIdentity.id]:false}));
      if(requestedSessionId)setShowAllTeamThreads(value=>({...value,[requestedIdentity.id]:true}));
    }else setCollapsedIdentitySessions(value=>({...value,[requestedIdentity.id]:false}));
  },[teamSearch,requestedIdentity?.id]);
  const [collapsedGroups,setCollapsedGroups]=reactExports.useState({assistant:false,persona:false,digital:false});
  const [groupEditor,setGroupEditor]=reactExports.useState(null);
  const [createMenuOpen,setCreateMenuOpen]=reactExports.useState(false);
  const [createTipDismissed,setCreateTipDismissed]=reactExports.useState(false);
  const [groupToDissolve,setGroupToDissolve]=reactExports.useState(null);
  const groupEditorOpener=reactExports.useRef(null);
  const rail = reactExports.useRef(null);
  const identityMenuRef=reactExports.useRef(null),identityMenuOpener=reactExports.useRef(null);
  const [identityMenus,setIdentityMenus]=reactExports.useState([]);
  const IdentityContextMenus=reactExports.useMemo(()=>reactExports.forwardRef(EvaSharedContextMenus),[]);
  const [error,setError] = reactExports.useState('');
  const host = reactExports.useRef(null);
  const identity = teamIdentities.find(i=>i.id===selection.identityId);
  const employee = digitalEmployees.find(i=>i.id===selection.identityId);
  const session = snapshot.sessions.find(s=>s.id===selection.sessionId&&s.identityId===identity?.id);
  const draftKey = session?.id || (identity ? 'draft:'+identity.id : '');
  const status = i => i.role==='assistant' ? (i.status==='offline'?'本地离线':'本地已连接') : ({synced:'已自动同步',syncing:'正在同步',waiting:'等待记忆同步',error:'同步失败'}[i.syncStatus]);
  const choose = (identityId,sessionId) => {window.__evaOpenAssistantEditor?.(null);if(groupIds.has(identityId))groupStore.markRead(identityId,sessionId||identityId);else if(sessionId){if(digitalEmployees.some(item=>item.id===identityId))digitalStore.markRead(identityId,sessionId);else store.markRead(sessionId);}setSelection({identityId,sessionId});setError('');};
  const rememberGroupActionOpener=()=>{groupEditorOpener.current=document.activeElement;};
  const openGroupMembersEditor=group=>{rememberGroupActionOpener();setGroupEditor({mode:'members',record:group});};
  const openGroupDissolve=group=>{rememberGroupActionOpener();setGroupToDissolve(group);};
  const newConversation = id => {setCollapsedIdentitySessions(value=>({...value,[id]:false}));choose(id,digitalEmployees.some(item=>item.id===id)?digitalStore.createThread(id):store.createThread(id));};
  const toggleIdentitySessions = id => setCollapsedIdentitySessions(value=>({...value,[id]:!value[id]}));
  const openAssistantConfig=(item,returnFocus)=>window.__evaOpenAssistantEditor?.({mode:'edit',role:'assistant',id:item.sourceAssistantId,returnFocus});
  const removeDigitalEmployee=item=>{digitalStore.removeFromTeam(item.id);if(employee?.id===item.id){const next=teamIdentities[0]||digitalEmployees.find(candidate=>candidate.id!==item.id);choose(next?.id,next&&snapshot.identities.some(candidate=>candidate.id===next.id)?snapshot.sessions.find(candidate=>candidate.identityId===next.id)?.id:digitalStore.sessions(next?.id)[0]?.id);}};
  const openIdentityMenu=(event,item,digital=false)=>{
    identityMenuOpener.current=event.target.closest?.('button')||event.currentTarget;
    const menus=[{title:'新建会话',icon:h(Plus$c,{size:16,strokeWidth:1.75,'aria-hidden':true}),onClick:()=>newConversation(item.id)}];
    if(item.role==='assistant')menus.push({title:'编辑配置',icon:h(Settings,{size:16,strokeWidth:1.75,'aria-hidden':true}),onClick:()=>openAssistantConfig(item,identityMenuOpener.current)});
    if(digital)menus.push({separator:true},{title:'从我的 Agent 移除',onClick:()=>removeDigitalEmployee(item)});
    setIdentityMenus(menus);identityMenuRef.current?.show(event);
  };
  const identityMenuKey=(event,item,digital=false)=>{if(event.key==='ContextMenu'||(event.shiftKey&&event.key==='F10'))openIdentityMenu(event,item,digital);};
  const employeeSessions=employee?digitalStore.sessions(employee.id):[];
  const employeeSession=employeeSessions.find(item=>item.id===selection.sessionId)||employeeSessions[0];
  reactExports.useEffect(()=>{if(employee?.id&&employeeSession?.id)digitalStore.markRead(employee.id,employeeSession.id);else if(session?.id)store.markRead(session.id);},[employee?.id,employeeSession?.id,session?.id]);

  const selectedGroup=teamGroups.find(group=>group.id===selection.identityId),groupSelected=!!selectedGroup;
  reactExports.useEffect(()=>{if(selectedGroup)groupStore.markRead(selectedGroup.id,selection.sessionId||selectedGroup.id);},[selectedGroup?.id,selection.sessionId]);
  const source = groupSelected?groupStore.source(selectedGroup.id,fixedMembers,selection.sessionId):employee?digitalStore.conversationSource(employee.id,employeeSession?.id):identity ? messageSource('my-ai', snapshot, identity, session) : null;
  if(source)source.openMessageId=requestedMessageId;
  if(groupSelected){
    if(!selectedGroup.system)source.fixedGroupActions={onEditMembers:()=>openGroupMembersEditor(selectedGroup),onRename:name=>groupStore.updateGroup(selectedGroup.id,{name}),onDissolve:()=>openGroupDissolve(selectedGroup)};
    source.onCreateThread=record=>{const id=groupStore.createThread(selectedGroup.id,record);setCollapsed(value=>({...value,[selectedGroup.id]:false}));return id;};
    source.onUpdateThread=(id,patch)=>{groupStore.updateThread(selectedGroup.id,id,patch);if(patch.deleted&&selection.sessionId===id)choose(selectedGroup.id,null);};
    source.onSelectThread=id=>choose(selectedGroup.id,id);
  }
  if(source&&!employee&&!groupSelected){
    source.initialDraft=snapshot.drafts[draftKey]||'';
    source.onDraftChange=text=>store.setDraft(draftKey,text);
    source.composerDisabled=identity.status==='offline';
    source.onSend=(text,channelId,reply)=>{try{const id=store.sendMessage(identity.id,session?.id||null,text,reply);store.markRead(id);setError('');if(!session)setSelection({identityId:identity.id,sessionId:id});return true;}catch(e){setError(e.message);return false;}};
  }
  if(source&&!groupSelected){
    const current=employee?employeeSession:session;
    const owner=employee?digitalStore:store,ownerId=employee?.id||identity?.id;
    source.conversationActions=current?{
      rename:name=>owner.renameThread(ownerId,current.id,name),
      pinned:!!current.pinned,
      togglePinned:value=>employee?owner.setSessionFlag(ownerId,current.id,'pinned',value):owner.setSessionFlag(current.id,'pinned',value)
    }:null;
  }
  function conversationMenu(identityId,record,employee=false){
    const owner=employee?digitalStore:store;
    return h(Dropdown,{trigger:'click',position:'bottomRight',clickToHide:true,getPopupContainer:()=>rail.current,
      render:h(Dropdown.Menu,null,
        h(Dropdown.Item,{onClick:()=>openRename(identityId,record)},'重命名'),
        h(Dropdown.Item,{onClick:()=>employee?owner.setSessionFlag(identityId,record.id,'pinned',!record.pinned):owner.setSessionFlag(record.id,'pinned',!record.pinned)},record.pinned?'取消置顶':'置顶'),
        h(Dropdown.Item,{onClick:()=>{if(employee)owner.deleteSession(identityId,record.id);else owner.deleteSession(record.id);if(selection.sessionId===record.id){const remaining=employee?owner.sessions(identityId):owner.getSnapshot().sessions.filter(s=>s.identityId===identityId).sort((a,b)=>Number(!!b.pinned)-Number(!!a.pinned)||b.updatedAt.localeCompare(a.updatedAt));choose(identityId,remaining[0]?.id||null);}}},'删除'))},
      h('span',{className:'eva-ai-team__menu-anchor'},h(Button,{theme:'borderless',type:'tertiary',size:'small',icon:h(EllipsisIcon),'aria-label':'会话操作 '+record.title,'data-eva-tooltip':'会话操作'})));
  }
  function teamThreadMenu(group,record){
    return h(Dropdown,{trigger:'click',position:'bottomRight',clickToHide:true,getPopupContainer:()=>rail.current,
      render:h(Dropdown.Menu,null,
        h(Dropdown.Item,{onClick:()=>openRename(group.id,record)},'重命名'),
        h(Dropdown.Item,{onClick:()=>threadPreferenceStore.setChatPreferences(record.id,threadPreferenceActor,{top:!threadPreferenceStore.chatPreferences(record.id,threadPreferenceActor).top})},threadPreferenceStore.chatPreferences(record.id,threadPreferenceActor).top?'取消置顶':'置顶子区'),
        h(Dropdown.Item,{onClick:()=>threadPreferenceStore.setChatPreferences(record.id,threadPreferenceActor,{hidden:!threadPreferenceStore.chatPreferences(record.id,threadPreferenceActor).hidden})},threadPreferenceStore.chatPreferences(record.id,threadPreferenceActor).hidden?'恢复显示':'隐藏子区'),
        h(Dropdown.Item,{onClick:()=>groupStore.updateThread(group.id,record.id,{status:record.status===2?1:2})},record.status===2?'取消归档':'归档子区'))},
      h('span',{className:'eva-ai-team__menu-anchor'},h(Button,{theme:'borderless',type:'tertiary',size:'small',icon:h(EllipsisIcon),'aria-label':'会话操作 '+record.name,'data-eva-tooltip':'会话操作'})));
  }
  // 中栏原生列表与搜索结果共用同一套行组件：身份行 / 小队行 / 会话行 / 子区行。
  // 入口差异只通过数据和配置（名称节点、选中态、激活回调、右侧操作）传入，
  // 不为搜索结果复制第二份行 DOM；行为差异（折叠 vs 进入）由 buttonProps 承载。
  const aiTeamIdentityHeading=options=>h('div',{className:'eva-ai-team__identity-heading'+(options.active?' is-search-active':'')+(options.className?' '+options.className:''),onContextMenu:options.onContextMenu},
    h('button',{type:'button',className:'eva-ai-team__identity-button',...options.buttonProps},
      options.avatar,
      h('span',{className:'eva-identity-name-row'},h('span',{className:'eva-ai-team__identity-name eva-identity-name-text','data-eva-tooltip':options.name,'data-eva-tooltip-clamp':'true'},options.nameNode!==undefined?options.nameNode:options.name),h(AiBadge,{size:'small'}),options.hasUnread&&unreadDot(options.name+'有未读消息'))),
    options.trailing);
  const aiTeamTeamHeading=options=>h('div',{className:'eva-ai-team__team-heading'+(options.selected?' is-selected':'')+(options.active?' is-search-active':'')},
    h('button',{type:'button',className:'eva-ai-team__team-button',...options.buttonProps},
      h('img',{className:'eva-ai-team__team-avatar',src:window.EvaAvatar.uri({kind:'group',id:options.id}),alt:'',draggable:false}),
      h('span',{className:'eva-ai-team__team-name','data-eva-tooltip':options.name,'data-eva-tooltip-clamp':'true'},options.nameNode!==undefined?options.nameNode:options.name),
      options.system&&h('span',{className:'eva-ai-team__team-default'},'默认'),
      options.hasUnread&&unreadDot(options.name+'有未读消息')));
  const aiTeamSessionRow=(identityId,session,options={})=>h('div',{key:session.id||session.sessionId,className:'eva-ai-team__session-row'+(options.selected?' is-selected':'')+(options.active?' is-search-active':'')},
    h('button',{type:'button',className:'eva-ai-team__session','aria-current':options.selected?'true':undefined,onClick:options.onActivate||(()=>choose(identityId,session.id||session.sessionId))},
      h('span',{className:'eva-ai-team__session-title','data-eva-tooltip':session.title,'data-eva-tooltip-clamp':'true'},options.titleNode!==undefined?options.titleNode:session.title),
      unreadBadge(session.unreadCount)),
    options.actions!==undefined&&h('div',{className:'eva-ai-team__session-actions'},options.actions));
  const aiTeamThreadRow=(groupId,thread,options={})=>h('div',{key:thread.id,className:'eva-ai-team__team-thread-row'+(options.selected?' is-selected':'')+(options.active?' is-search-active':'')},
    h(ConvCompactItem,{isThread:true,name:options.nameNode!==undefined?options.nameNode:thread.name,unread:Number(thread.unread||thread.unreadCount||0)||0,selected:options.selected,onClick:options.onActivate||(()=>choose(groupId,thread.id))}),
    options.actions!==undefined&&h('div',{className:'eva-ai-team__session-actions'},options.actions));
  // 分组标题（「标题 + 右侧拖尾细线」）在原生列表与搜索结果中共用同一组件。
  // 细线始终渲染，是否省略第一组由父容器用 :first-child 判定（见 046 与拉人模板 §5.1），
  // 组件只负责行内几何；原生可折叠分组把 chevron 作为 trailing 传入。
  const aiTeamSectionHeading=options=>h('span',{key:options.key,className:'eva-ai-team__section-heading'},
    h('span',{className:'eva-ai-team__section-label'},options.label),
    options.unread&&unreadDot(options.unread),
    h('span',{className:'eva-ai-team__section-rule','aria-hidden':true}),
    options.trailing);
  function identityItem(i){
    const sessions=snapshot.sessions.filter(s=>s.identityId===i.id).sort((a,b)=>Number(!!b.pinned)-Number(!!a.pinned)||b.updatedAt.localeCompare(a.updatedAt));
    const collapsed=collapsedIdentitySessions[i.id]===true, hasUnread=sessions.some(item=>item.unreadCount>0), abnormal=i.status==='offline'||(i.role==='persona'&&i.syncStatus!=='synced');
    return h('section',{className:'eva-ai-team__identity',key:i.id},
      aiTeamIdentityHeading({name:i.name,avatar:h(EvaAIIdentityAvatar,{appearance:evaIdentityAppearance(i),size:22}),hasUnread,onContextMenu:event=>openIdentityMenu(event,i),buttonProps:{'aria-label':(collapsed?'展开 ':'收起 ')+i.name+' 会话列表','aria-expanded':!collapsed,'aria-controls':'ai-sessions-'+i.id,onKeyUp:event=>identityMenuKey(event,i),onClick:()=>toggleIdentitySessions(i.id)},trailing:h('span',{className:'eva-ai-team__new-session-anchor'},h('button',{type:'button',className:'eva-ai-team__identity-action eva-ai-team__new-session'+(identity?.id===i.id?' is-active':''),'aria-label':'新建会话','data-eva-tooltip':'新建会话',onClick:event=>{event.stopPropagation();newConversation(i.id);}},h(Plus$c,{size:14,strokeWidth:1.75})))}),
      abnormal&&h('p',{className:'eva-ai-team__identity-status'},status(i)),
      h('div',{className:'eva-ai-team__sessions',id:'ai-sessions-'+i.id,hidden:collapsed},
        sessions.map(s=>aiTeamSessionRow(i.id,s,{selected:session?.id===s.id,actions:conversationMenu(i.id,s)}))));
  }
  function employeeItem(item){
    const sessions=digitalStore.sessions(item.id), collapsed=collapsedIdentitySessions[item.id]===true, hasUnread=sessions.some(session=>session.unreadCount>0);
    return h('section',{className:'eva-ai-team__identity',key:item.id},
      aiTeamIdentityHeading({name:item.name,avatar:window.EvaAIIdentity.avatar(digitalStore.appearance(item),22,h),hasUnread,onContextMenu:event=>openIdentityMenu(event,item,true),buttonProps:{'aria-label':(collapsed?'展开 ':'收起 ')+item.name+' 会话列表','aria-expanded':!collapsed,'aria-controls':'ai-sessions-'+item.id,onKeyUp:event=>identityMenuKey(event,item,true),onClick:()=>toggleIdentitySessions(item.id)},trailing:h('span',{className:'eva-ai-team__new-session-anchor'},h('button',{type:'button',className:'eva-ai-team__identity-action eva-ai-team__new-session'+(employee?.id===item.id?' is-active':''),'aria-label':'新建会话','data-eva-tooltip':'新建会话',onClick:event=>{event.stopPropagation();newConversation(item.id);}},h(Plus$c,{size:14,strokeWidth:1.75})))}),
      h('div',{className:'eva-ai-team__sessions',id:'ai-sessions-'+item.id,hidden:collapsed},
        sessions.map(itemSession=>{const selected=employee?.id===item.id&&employeeSession?.id===itemSession.id;return aiTeamSessionRow(item.id,itemSession,{selected,actions:conversationMenu(item.id,itemSession,true)});})));
  }
  function roleGroup(role,label,items) {
    const groupId='eva-ai-team-group-'+role, groupCollapsed=collapsedGroups[role], hasUnread=role==='digital'&&items.some(item=>digitalStore.hasUnread(item.id));
    return h('section',{className:'eva-ai-team__role-group'+(groupCollapsed?' is-collapsed':''),key:role,'aria-label':label},
      h('button',{type:'button',className:'eva-ai-team__group-toggle','aria-expanded':!groupCollapsed,'aria-controls':groupId,onClick:()=>setCollapsedGroups(value=>({...value,[role]:!value[role]}))},
        aiTeamSectionHeading({label,unread:hasUnread&&label+'有未读消息',trailing:h(ChevronRight,{size:12,className:'eva-ai-team__group-chevron'+(groupCollapsed?'':' is-expanded'),'aria-hidden':true})})),
      !groupCollapsed&&h('div',{className:'eva-ai-team__group-content',id:groupId},items.map(role==='digital'?employeeItem:identityItem)));
  }
  function teamGroupItem(group){
    const groupSource=groupStore.source(group.id,fixedMembers),channel=groupSource.channels[0],threads=orderedTeamThreads(channel.threads),expanded=collapsed[group.id]===false,selected=selection.identityId===group.id,threadsId='ai-team-threads-'+group.id,showAll=showAllTeamThreads[group.id]===true,visibleThreads=group.system&&!showAll?threads.slice(0,3):threads,hasMore=group.system&&threads.length>3,hasUnread=groupStore.hasUnread(group.id);
    return h('section',{className:'eva-ai-team__team',key:group.id},
      aiTeamTeamHeading({id:group.id,name:group.name,system:group.system,selected:selected&&!selection.sessionId,hasUnread,buttonProps:{'aria-label':'进入 AI 小队会话 '+group.name,'aria-current':selected&&!selection.sessionId?'true':undefined,'aria-expanded':expanded,'aria-controls':threadsId,onClick:()=>{if(!expanded)setCollapsed(value=>({...value,[group.id]:false}));choose(group.id,null);}}}),
      expanded&&h('div',{className:'eva-ai-team__team-threads',id:threadsId},visibleThreads.map(item=>aiTeamThreadRow(group.id,item,{selected:selected&&selection.sessionId===item.id,actions:teamThreadMenu(group,item)})),hasMore&&h('button',{type:'button',className:'eva-ai-team__team-threads-more','aria-expanded':showAll,'aria-label':(showAll?'收起 ':'展开查看 ')+group.name+' 子区',onClick:()=>setShowAllTeamThreads(value=>({...value,[group.id]:!showAll}))},h('span',null,showAll?'收起':'展开查看'),h(ChevronDown,{size:12,className:'eva-ai-team__team-threads-more-chevron'+(showAll?' is-expanded':''),'aria-hidden':true}))));
  }
  const personas=snapshot.identities.filter(i=>i.role==='persona');
  const groupCandidates=[...teamIdentities.map(item=>({id:item.id,name:item.name,kind:item.role,appearance:evaIdentityAppearance(item)})),...digitalEmployees.map(item=>({id:item.id,name:item.name,kind:'digital',appearance:digitalStore.appearance(item)}))];
  const openPersonalAssistant=()=>window.__evaOpenAssistantEditor?.({mode:'create',role:'assistant',returnFocus:groupEditorOpener.current});
  const closeGroupEditor=()=>{setGroupEditor(null);requestAnimationFrame(()=>groupEditorOpener.current?.focus());};
  const saveGroup=record=>{if(groupEditor?.mode==='members'){groupStore.updateGroup(groupEditor.record.id,{memberIds:record.memberIds});Toast.success('AI 小队成员已更新');}else{const groupId=groupStore.createGroup(record);setCollapsed(value=>({...value,[groupId]:false}));choose(groupId,null);Toast.success('AI 小队已创建');}closeGroupEditor();};
  const confirmDissolveGroup=()=>{if(!groupToDissolve)return;const id=groupToDissolve.id;try{groupStore.removeGroup(id);setCollapsed(value=>{const next={...value};delete next[id];return next;});setShowAllTeamThreads(value=>{const next={...value};delete next[id];return next;});if(selection.identityId===id)choose(groupStore.id,null);setGroupToDissolve(null);Toast.success('AI 小队已解散');}catch(e){Toast.error(e.message||'解散失败');}};
  // 「我的 Agent」搜索：命中当前入口的会话标题或 AI 名称（个人助理／云端分身／
  // 数字员工／AI 小队），按「分类 → AI 身份 → 会话」三级给出：分类作分组标题，
  // 身份作父行（头像 + 名称 + AI 标），命中会话缩进挂在父行下，从属关系由层级表达，
  // 不再逐行重复归属身份。身份名命中或会话命中都会带出父身份，故无会话的身份也能搜到。
  // 数据全部来自已有 store，不新增第二份会话源。
  // 结果行直接复用中栏原生列表的 team／identity／session 行 markup，外观与列表完全一致，
  // 不另造一套行样式；分组标题为「标题 + 右侧拖尾细线」，「展开其余」沿用原生 more 行外观。
  const [searchOpen,setSearchOpen]=reactExports.useState(false);
  const [searchQuery,setSearchQuery]=reactExports.useState('');
  const [searchExpand,setSearchExpand]=reactExports.useState({});
  const [searchActive,setSearchActive]=reactExports.useState(-1);
  const searchToggle=reactExports.useRef(null),searchBoxRef=reactExports.useRef(null),searchRowsRef=reactExports.useRef([]);
  // 退出机制：点结果或任一侧栏会话后关闭且不抢焦点；点搜索区外或按 Esc 关闭并把焦点还给搜索入口。
  const closeSearch=(options={})=>{setSearchOpen(false);setSearchQuery('');setSearchExpand({});setSearchActive(-1);if(options.refocus!==false)requestAnimationFrame(()=>searchToggle.current?.focus());};
  const searchSelectionKey=(selection.identityId||'')+'::'+(selection.sessionId||'');
  reactExports.useEffect(()=>{if(searchOpen)closeSearch({refocus:false});},[searchSelectionKey]);
  reactExports.useEffect(()=>{
    if(!searchOpen)return undefined;
    const inSearchUi=target=>!!target&&!!target.closest&&(target.closest('.eva-ai-team__search')||target.closest('.eva-ai-team__search-toggle')||target.closest('.eva-ai-team__roles'));
    const onPointerDown=event=>{if(!inSearchUi(event.target))closeSearch({refocus:false});};
    const onKeyDown=event=>{if(event.key==='Escape')closeSearch();};
    document.addEventListener('pointerdown',onPointerDown,true);
    document.addEventListener('keydown',onKeyDown,true);
    return ()=>{document.removeEventListener('pointerdown',onPointerDown,true);document.removeEventListener('keydown',onKeyDown,true);};
  },[searchOpen]);
  const searchValue=searchQuery.trim().toLowerCase();
  const searchTime=item=>String(item.updated_at||item.updatedAt||item.created_at||item.createdAt||'');
  const searchTitleOf=item=>item.title||item.name||'未命名会话';
  const searchCategories=[{key:'squad',label:'AI 小队'},{key:'persona',label:'云端分身'},{key:'assistant',label:'个人助理'},{key:'employee',label:'数字员工'}];
  const searchPerGroup=5;
  const searchRecords=[];
  if(searchOpen&&searchValue){
    teamGroups.forEach(group=>{
      searchRecords.push({identityId:group.id,sessionId:null,title:searchTitleOf(group),ownerName:group.name,ownerType:'group',category:'squad',ownerId:group.id,system:!!group.system,kind:'identity',updatedAt:searchTime(group),unreadCount:0,pinned:false});
      orderedTeamThreads(groupStore.source(group.id,fixedMembers).channels[0].threads).forEach(thread=>searchRecords.push({identityId:group.id,sessionId:thread.id,title:searchTitleOf(thread),ownerName:group.name,ownerType:'group',category:'squad',ownerId:group.id,kind:'session',updatedAt:searchTime(thread),unreadCount:Number(thread.unread||0)||0,pinned:!!threadPreferenceStore.chatPreferences(thread.id,threadPreferenceActor).top}));
    });
    availableIdentities.forEach(item=>{
      const isDigital=digitalEmployees.some(candidate=>candidate.id===item.id);
      const category=isDigital?'employee':item.role==='persona'?'persona':item.role==='employee'?'employee':'assistant';
      const appearance=isDigital?digitalStore.appearance(item):evaIdentityAppearance(item);
      // 身份本身也作为一条结果：即便该 AI 还没有会话，也能按名称搜到并进入。
      searchRecords.push({identityId:item.id,sessionId:null,title:item.name,ownerName:item.name,ownerType:'ai',category,ownerId:item.id,ownerAppearance:appearance,kind:'identity',updatedAt:'',unreadCount:0,pinned:false});
      sessionsFor(item.id).forEach(session=>searchRecords.push({identityId:item.id,sessionId:session.id,title:searchTitleOf(session),ownerName:item.name,ownerType:'ai',category,ownerId:item.id,ownerAppearance:appearance,kind:'session',updatedAt:searchTime(session),unreadCount:Number(session.unreadCount||0)||0,pinned:!!session.pinned}));
    });
  }
  const searchMatches=searchValue?searchRecords.filter(record=>record.title.toLowerCase().includes(searchValue)||record.ownerName.toLowerCase().includes(searchValue)):[];
  const highlightTitle=text=>{const value=String(text||''),index=searchValue?value.toLowerCase().indexOf(searchValue):-1;return index<0?value:[value.slice(0,index),h('mark',{key:'search-hit',className:'eva-ai-team__search-hit'},value.slice(index,index+searchValue.length)),value.slice(index+searchValue.length)];};
  const searchOwnerAvatar=record=>record.ownerType==='group'?h('img',{className:'eva-ai-team__team-avatar',src:window.EvaAvatar.uri({kind:'group',id:record.ownerId}),alt:'',draggable:false}):h(EvaAIIdentityAvatar,{appearance:record.ownerAppearance,size:22});
  const searchRows=[],searchBody=[];
  // 分类 → AI 身份 → 会话 三级，行 markup 与中栏原生列表同一套（team/identity/session 行），
  // 搜索结果与列表外观完全一致；命中会话缩进挂在父身份下，不再逐行重复归属。
  const identityRecordById=new Map(searchRecords.filter(record=>record.kind==='identity').map(record=>[record.identityId,record]));
  searchCategories.forEach(category=>{
    const matchedIdentities=searchMatches.filter(record=>record.kind==='identity'&&record.category===category.key);
    const matchedSessions=searchMatches.filter(record=>record.kind==='session'&&record.category===category.key);
    const identityHits=new Set(matchedIdentities.map(record=>record.identityId));
    const identityIds=[];
    matchedIdentities.forEach(record=>{if(!identityIds.includes(record.identityId))identityIds.push(record.identityId);});
    matchedSessions.forEach(record=>{if(!identityIds.includes(record.identityId))identityIds.push(record.identityId);});
    if(!identityIds.length)return;
    // 身份名命中优先，其次按该身份最近命中会话的时间。
    const latestAt=id=>matchedSessions.reduce((time,record)=>record.identityId===id&&String(record.updatedAt)>time?String(record.updatedAt):time,'');
    identityIds.sort((a,b)=>Number(!identityHits.has(b))-Number(!identityHits.has(a))||latestAt(b).localeCompare(latestAt(a)));
    // 分组标题右侧拖一条与文字垂直居中的细线；首组不拖线由父容器 :first-child 判定。
    searchBody.push(aiTeamSectionHeading({key:category.key+':title',label:category.label}));
    identityIds.forEach(identityId=>{
      const parent=identityRecordById.get(identityId);
      if(!parent)return;
      const isSquad=category.key==='squad';
      const parentIndex=searchRows.length;
      searchRows.push({identityId,sessionId:null});
      const sessions=matchedSessions.filter(record=>record.identityId===identityId).sort((a,b)=>Number(!!b.pinned)-Number(!!a.pinned)||String(b.updatedAt).localeCompare(String(a.updatedAt)));
      const shownSessions=searchExpand[identityId]?sessions:sessions.slice(0,searchPerGroup);
      const childNodes=shownSessions.map(record=>{
        const rowIndex=searchRows.length;
        searchRows.push({identityId,sessionId:record.sessionId});
        const open=()=>{choose(identityId,record.sessionId);closeSearch({refocus:false});};
        const active=rowIndex===searchActive;
        // 复用中栏列表同一行组件：AI 小队子区是原生线程行，其余是原生会话行；
        // 命中高亮只换成 nameNode/titleNode，行为差异只体现在 onActivate。
        if(isSquad)return aiTeamThreadRow(identityId,{id:record.sessionId,name:record.title,unread:record.unreadCount},{nameNode:highlightTitle(record.title),selected:selection.identityId===identityId&&selection.sessionId===record.sessionId,active,onActivate:open});
        return aiTeamSessionRow(identityId,{sessionId:record.sessionId,title:record.title,unreadCount:record.unreadCount},{titleNode:highlightTitle(record.title),selected:selection.sessionId===record.sessionId,active,onActivate:open});
      });
      // 父行同一个团队/身份行组件，选中态与激活行为按当前入口传入。
      const parentNode=isSquad
        ? aiTeamTeamHeading({id:identityId,name:parent.title,nameNode:highlightTitle(parent.title),system:parent.system,selected:selection.identityId===identityId&&!selection.sessionId,active:parentIndex===searchActive,buttonProps:{'aria-label':'进入 AI 小队会话 '+parent.title,onClick:()=>{choose(identityId,null);closeSearch({refocus:false});}}})
        : aiTeamIdentityHeading({name:parent.title,nameNode:highlightTitle(parent.title),avatar:searchOwnerAvatar(parent),active:parentIndex===searchActive,buttonProps:{'aria-label':parent.title,onClick:()=>{choose(identityId,null);closeSearch({refocus:false});}}});
      searchBody.push(h('section',{key:identityId,className:'eva-ai-team__identity'},parentNode,h('div',{className:'eva-ai-team__sessions'},childNodes)));
      const rest=sessions.length-shownSessions.length;
      if(rest>0)searchBody.push(h('button',{type:'button',key:identityId+':more',className:'eva-ai-team__search-more',onMouseDown:event=>event.preventDefault(),onClick:event=>{event.stopPropagation();setSearchExpand(previous=>({...previous,[identityId]:true}));setSearchActive(-1);}},'展开其余 '+rest+' 条'));
    });
  });
  searchRowsRef.current=searchRows;
  const searchResultView=h('div',{className:'eva-ai-team__search-results'},searchBody);
  const searchEmptyView=h('div',{className:'eva-task-assignee-empty'},'没有找到匹配的会话');
  return h('div',{className:'eva-ai-team'},
    h('aside',{className:'eva-ai-team__sidebar','aria-label':'我的 Agent',ref:rail},
      h('div',{className:'eva-conversation-rail-resizer',role:'separator','aria-label':'调整中间栏宽度','aria-orientation':'vertical',tabIndex:0,'data-eva-conversation-rail-resizer':true}),
      h('header',{className:'eva-ai-team__sidebar-header eva-rail-header'},h('h1',null,'我的 Agent'),h('button',{type:'button',ref:searchToggle,className:'eva-ai-team__search-toggle'+(searchOpen?' is-active':''),'aria-label':'搜索会话','aria-pressed':searchOpen,'data-eva-tooltip':'搜索会话',onClick:()=>searchOpen?closeSearch():setSearchOpen(true)},h(Search$1,{size:16,'aria-hidden':true})),h(Dropdown,{trigger:'click',position:'bottomRight',clickToHide:true,onVisibleChange:setCreateMenuOpen,getPopupContainer:()=>rail.current,render:h(Dropdown.Menu,null,
        h(Dropdown.Item,{icon:h(Users,{size:16}),onClick:()=>setGroupEditor({mode:'create'})},'新建 AI 小队'),
        h(Dropdown.Item,{icon:h(Sparkles,{size:16}),onClick:openPersonalAssistant},'新建个人助理'))},h('span',{onFocus:event=>{groupEditorOpener.current=event.target;},onClick:()=>setCreateTipDismissed(true),onMouseLeave:()=>setCreateTipDismissed(false)},h(window.EvaTooltipComponent,{content:'新建',condition:!createMenuOpen&&!createTipDismissed},h('span',{style:{display:'inline-flex'}},h(Button,{className:'eva-ai-team__create',theme:'borderless',type:'tertiary',icon:h(Plus$c,{size:18,strokeWidth:1.75}),'aria-label':'新建'})))))),
      searchOpen&&h('div',{className:'eva-ai-team__search',ref:searchBoxRef,onKeyDown:event=>{
        if(event.nativeEvent.isComposing||event.keyCode===229)return;
        if(event.key==='ArrowDown'){event.preventDefault();setSearchActive(index=>Math.min(index+1,(searchRowsRef.current||[]).length-1));}
        else if(event.key==='ArrowUp'){event.preventDefault();setSearchActive(index=>Math.max(index-1,0));}
        else if(event.key==='Enter'){event.preventDefault();const row=(searchRowsRef.current||[])[searchActive];if(row){choose(row.identityId,row.sessionId);closeSearch({refocus:false});}}
        else if(event.key==='Escape'){event.stopPropagation();closeSearch();}
      }},h(ForwardInput,{className:'eva-ai-team__search-input',placeholder:'搜索会话',value:searchQuery,onChange:value=>{setSearchQuery(value);setSearchActive(-1);},showClear:true,autoFocus:true,'aria-label':'搜索会话'})),
      h('div',{className:'eva-ai-team__roles'},searchOpen&&searchValue?(searchMatches.length?searchResultView:searchEmptyView):h(React.Fragment,null,
        h('section',{className:'eva-ai-team__team-group'},aiTeamSectionHeading({label:'AI 小队'}),h('div',{className:'eva-ai-team__teams'},teamGroups.map(teamGroupItem))),
        h('div',{className:'eva-ai-team__direct-groups'},roleGroup('persona','云端分身',personas),roleGroup('assistant','个人助理',teamIdentities.filter(i=>i.role==='assistant')),roleGroup('digital','数字员工',digitalEmployees))),
        h(IdentityContextMenus,{ref:identityMenuRef,menus:identityMenus}))),
    h('main',{className:'eva-ai-team__main'},
      snapshot.storageWarning&&h('p',{className:'eva-ai-team__notice',role:'status'},snapshot.storageWarning),
      groupSelected?h(ChannelsView,{key:selectedGroup.id+':'+(selection.sessionId||'group'),source,onOpenTask:()=>{}}):employee?h(ChannelsView,{key:'digital-chat:'+employee.id+':'+(employeeSession?.id||'empty'),source,onOpenTask:()=>{}}):identity?h(React.Fragment,null,
        identity.role==='assistant'&&identity.status==='offline'&&h('p',{className:'eva-ai-team__notice',role:'status'},'个人助理离线，历史记录仍可查看；上线后可继续发送。'),
        identity.role==='persona'&&identity.syncStatus==='error'&&h(Button,{theme:'borderless',onClick:()=>store.syncPersona(identity.id).catch(e=>setError(e.message))},'重试同步'),
        error&&h('p',{className:'eva-ai-team__error',role:'alert'},error),
        h(ChannelsView,{key:draftKey,source,onOpenTask:()=>{}})):
      h('div',{className:'eva-ai-team__empty'},h(Users,{size:32}),h('h2',null,'暂无可用的数字员工'),h('p',null,'接入公司数字员工后，即可在这里使用'))),
    h('div',{className:'eva-ai-team__modal-host',ref:host}),
    h(EvaAITeamGroupEditor,{visible:!!groupEditor,record:groupEditor?.record||null,membersOnly:groupEditor?.mode==='members',candidates:groupCandidates,onClose:closeGroupEditor,onSubmit:saveGroup,getContainer:()=>host.current}),
    h(Modal,{visible:!!groupToDissolve,title:'解散 AI 小队',className:'eva-ai-team__modal',getPopupContainer:()=>host.current,onCancel:()=>setGroupToDissolve(null),onOk:confirmDissolveGroup,okText:'解散群',cancelText:'取消',okButtonProps:{type:'danger'},width:420},
      h('p',null,'确认解散“'+(groupToDissolve?.name||'')+'”？AI 小队消息、草稿和子区将被删除且无法恢复；AI 单聊不受影响。')),
    rename&&h(EvaAIThreadRenameForm,{key:rename.identityId+':'+rename.id,request:rename,onClose:()=>setRename(null),onSave:saveRename,getContainer:()=>host.current}));
}

    // Octo-Web ConversationListGrouped: handle-only PointerSensor (6px),
    // vertical sorting, parent channels carry their child threads.
    function EvaFollowGrip(props){
      const Grip=reactExports.useMemo(()=>createLucideIcon('GripVertical',[
        ['circle',{cx:'9',cy:'12',r:'1',key:'1'}],['circle',{cx:'9',cy:'5',r:'1',key:'2'}],
        ['circle',{cx:'9',cy:'19',r:'1',key:'3'}],['circle',{cx:'15',cy:'12',r:'1',key:'4'}],
        ['circle',{cx:'15',cy:'5',r:'1',key:'5'}],['circle',{cx:'15',cy:'19',r:'1',key:'6'}]
      ]),[]);
      return React.createElement(Grip,{size:14,'aria-hidden':true,...props});
    }
    function EvaFollowChannel({id,categoryId,enabled,children}){
      const drag=useSortable({id:'item:'+id,data:{type:'item',categoryId},disabled:!enabled});
      const items=React.Children.toArray(children);
      if(!enabled)return React.createElement(React.Fragment,null,children);
      items[0]=React.cloneElement(items[0],{dragHandleProps:{...drag.attributes,...drag.listeners,ref:drag.setActivatorNodeRef,'aria-label':'拖动排序：'+items[0].props.name}});
      return React.createElement('div',{ref:drag.setNodeRef,className:'eva-follow-channel'+(drag.isDragging?' is-dragging':''),style:{transform:CSS$1.Transform.toString(drag.transform?{...drag.transform,scaleX:1,scaleY:1}:null),transition:drag.transition}},items);
    }
    function EvaConversationCategoryEditor({store,actorId,record,channels,onClose,onSaved}){
      const h=React.createElement;
      const available=channels.filter(c=>!c.category?.startsWith('space:'));
      const initial=record.id?available.filter(c=>c.category===record.id).map(c=>c.id):(record.initialChannelIds||[]);
      return h(evaMembers().ui.MemberPicker,{
        visible:true,
        title:record.id?'编辑分组':'新建关注分组',
        className:'eva-conversation-category-editor',
        items:available.map(c=>({id:c.id,name:c.name,kind:'channel',channel:c,appearance:c.identityAppearance||null,ai:!!c.identityId})),
        groups:[{kind:'channel',label:'会话'}],
        memberLabel:'会话',
        itemNoun:'会话',
        allowEmpty:true,
        initialSelectedIds:initial,
        searchLabel:'搜索会话',
        searchPlaceholder:'搜索会话',
        emptyTitle:'暂无可放入分组的非项目会话',
        emptyDescription:'项目群及子区按项目归属，不能移入自定义分组',
        noResultsText:'没有匹配的会话',
        nameField:{id:'eva-category-name',label:'分组名称',initialValue:record.name||'',required:true,maxLength:50,autoFocus:true},
        submit:record.id?'保存':'创建',
        onCancel:onClose,
        onSubmit:(chosen,name)=>{store.saveConversationCategory(actorId,{id:record.id,name,channelIds:chosen.map(item=>item.id),availableChannels:available});onSaved();}
      });
    }
    function EvaFollowCategory({categoryId,sortableItems,children,title,extra,onContextMenu}){
      const drag=useSortable({id:'category:'+categoryId,data:{type:'category'}});
      const project=categoryId.startsWith('space:')?loadSpaces().find(p=>p.id===categoryId.slice(6)):null;
      return React.createElement('section',{ref:drag.setNodeRef,className:'eva-follow-category'+(drag.isDragging?' is-dragging':''),style:{transform:CSS$1.Transform.toString(drag.transform?{...drag.transform,scaleX:1,scaleY:1}:null),transition:drag.transition},'aria-label':title.props.name},
        React.createElement('div',{className:'eva-follow-category-title',onContextMenu},
          React.createElement('button',{type:'button',className:'eva-follow-category-handle',...drag.attributes,...drag.listeners,ref:drag.setActivatorNodeRef,'aria-label':'拖动分组：'+title.props.name,onClick:e=>e.stopPropagation()},React.createElement(EvaFollowGrip)),title,project&&extra?React.cloneElement(extra,{icon:React.createElement(LayoutGrid,{size:16,style:{color:window.EvaProjectAppearance.css(project).accent},"aria-hidden":true})}):extra),
        React.createElement(SortableContext,{items:sortableItems.map(id=>'item:'+id),strategy:verticalListSortingStrategy},children));
    }
    function EvaFollowList({store,actorId,categories,channels,children}){
      const sensors=useSensors$1(useSensor(PointerSensor,{activationConstraint:{distance:6}}),useSensor(KeyboardSensor,{coordinateGetter:sortableKeyboardCoordinates}));
      const collision=args=>closestCenter({...args,droppableContainers:args.droppableContainers.filter(c=>{
        const active=args.active.data.current,target=c.data.current;
        return active?.type===target?.type&&(active?.type==='category'||active?.categoryId===target?.categoryId);
      })});
      const onDragEnd=({active,over})=>{
        if(!over||active.id===over.id)return;
        const data=active.data.current,target=over.data.current;
        if(data?.type!==target?.type)return;
        const category=data.type==='category';
        if(!category&&data.categoryId!==target.categoryId)return;
        const bucket=category?'categories':'channels:'+data.categoryId;
        const list=category?categories:store.followOrder(actorId,bucket,channels.filter(c=>c.category===data.categoryId));
        const prefix=category?'category:':'item:',from=list.findIndex(c=>prefix+c.id===active.id),to=list.findIndex(c=>prefix+c.id===over.id);
        if(from<0||to<0)return;
        store.setFollowOrder(actorId,bucket,arrayMove(list,from,to).map(c=>c.id));
      };
      return React.createElement(DndContext,{sensors,collisionDetection:collision,onDragEnd},
        React.createElement(SortableContext,{items:categories.map(c=>'category:'+c.id),strategy:verticalListSortingStrategy},children));
    }

    function cut(needle,replacement,label){source=root.__evaCut(source,needle,replacement,'IM '+label);}
    cut('"module.createThread.nameLabel":"话题名称"','"module.createThread.nameLabel":"子区名称"','创建子区字段名称');
    cut('"module.createThread.namePlaceholder":"输入讨论话题..."','"module.createThread.namePlaceholder":"输入子区名称"','创建子区输入提示');
    cut('"module.createThread.nameRequired":"话题名称不能为空"','"module.createThread.nameRequired":"请输入子区名称"','创建子区必填提示');
    cut('"threadCreate.nameMaxLength":"子区名称不能超过100个字符"','"threadCreate.nameMaxLength":"子区名称不能超过30个字符"','创建子区长度提示');
    cut('THREAD_NAME_MAX_LENGTH=100','THREAD_NAME_MAX_LENGTH=30','子区名称长度限制');
    const evaThreadIconStart=source.indexOf('ThreadIcon=({size:');
    const evaThreadIconEnd=source.indexOf(';function ConvCompactItem',evaThreadIconStart);
    if(evaThreadIconStart<0||evaThreadIconEnd<evaThreadIconStart)throw new Error('IM 统一子区图标边界不匹配');
    cut(source.slice(evaThreadIconStart,evaThreadIconEnd),
      'ThreadIcon=createLucideIcon("corner-down-right",[["path",{d:"m15 10 5 5-5 5",key:"1mk7zo"}],["path",{d:"M4 4v7a4 4 0 0 0 4 4h12",key:"zqzwo1"}]])',
      '统一子区图标');
    cut('title:"创建子区",icon:React.createElement(MessageSquare,{size:18})',
      'title:"创建子区",icon:React.createElement(ThreadIcon,{size:18})', '创建子区菜单共享图标');
    cut('icon:React.createElement(EvaReplyIcon,{size:18})',
      'icon:React.createElement(MessageSquareMoreIcon,{size:18,className:"ctx-icon"})', '右键菜单回复图标对齐 Octo');
    cut('icon:React.createElement(Copy$a,{size:18}),onClick:()=>navigator.clipboard?.writeText(ci.text??"").catch(()=>{})',
      'icon:React.createElement(Copy$a,{size:18,className:"ctx-icon"}),onClick:()=>navigator.clipboard?.writeText(ci.text??"").catch(()=>{})', '右键菜单复制图标对齐 Octo');
    cut('title:"创建子区",icon:React.createElement(ThreadIcon,{size:18})',
      'title:"创建子区",icon:React.createElement(MessageSquarePlus,{size:18,className:"ctx-icon"})', '右键菜单创建子区图标对齐 Octo');
    cut('},evaMenuItems=ci=>{',
      '},MessageSquareMoreIcon=createLucideIcon("message-square-more",[["path",{d:"M22 17a2 2 0 0 1-2 2H6.828a2 2 0 0 0-1.414.586l-2.202 2.202A.71.71 0 0 1 2 21.286V5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2z",key:"message-square-more-1"}],["path",{d:"M12 11h.01",key:"message-square-more-2"}],["path",{d:"M16 11h.01",key:"message-square-more-3"}],["path",{d:"M8 11h.01",key:"message-square-more-4"}]]),EvaListChecksIcon=createLucideIcon("list-checks",[["path",{d:"M13 5h8",key:"list-checks-1"}],["path",{d:"M13 12h8",key:"list-checks-2"}],["path",{d:"M13 19h8",key:"list-checks-3"}],["path",{d:"m3 17 2 2 4-4",key:"list-checks-4"}],["path",{d:"m3 7 2 2 4-4",key:"list-checks-5"}]]),EvaUndoIcon=createLucideIcon("undo-2",[["path",{d:"M9 14 4 9l5-5",key:"undo-2-1"}],["path",{d:"M4 9h10.5a5.5 5.5 0 0 1 5.5 5.5a5.5 5.5 0 0 1-5.5 5.5H11",key:"undo-2-2"}]]),evaMenuItems=ci=>{',
      '右键菜单图标入域');
    cut('icon:React.createElement(EvaForwardIcon,{size:18}),onClick:()=>Toast.info("已打开转发")',
      'icon:React.createElement(EvaForwardIcon,{size:18,className:"ctx-icon"}),onClick:()=>Toast.info("已打开转发")', '右键菜单转发图标对齐 Octo');
    cut('icon:React.createElement(List$1,{size:18}),onClick:()=>Toast.info("已进入多选")',
      'icon:React.createElement(EvaListChecksIcon,{size:18,className:"ctx-icon"}),onClick:()=>Toast.info("已进入多选")', '右键菜单多选图标对齐 Octo');
    cut('{title:"撤回",icon:React.createElement(RotateCcw,{size:18})',
      '{title:"撤回",icon:React.createElement(EvaUndoIcon,{size:18,className:"ctx-icon"})', '右键菜单撤回图标对齐 Octo');
    cut('className:"wk-thread-created-link"},"🧵",ci.thread.name',
      'className:"wk-thread-created-link"},React.createElement(ThreadIcon,{size:14,"aria-hidden":true}),ci.thread.name', '子区创建消息共享图标');
    cut(
      'externalBadge:Mt,avatarUrl:It}){return React.createElement("div",{className:classNames("wk-conv-compact-item"',
      'externalBadge:Mt,avatarUrl:It,threadsExpanded:evaThreadsExpanded}){return React.createElement("div",{className:classNames("wk-conv-compact-item"',
      '会话行展开状态属性'
    );
    cut(
      'React.createElement("span",{className:"wk-conv-compact-name"},rt),Mt&&',
      'React.createElement("span",{className:"wk-conv-compact-name",onDoubleClick:Dt=>{xt&&(Dt.preventDefault(),Dt.stopPropagation(),Pt?.(Dt))}},rt),Mt&&',
      '群名双击展开收起'
    );
    cut(
      'avatarUrl:window.EvaAvatar.uri({kind:ci.id.startsWith("dm-")?"person":"group",id:ci.id,color:ci.color}),selected:ci.id===Ct&&!Pt',
      'avatarUrl:ci.identityAvatarUrl??window.EvaAvatar.uri({kind:ci.id.startsWith("dm-")?"person":"group",id:ci.id,color:ci.color}),threadsExpanded:Zi,selected:ci.id===Ct&&!Pt',
      '群展开状态数据流'
    );
    cut(
      '(St||gt>0)&&React.createElement("span",{className:"wk-conv-compact-badges"},St&&React.createElement("span",{className:"wk-conv-compact-mention","aria-hidden":"true"},"@我"),gt>0&&React.createElement("span",{className:"wk-conv-compact-badge"},gt>99?"99+":gt)),!1&&',
      '(St||gt>0)&&React.createElement("span",{className:"wk-conv-compact-badges"},St&&React.createElement("span",{className:"wk-conv-compact-mention","aria-hidden":"true"},"@我"),gt>0&&React.createElement("span",{className:"wk-conv-compact-badge"},gt>99?"99+":gt)),xt&&React.createElement("span",{className:`wk-conv-compact-thread-toggle${evaThreadsExpanded?" is-expanded":" is-collapsed"}`,role:"button",tabIndex:0,"data-eva-tooltip":evaThreadsExpanded?"收起子区":"展开子区","aria-label":evaThreadsExpanded?"收起子区":"展开子区",onClick:Dt=>{Dt.stopPropagation(),Pt?.(Dt)},onKeyDown:Dt=>{(Dt.key==="Enter"||Dt.key===" ")&&(Dt.preventDefault(),Dt.stopPropagation(),Pt?.(Dt))}},React.createElement(ChevronDown,{size:16})),!1&&',
      '群展开状态图标'
    );
    cut(
      'React.createElement("span",{className:`wk-category-header__arrow${mt?" wk-category-header__arrow--collapsed":""}`},React.createElement("svg",{viewBox:"0 0 16 16",width:"16",height:"16"},React.createElement("path",{d:"M4 6l4 5 4-5z",fill:"currentColor"})))',
      'React.createElement("span",{className:`wk-category-header__arrow${mt?" wk-category-header__arrow--collapsed":""}`},React.createElement(ChevronRight,{size:12,className:"eva-ai-team__group-chevron"+(mt?"":" is-expanded"),"aria-hidden":true}))',
      '项目一级分组使用共享 Lucide 折叠箭头'
    );
    cut("function messageSource(){const rt=loadSpaces(),ct={},ut=rt.map(mt=>({id:\"space:\"+mt.id,name:mt.name})),pt=rt.flatMap(mt=>channelsOfSpace(mt.id).map(gt=>(ct[gt.id]=mt.name,{...gt,category:\"space:\"+mt.id})));DMS.forEach(mt=>{ct[mt.id]=\"私聊消息\"});return{channels:[...pt,...DMS.map(mt=>({...mt,category:\"scope:dm\"}))],cats:[...ut,{id:\"scope:dm\",name:\"私聊消息\"}],messages:{...CHANNEL_MESSAGES,...OWN_MESSAGES},threadMessages:{...THREAD_MESSAGES,...OWN_THREAD_MESSAGES},scopeNameOf:ct}}",
      "function messageSource(evaMessageMode,evaSnapshot,evaIdentity,evaSession){if(evaMessageMode===\"my-ai\"){if(!evaIdentity)return{channels:[],cats:[],messages:{},threadMessages:{},scopeNameOf:{}};return evaTeamThreadSource(evaSnapshot,evaIdentity,evaSession)}const rt=loadSpaces(),ct={},ut=rt.map(mt=>({id:\"space:\"+mt.id,name:mt.name})),pt=rt.flatMap(mt=>channelsOfSpace(mt.id).map(gt=>(ct[gt.id]=mt.name,{...gt,category:\"space:\"+mt.id}))),evaDemo=window.__EVA_IM_DEMO??{channels:[],messages:{}},evaTeamChannels=evaDemo.channels.filter(mt=>!mt.id.startsWith(\"im-ai-\")&&!mt.id.startsWith(\"im-pilot-\")&&(!evaMembers().store.snapshot().groups[mt.id]||evaMembers().store.canRead(mt.id,evaMembers().store.actorId())));DMS.forEach(mt=>{ct[mt.id]=\"私聊消息\"});evaTeamChannels.forEach(mt=>{ct[mt.id]=\"精选会话\"});return{channels:[...pt,...DMS.map(mt=>({...mt,category:\"scope:dm\"})),...evaTeamChannels.map(mt=>({...mt,category:\"scope:demo\"}))],cats:[...ut,{id:\"scope:dm\",name:\"私聊消息\"}],messages:{...CHANNEL_MESSAGES,...OWN_MESSAGES,...evaDemo.messages},threadMessages:{...THREAD_MESSAGES,...OWN_THREAD_MESSAGES},scopeNameOf:ct}}", "messageSource role adapter");
    cut("MessagesPage=()=>{const rt=reactExports.useMemo(()=>messageSource(),[]);return React.createElement(\"div\",{className:\"eva-msg eva-channel-surface\",\"data-eva-channel-surface\":\"global\"},React.createElement(ChannelsView,{source:rt,onOpenTask:()=>{}}))}",
      "MessagesPage=()=>{const{search:evaMessageSearch}=useLocation(),evaMessageMode=new URLSearchParams(evaMessageSearch).get(\"evaIM\")===\"my-ai\"?\"my-ai\":\"all\",evaLiveMemberStore=evaMembers().store,evaLiveMemberRevision=reactExports.useSyncExternalStore(evaLiveMemberStore.subscribe,evaLiveMemberStore.getSnapshot),rt=reactExports.useMemo(()=>messageSource(evaMessageMode),[evaMessageMode,evaLiveMemberRevision]);return React.createElement(\"div\",{className:\"eva-msg eva-channel-surface\",\"data-eva-channel-surface\":\"global\",\"data-eva-message-mode\":evaMessageMode},evaMessageMode===\"my-ai\"?React.createElement(EvaAITeamPage,{key:evaMessageMode}):React.createElement(ChannelsView,{key:evaMessageMode,source:rt,evaTeamGlobal:evaMessageMode===\"all\",onOpenTask:()=>{}}))}", "MessagesPage role host");
    cut("React.createElement(\"div\",{className:\"ch-layout\"},React.createElement(\"div\",{className:\"ch-list\"}",
      "React.createElement(\"div\",{className:\"ch-layout\"},!ct?.conversationOnly&&React.createElement(\"div\",{className:\"ch-list\"}", "conversation-only sidebar slot");
    cut('!ct?.conversationOnly&&React.createElement("div",{className:"ch-list"},React.createElement("div",{className:"ch-list__top"}',
      '!ct?.conversationOnly&&React.createElement("div",{className:"ch-list"},React.createElement("div",{className:"eva-conversation-rail-resizer",role:"separator","aria-label":"调整中间栏宽度","aria-orientation":"vertical",tabIndex:0,"data-eva-conversation-rail-resizer":true}),React.createElement("div",{className:"ch-list__top"}', "shared conversation rail resizer");
    cut('React.createElement(ForwardInput,{className:"ch-list-search",prefix:React.createElement(Search$1,{size:13}),placeholder:"搜索",value:Va,onChange:ci=>Fa(ci),showClear:!0})',
      'React.createElement("h1",{className:evaMembershipProjectId?"eva-project-chat-list-title":"eva-message-list-title"},evaMembershipProjectId?"群聊":"我的消息")', '项目群聊列表标题保留创建入口');
    cut("Sa=pt.find(ci=>ci.id===Ct)??pt[0]??EMPTY_CHANNEL",
      "Sa=(ct?.conversationOnly?ct.channels[0]:pt.find(ci=>ci.id===Ct)??pt[0])??EMPTY_CHANNEL", "current selected source");
    cut("di=ci=>{const Zi=(ci??la).trim();Zi&&(vi(va,Zi),aa(\"\"),requestAnimationFrame(()=>da.current?.scrollTo({top:da.current.scrollHeight,behavior:\"smooth\"})))}",
      "di=ci=>{const Zi=(ci??la).trim();if(!Zi)return false;if(ct?.onSend){const sent=ct.onSend(Zi);if(sent===false)return false;}else vi(va,Zi);aa(\"\");requestAnimationFrame(()=>da.current?.scrollTo({top:da.current.scrollHeight,behavior:\"smooth\"}));return true}", "store send callback");
    cut("React.createElement(EvaIMComposer,{placeholder:`在 ${fa?fa.name:Sa.name} 中回复…`,onSend:di})",
      "React.createElement(EvaIMComposer,{placeholder:ct?.composerDisabled?\"个人助理离线\":Sa.chatType===\"direct\"?`发送给 ${Sa.name}…`:`在 ${fa?fa.name:Sa.name} 中回复…`,onSend:di,initialDraft:ct?.initialDraft,onDraftChange:ct?.onDraftChange,disabled:ct?.composerDisabled})", "shared composer source configuration");
    cut("EvaIMComposer=({placeholder:rt,onSend:ct})=>{const[ut,pt]=reactExports.useState(\"\"),mt=reactExports.useRef(null),gt=()=>{const St=ut.trim();St&&(ct(St),pt(\"\"),mt.current&&(mt.current.textContent=\"\"))}",
      "EvaIMComposer=({placeholder:rt,onSend:ct,initialDraft:evaInitialDraft=\"\",onDraftChange:evaDraftChange,disabled:evaDisabled=false})=>{const[ut,pt]=reactExports.useState(evaInitialDraft),mt=reactExports.useRef(null);reactExports.useEffect(()=>{if(mt.current)mt.current.textContent=evaInitialDraft},[]);const gt=()=>{if(evaDisabled)return;const St=ut.trim();if(St&&ct(St)!==false){evaEmojiRecordFromText(St);pt(\"\");if(mt.current)mt.current.textContent=\"\"}}", "shared composer persisted draft");
    cut("contentEditable:!0,suppressContentEditableWarning:!0,role:\"textbox\",\"aria-label\":rt,\"data-placeholder\":rt,onInput:St=>pt(St.currentTarget.textContent??\"\")",
      "contentEditable:!evaDisabled,suppressContentEditableWarning:!0,role:\"textbox\",\"aria-disabled\":evaDisabled,\"aria-label\":rt,\"data-placeholder\":rt,onInput:St=>{const text=St.currentTarget.textContent??\"\";pt(text);evaDraftChange?.(text)}", "shared composer change callback");
    cut("React.createElement(\"img\",{className:\"collab-avatar eva-entity-avatar\",style:{width:24,height:24},src:window.EvaAvatar.uri({kind:Sa.id.startsWith(\"dm-\")?\"person\":\"group\",id:Sa.id,color:Sa.color}),alt:\"\"})","Sa.identityAppearance?React.createElement(EvaAIIdentityAvatar,{appearance:Sa.identityAppearance,size:28}):React.createElement(\"img\",{className:\"collab-avatar eva-entity-avatar\",style:{width:24,height:24},src:Sa.identityAvatarUrl??window.EvaAvatar.uri({kind:Sa.id.startsWith(\"dm-\")?\"person\":\"group\",id:Sa.id,color:Sa.color}),alt:\"\"})","conversation identity avatar");
    cut("avatarUrl:avatarUri(rt.sender.uid??rt.sender.name,rt.sender.color),senderName:rt.sender.name","avatarUrl:rt.sender.identityAppearance?.avatar??rt.sender.identityAppearance?.logo??avatarUri(rt.sender.uid??rt.sender.name,rt.sender.color),senderIdentityId:rt.sender.uid,identityAppearance:rt.sender.identityAppearance??(/^(b-wangyilin|b-pilot)$/.test(rt.sender.uid)?evaIdentityAppearance(rt.sender):undefined),senderName:rt.sender.name","message identity metadata");
    cut("showAvatar:pt,avatarUrl:mt,senderName:gt","showAvatar:pt,avatarUrl:mt,identityAppearance:evaIdentityAppearanceData,senderIdentityId:evaSenderIdentityId,senderName:gt","shared message identity property");
    cut("React.createElement(Avatar$1,{src:mt,size:36,isOnline:Nt,showOnlineDot:!0,alt:gt,onClick:ir||Ct?void 0:sn})","React.createElement(Avatar$1,{src:mt,size:36,isOnline:Nt,showOnlineDot:!0,alt:gt,onClick:ir||Ct?void 0:sn,identityAppearance:evaIdentityAppearanceData})","shared message identity flow");
    cut("function Avatar$1({src:rt,size:ct=32,isOnline:ut,showOnlineDot:pt,alt:mt,onClick:gt})","function Avatar$1({src:rt,size:ct=32,isOnline:ut,showOnlineDot:pt,alt:mt,onClick:gt,identityAppearance:evaAppearance})","shared avatar property");
    cut("React.createElement(\"img\",{src:rt,alt:Ct,className:\"wk-msg-avatar-img\"}),pt&&ut&&React.createElement(\"span\",{className:\"wk-msg-avatar-online-dot\"})","evaAppearance?React.createElement(EvaAIIdentityAvatar,{appearance:evaAppearance,size:ct}):React.createElement(\"img\",{src:rt,alt:Ct,className:\"wk-msg-avatar-img\"}),!evaAppearance&&pt&&ut&&React.createElement(\"span\",{className:\"wk-msg-avatar-online-dot\"})","shared identity avatar rendering");
    cut("React.createElement(\"span\",{className:\"ops\"},!fa&&React.createElement(\"span\",{className:`op${Mt===\"threads\"?\" is-on\":\"\"}`",
      "React.createElement(\"span\",{className:\"ops\"},!fa&&ct?.sidebarVariant!==\"ai-sessions\"&&React.createElement(\"span\",{className:`op${Mt===\"threads\"?\" is-on\":\"\"}`", "team-only subzone header action");
    cut("!fa&&Zi.push({separator:!0},{title:\"创建子区\"",
      "!fa&&ct?.sidebarVariant!==\"ai-sessions\"&&Zi.push({separator:!0},{title:\"创建子区\"", "team-only subzone menu");
    cut('React.createElement("div",{className:"ch-main__stream"},React.createElement("div",{className:"ch-stream",ref:da},Ta.map((ci,Zi)=>hi(ci,Zi,Ta)))',
      'React.createElement("div",{className:"ch-main__stream",onClick:ci=>{(Mt==="threads"||Mt==="info"||Mt==="file"||Mt==="search"||Mt==="tasks")&&!ci.target.closest?.(".wk-messageinput-box, .wk-contextmenus, .wk-message-file")&&(Mt==="file"&&Qt(null),Dt("none"))}},React.createElement("div",{className:"ch-stream",ref:da},Ta.map((ci,Zi)=>hi(ci,Zi,Ta)))', "点击群聊内容时关闭右侧面板");
    cut('$a=async ci=>{const Zi=await demoFileUrl(ci.name);Qt({url:Zi,name:ci.name,extension:ci.extension,size:ci.size}),Ht(null),Dt("file")}',
      '$a=async ci=>{const Zi=ci.previewUrl??await demoFileUrl(ci.name);Qt({...ci,url:Zi}),Ht(null),Dt("file")}', '文档预览保留文件格式元数据');
    cut('this.register({type:"text",extensions:["html","htm"],renderer:HtmlRenderer,needsFetch:!0})',
      'this.register({type:"word",extensions:["doc","docx"],renderer:EvaWordPreviewRenderer,needsFetch:!1}),this.register({type:"presentation",extensions:["ppt","pptx"],renderer:EvaPresentationPreviewRenderer,needsFetch:!1}),this.register({type:"archive",extensions:["zip","rar","7z","tar","gz"],renderer:EvaArchivePreviewRenderer,needsFetch:!1}),this.register({type:"text",extensions:["html","htm"],renderer:HtmlRenderer,needsFetch:!0})', 'Word 在线阅读渲染器');
    cut('reactExports.useMemo(()=>jt?injectCspMonitor(jt):"",[jt])',
      'reactExports.useMemo(()=>jt?injectCspMonitor(EvaHtmlPreviewDocument(jt,rt.url)):"",[jt,rt.url])', 'HTML 预览资源地址按源文件解析');
    cut('const FilePreviewHeader=({file:rt',
      'const EvaFilePreviewEnterFullscreenIcon=createLucideIcon("Maximize2",[["path",{d:"M15 3h6v6",key:"file-preview-expand-1"}],["path",{d:"m21 3-7 7",key:"file-preview-expand-2"}],["path",{d:"m3 21 7-7",key:"file-preview-expand-3"}],["path",{d:"M9 21H3v-6",key:"file-preview-expand-4"}]]),EvaFilePreviewExitFullscreenIcon=createLucideIcon("Minimize2",[["path",{d:"m14 10 7-7",key:"file-preview-collapse-1"}],["path",{d:"M20 10h-6V4",key:"file-preview-collapse-2"}],["path",{d:"m3 21 7-7",key:"file-preview-collapse-3"}],["path",{d:"M4 14h6v6",key:"file-preview-collapse-4"}]]);const FilePreviewHeader=({file:rt', '文件预览全屏使用 Lucide 图标');
    cut('currentFilesPage:rn=1})=>{const[ln,sn]',
      'currentFilesPage:rn=1,isFullscreen:evaFullscreen=!1,onFullscreenToggle:evaOnFullscreenToggle,fullscreenButtonRef:evaFullscreenButtonRef})=>{const[ln,sn]', '文件预览头部接收全屏状态');
    cut('React.createElement("button",{className:"wk-file-preview-header__btn",onClick:Ur,title:sr("base.filePreview.download")},React.createElement(IconDownload,null)),React.createElement("span",{className:"wk-file-preview-header__sep"})',
      'React.createElement("button",{className:"wk-file-preview-header__btn",onClick:Ur,"data-eva-tooltip":sr("base.filePreview.download")},React.createElement(IconDownload,null)),evaOnFullscreenToggle&&React.createElement("button",{ref:evaFullscreenButtonRef,type:"button",className:"wk-file-preview-header__btn eva-file-preview-fullscreen-button",onClick:evaOnFullscreenToggle,"data-eva-tooltip":evaFullscreen?"退出全屏预览（Esc）":"进入全屏预览","aria-label":evaFullscreen?"退出全屏预览":"进入全屏预览","aria-pressed":evaFullscreen},React.createElement(evaFullscreen?EvaFilePreviewExitFullscreenIcon:EvaFilePreviewEnterFullscreenIcon,{size:16,"aria-hidden":true})),React.createElement("span",{className:"wk-file-preview-header__sep"})', '文件预览头部全屏按钮');
    cut('FilePreviewHost=({file:rt,onClose:ct})=>{const[ut,pt]=reactExports.useState("preview"),[mt,gt]=reactExports.useState(!1),[St,Ct]=reactExports.useState(!1),xt=getExtension',
      'FilePreviewHost=({file:rt,onClose:ct})=>{const[ut,pt]=reactExports.useState("preview"),[mt,gt]=reactExports.useState(!1),[St,Ct]=reactExports.useState(!1),[evaFullscreen,evaSetFullscreen]=reactExports.useState(!1),evaFullscreenButtonRef=reactExports.useRef(null),evaEscEffect=reactExports.useEffect(()=>{const evaOnKeyDown=evaEvent=>{if(evaEvent.key!=="Escape")return;if(evaFullscreen){evaEvent.preventDefault();evaEvent.stopPropagation();evaSetFullscreen(!1);requestAnimationFrame(()=>evaFullscreenButtonRef.current?.focus());return}ct?.()};document.addEventListener("keydown",evaOnKeyDown,!0);return()=>document.removeEventListener("keydown",evaOnKeyDown,!0)},[ct,evaFullscreen]),xt=getExtension', '文档预览 Escape 退出全屏或关闭');
    cut('reactExports.useEffect(()=>{pt("preview"),gt(!1),Ct(!1)},[rt.url])',
      'reactExports.useEffect(()=>{pt("preview"),gt(!1),Ct(!1),evaSetFullscreen(!1)},[rt.url])', '切换文件退出全屏预览');
    cut('return React.createElement("div",{className:"wk-file-preview-panel"},React.createElement(FilePreviewHeader,{file:rt,onClose:ct,',
      'return React.createElement("div",{className:"wk-file-preview-panel"+(evaFullscreen?" is-fullscreen":""),"data-eva-file-preview-fullscreen":evaFullscreen||void 0},React.createElement(FilePreviewHeader,{file:rt,onClose:ct,isFullscreen:evaFullscreen,onFullscreenToggle:()=>evaSetFullscreen(evaValue=>!evaValue),fullscreenButtonRef:evaFullscreenButtonRef,', '统一文件预览承载全屏状态');
    cut('Mt==="file"?React.createElement("div",{className:"ch-right-panel ch-right-panel--preview"},Ft&&React.createElement(FilePreviewHost',
      'Mt==="file"?React.createElement("div",{className:"ch-right-panel ch-right-panel--preview ch-right-panel--file-preview"},React.createElement("div",{className:"eva-file-preview-resizer",role:"separator",tabIndex:0,"aria-label":"调整文件预览宽度","aria-orientation":"vertical","aria-valuemin":280,"aria-valuemax":664,"aria-valuenow":480,"data-eva-file-preview-resizer":true}),Ft&&React.createElement(FilePreviewHost',
      '消息文件预览使用挤压式右栏');
    cut("La=ci=>{xt(ci),Nt(null),Da(null),Dt(\"none\"),Qt(null),Ht(null)}",
      "La=ci=>{setEvaInlineProjectId(null),xt(ci),Nt(null),Da(null),Dt(\"none\"),Qt(null),Ht(null)}", "切换群聊时关闭消息内联项目");
    cut("Za=(ci,Zi)=>{xt(ci),Nt(Zi),Dt(\"none\"),Da(null)},za=ci=>",
      "Za=(ci,Zi)=>{setEvaInlineProjectId(null),xt(ci),Nt(Zi),Dt(\"none\"),Da(null)},evaOpenEffect=reactExports.useEffect(()=>{const evaOpen=evaEvent=>{const evaId=evaEvent.detail?.conversationId,evaThreadId=evaEvent.detail?.threadId;if(!evaId||!pt.some(evaChannel=>evaChannel.id===evaId))return;evaThreadId?Za(evaId,evaThreadId):La(evaId),evaRevealMessage(evaEvent.detail?.messageId)};window.addEventListener(\"eva-im:open\",evaOpen);return()=>window.removeEventListener(\"eva-im:open\",evaOpen)},[pt]),za=ci=>", "切换子区时关闭消息内联项目");
    cut('React.createElement(AppProviders,null,React.createElement(App,null))','React.createElement(AppProviders,null,React.createElement(EvaAssistantEditorHost,null,React.createElement(App,null)))','shared assistant editor host');
    cut('React.createElement("span",{className:"t"},Sa.name)', 'Sa.identityId?React.createElement("span",{className:"eva-identity-name-row"},React.createElement("span",{className:"t eva-identity-name-text","data-eva-tooltip":Sa.name,"data-eva-tooltip-clamp":"true"},Sa.name),React.createElement(AiBadge,{size:"small"})):React.createElement("span",{className:"t"},Sa.name)', 'AI 会话顶部沿用私聊身份标题');
    cut('return React.createElement("span",{className:gt,...pt},ut)},WebhookBadge=', 'return window.EvaAIIdentity.badge(React.createElement,ct)},WebhookBadge=', 'canonical Octo AI badge');
    source=root.__evaCut(source,
      'ChannelsView=({onOpenTask:rt,source:ct})=>{const ut=!!ct,[pt,mt]=reactExports.useState(()=>ct?.channels??channelsOf()),',
      'ChannelsView=({onOpenTask:rt,source:ct,membershipProjectId:evaMembershipProjectId,onManageProject:evaManageProject,evaTeamGlobal:evaTeamGlobal=!1})=>{const evaMemberStore=evaMembers().store,evaMemberRevision=reactExports.useSyncExternalStore(evaMemberStore.subscribe,evaMemberStore.getSnapshot),evaActorId=evaMemberStore.actorId(),[evaGroupCreateOpen,setEvaGroupCreateOpen]=reactExports.useState(false);const ut=!!ct,[evaChannelDrafts,mt]=reactExports.useState(()=>evaMembershipProjectId?evaMemberStore.channels(evaMembershipProjectId,evaActorId,channelsOf()):ct?.channels??channelsOf()),pt=evaMembershipProjectId?evaMemberStore.channels(evaMembershipProjectId,evaActorId,evaChannelDrafts):evaChannelDrafts,',
      'IM 项目群成员数据源');
    source=root.__evaCut(source,'Sa=(ct?.conversationOnly?ct.channels[0]:pt.find(ci=>ci.id===Ct)??pt[0])??EMPTY_CHANNEL,',
      'evaMemberReset=reactExports.useEffect(()=>{Nt(null);Dt("none");Qt(null);Ht(null);setEvaGroupCreateOpen(false);},[evaMembershipProjectId,evaActorId]),evaSelectedChannel=(ct?.conversationOnly?ct.channels[0]:pt.find(ci=>ci.id===Ct)??pt[0])??EMPTY_CHANNEL,Sa={...evaSelectedChannel,...evaMemberStore.chatSettings(evaSelectedChannel.id)},', 'IM 身份切换重置');
    source=root.__evaCut(source,'cn(!1),ut?(Ir(null),Qr(null),hr(!0)):pr("channel")',
      'cn(!1),evaMembershipProjectId?setEvaGroupCreateOpen(true):ut?(Ir(null),Qr(null),hr(!0)):pr("channel")','IM 创建项目群入口');
    // The panel is a sibling of the stable conversation. No scrim, key change, or IM remount.
    const evaInfoStart=source.indexOf('React.createElement("div",{className:"ch-right-panel ch-right-panel--overlay"}');
    const evaInfoEnd=source.indexOf(',Ss=React.createElement(Modal',evaInfoStart);
    if(evaInfoStart<0||evaInfoEnd<evaInfoStart)throw new Error('Octo chat settings panel boundaries changed');
    const evaOldInfo=source.slice(evaInfoStart,evaInfoEnd);
    // Retain the existing thread-specific branch; group/direct settings share one adapter.
    const evaThreadStart=evaOldInfo.indexOf('fa?React.createElement("div",{className:"ch-right-panel__body"}');
    const evaThreadEnd=evaOldInfo.indexOf(':React.createElement("div",{className:"ch-right-panel__body"},React.createElement("div",{className:"ch-info-members"}');
    if(evaThreadStart<0||evaThreadEnd<0)throw new Error('Thread settings boundary changed');
    let evaThreadBody=root.__evaCut(evaOldInfo.slice(evaThreadStart+3,evaThreadEnd),',React.createElement(InfoRow,{label:"GROUP.md",value:"未配置"})',',React.createElement(evaMembers().ui.ChatSettings.ThreadGroupMd,{key:fa.id+":"+evaActorId,id:fa.id,actor:evaActorId})','子区 GROUP.md 独立编辑入口');
    evaThreadBody=root.__evaCut(evaThreadBody,'React.createElement(InfoRow,{label:"参与人数",value:`${fa.member_count} 人`}),','','子区信息移除参与人数');
    // Use the same Octo settings rows and card shell as group/direct settings.
    evaThreadBody=evaThreadBody.replaceAll('className:"ch-right-panel__body"','className:"eva-chat-settings-body"')
      .replaceAll('className:"ch-info-group"','className:"eva-chat-setting-section"')
      .replaceAll('React.createElement(InfoRow,{label:','React.createElement(evaMembers().ui.ChatSettings.Row,{title:')
      .replaceAll('className:"ch-info-row"','className:"eva-chat-setting-row"')
      .replaceAll('className:"lb"','className:"eva-thread-setting-label"')
      .replaceAll('className:"vl"','className:"eva-chat-setting-value"')
      .replace('value:fa.creator_name','value:fa.creator_name||"未记录"');
    const evaParentGroupRow='React.createElement(evaMembers().ui.ChatSettings.ProjectRow,{context:evaMemberStore.conversationContext(fa.id,evaActorId),scoped:!!evaMembershipProjectId&&evaMembershipProjectId===evaMemberStore.conversationContext(fa.id,evaActorId)?.projectId}),React.createElement(evaMembers().ui.ChatSettings.Row,{title:"所属群聊",value:React.createElement("span",{className:"eva-thread-parent-group"},React.createElement("img",{className:"eva-chat-group-avatar",src:window.EvaAvatar.groupUri(Sa.id,Sa.color),alt:"",draggable:!1}),React.createElement("span",{className:"eva-thread-parent-group-name","data-eva-tooltip":Sa.name,"data-eva-tooltip-clamp":"true"},Sa.name)),onClick:()=>La(Sa.id)})';
    evaThreadBody=root.__evaCut(evaThreadBody,
      'React.createElement(evaMembers().ui.ChatSettings.Row,{title:"所属群聊",value:Sa.name}),',
      '',
      '子区信息所属群聊移出原分区');
    evaThreadBody=root.__evaCut(evaThreadBody,
      'React.createElement("div",{className:"eva-chat-setting-section"},React.createElement(evaMembers().ui.ChatSettings.Row,{title:"子区名称"',
      'React.createElement(evaMembers().ui.ChatSettings.ThreadMembers,{groupId:Sa.id,actorId:evaActorId}),React.createElement("div",{className:"eva-chat-setting-section"},'+evaParentGroupRow+'),React.createElement("div",{className:"eva-chat-setting-section"},React.createElement(evaMembers().ui.ChatSettings.Row,{title:"子区名称"',
      '子区信息成员区置顶、所属群聊紧随其后');
    evaThreadBody=root.__evaCut(evaThreadBody,',React.createElement(evaMembers().ui.ChatSettings.Row,{title:"离开子区",danger:!0,onClick:()=>Nt(null)}),React.createElement(evaMembers().ui.ChatSettings.Row,{title:"删除子区",danger:!0,onClick:()=>Ia(fa)})','','子区信息底部只保留归档');
    const threadToggle=field=>`React.createElement(evaMembers().ui.ChatSettings.Row,{title:"${field==='top'?'置顶子区':'隐藏子区'}",value:React.createElement(Switch,{size:"small","aria-label":"${field==='top'?'置顶子区':'隐藏子区'}",checked:!!evaMemberStore.chatPreferences(fa.id,evaActorId).${field},onChange:checked=>evaMemberStore.setChatPreferences(fa.id,evaActorId,{${field}:checked})})})`;
    evaThreadBody=root.__evaCut(evaThreadBody,'React.createElement(Switch,{size:"small"})))),React.createElement("div",{className:"eva-chat-setting-section"},React.createElement(evaMembers().ui.ChatSettings.Row,{title:fa.status===1?','React.createElement(Switch,{size:"small"}))),'+threadToggle('top')+','+threadToggle('hidden')+',!!evaMemberStore.chatPreferences(fa.id,evaActorId).hidden&&React.createElement(\"div\",{className:\"eva-thread-mention-option\"},React.createElement(evaMembers().ui.ChatSettings.Row,{title:\"被 @ 时自动取消隐藏\",value:React.createElement(Switch,{size:\"small\",\"aria-label\":\"被 @ 时自动取消隐藏\",checked:!!evaMemberStore.chatPreferences(fa.id,evaActorId).restoreOnMention,onChange:checked=>evaMemberStore.setChatPreferences(fa.id,evaActorId,{restoreOnMention:checked})})}))),React.createElement("div",{className:"eva-chat-setting-section"},React.createElement(evaMembers().ui.ChatSettings.Row,{title:fa.status===1?','子区个人开关同组，归档单独分区');
    evaThreadBody=root.__evaCut(evaThreadBody,'React.createElement(Switch,{size:"small"})','React.createElement(Switch,{size:"small","aria-label":"子区消息免打扰",checked:evaMemberStore.conversationMuted(fa.id,evaActorId),onChange:checked=>evaMemberStore.setChatPreferences(fa.id,evaActorId,{mute:checked})})','子区免打扰与列表共用偏好');
    evaThreadBody=root.__evaCut(evaThreadBody,
      'React.createElement("div",{className:"eva-chat-setting-section"},React.createElement(evaMembers().ui.ChatSettings.Row,{title:fa.status===1?',
      'React.createElement("div",{className:"eva-chat-setting-section"},React.createElement(evaMembers().ui.ChatSettings.Row,{title:"清空聊天记录",danger:!0,onClick:()=>Modal.confirm({title:"清空聊天记录",content:"只清空你在此设备的当前子区记录，父群、其他子区和其他成员的记录不受影响。",okText:"清空",cancelText:"取消",okButtonProps:{type:"danger"},onOk:()=>evaMemberStore.setChatPreferences(fa.id,evaActorId,{clearedCount:evaAllMessages.length})})})),React.createElement("div",{className:"eva-chat-setting-section"},React.createElement(evaMembers().ui.ChatSettings.Row,{title:fa.status===1?',
      '子区只清空当前会话记录');
    source=root.__evaCut(source,evaOldInfo,
      'React.createElement("div",{className:"ch-right-panel ch-right-panel--overlay"},fa?React.createElement("aside",{className:"eva-chat-settings eva-thread-settings","aria-label":"子区信息管理"},React.createElement("header",{className:"eva-chat-settings-head"},React.createElement("button",{type:"button",onClick:()=>Dt("none"),"aria-label":"关闭子区信息"},React.createElement(X,{size:20})),React.createElement("h3",null,"子区信息")),'+evaThreadBody+'):React.createElement(evaMembers().ui.ChatSettings,{key:Sa.id+":"+evaActorId,channel:Sa,sessionInfoOnly:!!ct?.conversationOnly,onClose:()=>Dt("none"),onManageProject:evaManageProject,onClear:()=>evaMemberStore.setChatPreferences(va,evaActorId,{clearedCount:evaAllMessages.length})}))',
      'Octo group and direct chat settings adapter');
    source=root.__evaCut(source,'return React.createElement(I18nProvider,null,React.createElement("div",{className:"ch-layout"}',
      'return React.createElement(I18nProvider,null,evaMembershipProjectId&&React.createElement(evaMembers().ui.CreateGroup,{projectId:evaMembershipProjectId,visible:evaGroupCreateOpen,onClose:()=>setEvaGroupCreateOpen(false),onCreated:evaId=>{mt(evaPrevious=>evaMemberStore.channels(evaMembershipProjectId,evaActorId,evaPrevious));xt(evaId);Nt(null);Dt("none")}}),React.createElement("div",{className:"ch-layout"}', 'IM 创建群聊组件');
    cut('React.createElement("div",{className:"wk-conversationlist-item-time"},React.createElement("span",null,ci.at?getTimeStringAutoShort2(new Date(ci.at).getTime()):""))',
      'React.createElement("div",{className:"wk-conversationlist-item-time"},React.createElement("span",null,ci.at?getTimeStringAutoShort2(new Date(ci.at).getTime()):"")),evaMemberStore.conversationContext(ci.th?.id||ci.ch.id,evaActorId)&&React.createElement(LayoutGrid,{size:12,className:"wk-conv-project-icon",style:{color:window.EvaProjectAppearance.css(evaMemberStore.conversationContext(ci.th?.id||ci.ch.id,evaActorId)).accent},"aria-hidden":true})',
      '项目图标置于名称行最右');
    source=root.__evaCut(source,'ci.at?getTimeStringAutoShort2(new Date(ci.at).getTime()):""',
      'ci.at?((value)=>{const date=new Date(value),now=new Date(),today=new Date(now.getFullYear(),now.getMonth(),now.getDate()),day=new Date(date.getFullYear(),date.getMonth(),date.getDate()),days=Math.round((today-day)/86400000);if(!Number.isFinite(date.getTime()))return "";if(days===0)return date.toLocaleTimeString("zh-CN",{hour:"2-digit",minute:"2-digit",hour12:false});if(days===1)return "昨天";if(days>1&&days<7)return "周"+["日","一","二","三","四","五","六"][date.getDay()];return (date.getFullYear()===now.getFullYear()?"":date.getFullYear()+"/")+(date.getMonth()+1)+"/"+date.getDate()})(ci.at):""', '最近会话紧凑时间');
    source=root.__evaCut(source,'className:"ch-right-panel ch-right-panel--wkthread"',
      'className:"ch-right-panel ch-right-panel--wkthread ch-right-panel--overlay"',
      '子区复用聊天辅助面板覆盖布局');
    source=root.__evaCut(source,'"aria-label":"more"})))),React.createElement("div",{className:"loop-idp__body"}',
      '"aria-label":"more"}))),mt==="panel"&&React.createElement("button",{type:"button",className:"eva-preview-close","aria-label":"关闭任务详情",onClick:ut},React.createElement(X,{size:20}))),React.createElement("div",{className:"loop-idp__body"}',
      '聊天任务详情公共右侧关闭入口');
    source=root.__evaCut(source,'if(!xt)return React.createElement("div",{className:"loop-idp"},React.createElement("div",{className:"loop-idp__topbar"},React.createElement(Button,{icon:React.createElement(ArrowLeft$3,{size:16}),theme:"borderless",onClick:Qa},St("loop.detail.back")))',
      'if(!xt)return React.createElement("div",{className:mt==="panel"?"loop-idp loop-idp--panel":"loop-idp"},React.createElement("div",{className:"loop-idp__topbar"},mt==="panel"?React.createElement(React.Fragment,null,React.createElement("strong",{style:{flex:1}},"任务详情"),React.createElement("button",{type:"button",className:"eva-preview-close","aria-label":"关闭任务详情",onClick:ut},React.createElement(X,{size:20}))):React.createElement(Button,{icon:React.createElement(ArrowLeft$3,{size:16}),theme:"borderless",onClick:Qa},St("loop.detail.back")))',
      '任务详情缺失状态沿用面板关闭合同');
    // Apply demo flags once when the shared seed is created, before membership/user state adapters.
    source=root.__evaCut(source,'CHANNELS_BY_SPACE=window.__EVA_CHANNELS_BY_SPACE={',
      'CHANNELS_BY_SPACE=window.__EVA_CHANNELS_BY_SPACE=((spaces)=>{const seeds=window.__EVA_IM_DEMO.projectUnreadSeeds;const adapt=c=>({...c,unread:seeds[c.id]?.unread??0,atMe:seeds[c.id]?.atMe??false,...(c.threads?{threads:c.threads.map(adapt)}:{})});return Object.fromEntries(Object.entries(spaces).map(([id,channels])=>[id,channels.map(adapt)]))})({',
      '稀疏项目未读演示数据初始化');
    source=root.__evaCut(source,'"drive-design":CHANNELS_DRIVE_DESIGN},channelsOfSpace=',
      '"drive-design":CHANNELS_DRIVE_DESIGN}),channelsOfSpace=', '项目未读演示初始化边界');
    source=root.__evaCut(source,'channelsOfSpace=rt=>CHANNELS_BY_SPACE[rt]??[]', 'channelsOfSpace=rt=>evaMembers().store.channels(rt,evaMembers().store.actorId(),CHANNELS_BY_SPACE[rt]??[])','AI 小队消息复用项目群访问范围');
    source=root.__evaCut(source,'[evaGroupCreateOpen,setEvaGroupCreateOpen]=reactExports.useState(false);','[evaGroupCreateOpen,setEvaGroupCreateOpen]=reactExports.useState(false),[evaTransferFile,setEvaTransferFile]=reactExports.useState(null);','IM 文件转存状态');
    source=root.__evaCut(source,'evaMenuItems=ci=>{if(!ci)return[];const Zi=[','evaMenuItems=ci=>{if(!ci)return[];const Zi=[];if(ci.kind==="file"&&ci.file&&evaMemberStore.canRead(Sa.id,evaActorId))Zi.push({title:"转存到项目",icon:React.createElement(FolderPlus,{size:18}),onClick:()=>setEvaTransferFile(ci.file)});Zi.push(','IM 文件转存菜单');
    source=root.__evaCut(source,'onClick:()=>Toast.info("已进入回复")}];ci.kind===','onClick:()=>Toast.info("已进入回复")});ci.kind===','IM 文件菜单数组结束');
    source=root.__evaCut(source,'return React.createElement(I18nProvider,null,evaMembershipProjectId&&React.createElement(evaMembers().ui.CreateGroup',
      'return React.createElement(I18nProvider,null,React.createElement(evaMembers().ui.FileTransfer,{file:evaTransferFile,source:{groupId:Sa.id,groupName:Sa.name,threadId:fa?.id,threadName:fa?.name,taskId:evaTransferFile?.taskId},onClose:()=>setEvaTransferFile(null)}),evaMembershipProjectId&&React.createElement(evaMembers().ui.CreateGroup','IM 文件转存组件');
    source=root.__evaCut(source,'return{channels:[...pt,...DMS.map(mt=>({...mt,category:"scope:dm"}))',
      'return{channels:[...pt,...evaMembers().store.channels(null,evaMembers().store.actorId(),ORG_CHANNELS).map(mt=>({...mt,category:"scope:groups"})),...DMS.map(mt=>({...mt,category:"scope:dm"}))','非项目群消息数据');
    source=root.__evaCut(source,'cats:[...ut,{id:"scope:dm",name:"私聊消息"}],messages:{...CHANNEL_MESSAGES,...OWN_MESSAGES,...evaDemo.messages}',
      'cats:[...ut,{id:"scope:groups",name:"非项目群"},{id:"scope:dm",name:"私聊消息"}],messages:{...CHANNEL_MESSAGES,...OWN_MESSAGES,...evaDemo.messages}','非项目群分类');
    source=root.__evaCut(source,':evaChannelDrafts,[gt]',':ct?.channels??evaChannelDrafts,[gt]','全局消息实时读取来源');
    source=root.__evaCut(source,'cn(!1),evaMembershipProjectId?setEvaGroupCreateOpen(true):ut?(Ir(null),Qr(null),hr(!0)):pr("channel")', 'cn(!1),setEvaGroupCreateOpen(true)','统一新建群入口');
    source=root.__evaCut(source,'evaMembershipProjectId&&React.createElement(evaMembers().ui.CreateGroup','ct?.sidebarVariant!=="ai-sessions"&&React.createElement(evaMembers().ui.CreateGroup','非项目群创建组件');
    source=root.__evaCut(source,'onClose:()=>setEvaGroupCreateOpen(false),onCreated:evaId=>{mt(evaPrevious=>evaMemberStore.channels(evaMembershipProjectId,evaActorId,evaPrevious));','onClose:()=>{setEvaGroupCreateOpen(false);setEvaCreateGroupCategory(null);},onCreated:evaId=>{if(evaCreateGroupCategory)evaMemberStore.followConversation(evaId,evaActorId,evaCreateGroupCategory);mt(evaPrevious=>evaMemberStore.channels(evaMembershipProjectId,evaActorId,evaPrevious));','分类内建群后自动关注并归组');
    source=root.__evaCut(source,'Ta=reactExports.useMemo(()=>[...ca,...oa[va]??[]],[ca,va,oa])',
      'evaAllMessages=reactExports.useMemo(()=>[...ca,...evaMemberStore.messagesFor(va,evaActorId),...oa[va]??[]].sort((a,b)=>Number(!!b.fixtureId?.startsWith("project-agent-welcome:"))-Number(!!a.fixtureId?.startsWith("project-agent-welcome:"))),[ca,va,oa,evaActorId,evaMemberRevision]),[evaHideAi,setEvaHideAi]=reactExports.useState(false),Ta=evaMemberStore.visibleMessages(va,evaActorId,evaAllMessages),evaShowAiFilter=!!evaTeamGlobal,evaStreamFilter=(()=>{if(!evaShowAiFilter||!evaHideAi)return null;const evaKept=Ta.filter(evaM=>evaM.kind==="divider"||!(evaM.sender?.ai===true||evaM.sender?.identityAppearance)),evaStream=evaKept.filter((evaM,evaI)=>evaM.kind!=="divider"||(evaI<evaKept.length-1&&evaKept[evaI+1].kind!=="divider")),evaIndex=new Map();let evaPos=0;Ta.forEach((evaM,evaI)=>{if(evaStream.indexOf(evaM)>=0)evaIndex.set(evaI,evaPos++)});return{stream:evaStream,index:evaIndex}})(),evaStreamMessages=evaStreamFilter?evaStreamFilter.stream:Ta','消息记录持久化读取与 AI 发言过滤');
    source=root.__evaCut(source,'vi=(ci,Zi)=>{const Fi=new Date,','vi=(ci,Zi)=>{if(evaMemberStore.canRead(ci,evaActorId)){evaMemberStore.sendMessage(ci,evaActorId,Zi);return;}const Fi=new Date,','群消息按当前联系人身份发送');
    source=root.__evaCut(source,'mt(Ki=>Ki.map(ro=>ro.id===Sa.id?{...ro,threads:[Fi,...ro.threads]}:ro)),pa(!1)',
      'evaMemberStore.canRead(Sa.id,evaActorId)&&evaMemberStore.createThread(Fi.id,Sa.id,{...Fi,creator_name:evaMemberStore.person(evaActorId)?.name},evaActorId),mt(Ki=>Ki.map(ro=>ro.id===Sa.id?{...ro,threads:[Fi,...ro.threads]}:ro)),pa(!1)','子区注册继承关系');
    source=root.__evaCut(source,'onOk:()=>{mt(Zi=>Zi.map(Fi=>Fi.id!==Sa.id?Fi:{...Fi,threads:Fi.threads.filter(Ki=>Ki.id!==ci.id)}))','onOk:()=>{evaMemberStore.updateThread(ci.id,{deleted:true},evaActorId);mt(Zi=>Zi.map(Fi=>Fi.id!==Sa.id?Fi:{...Fi,threads:Fi.threads.filter(Ki=>Ki.id!==ci.id)}))','子区删除持久化');
    source=root.__evaCut(source,'ai=(ci,Zi,Fi)=>mt(Ki=>Ki.map(ro=>ro.id!==ci?ro:{...ro,threads:ro.threads.map(ns=>ns.id===Zi?{...ns,...Fi}:ns)}))',
      'ai=(ci,Zi,Fi)=>{if(evaMemberStore.canRead(ci,evaActorId)){evaMemberStore.updateThread(Zi,Fi,evaActorId);}mt(Ki=>Ki.map(ro=>ro.id!==ci?ro:{...ro,threads:ro.threads.map(ns=>ns.id===Zi?{...ns,...Fi}:ns)}))}','子区修改持久化');
    source=root.__evaCut(source,'React.createElement(EvaIMComposer,{placeholder:ct?.composerDisabled?"个人助理离线":Sa.chatType==="direct"?`发送给 ${Sa.name}…`:`在 ${fa?fa.name:Sa.name} 中回复…`',
      'React.createElement(EvaIMComposer,{key:evaActorId+":"+va,scopeId:evaMemberStore.canRead(Sa.id,evaActorId)?Sa.id:null,placeholder:ct?.composerDisabled?"个人助理离线":Sa.chatType==="direct"?`发送给 ${Sa.name}…`:`在 ${fa?fa.name:Sa.name} 中回复…`','输入区身份重置与提及范围');
    source=root.__evaCut(source,'React.createElement(EvaIMComposer,{placeholder:`在 ${Es.name} 中回复…`',
      'React.createElement(EvaIMComposer,{key:evaActorId+":"+Es.id,scopeId:evaMemberStore.canRead(Sa.id,evaActorId)?Sa.id:null,placeholder:`在 ${Es.name} 中回复…`','子区输入提及范围');
    source=root.__evaCut(source,'Cs=Es?[...THREAD_MESSAGES[Es.id]??[],...oa[Es.id]??[]]:[]','Cs=Es?[...(ct?.threadMessages??THREAD_MESSAGES)[Es.id]??[],...evaMemberStore.messagesFor(Es.id,evaActorId),...oa[Es.id]??[]]:[]','子区侧栏复用持久化消息');
    source=root.__evaCut(source,':ct?.channels??evaChannelDrafts,[gt]=reactExports.useState(()=>ct?.cats??[])',
      ':ct?[...ct.channels,...evaChannelDrafts.filter(evaC=>evaC.id.startsWith("dm-")&&!ct.channels.some(evaKnown=>evaKnown.id===evaC.id))]:evaChannelDrafts,gt=ct?.cats??[]','全局来源更新保留本地私聊入口');
    var legacyStart=source.indexOf('ChannelsView=({'),legacyEnd=source.indexOf('},listSkills=rt=>',legacyStart);
    if(legacyStart<0||legacyEnd<legacyStart)throw new Error('ChannelsView 边界不匹配');
    var oldChannelBody=source.slice(legacyStart,legacyEnd),channelBody=oldChannelBody;
    function cutChannelRange(start,end,label){var a=channelBody.indexOf(start),b=channelBody.indexOf(end,a);if(a<0||b<a)throw new Error(label+' 边界不匹配');channelBody=root.__evaCut(channelBody,channelBody.slice(a,b),'',label);}
    channelBody=root.__evaCut(channelBody,'ut?(Ir(null),Qr(null),hr(!0)):pr("channel")','setEvaGroupCreateOpen(true)','空列表统一创建入口');
    cutChannelRange('Ci=()=>{pr(null)', 'ii=ci=>', '移除直接添加成员的旧创建处理器');
    cutChannelRange('{t:Ea}=useI18n$1(),[Pa,Ha]', 'ui=pt.length===0?', '移除旧群创建候选人状态');
    cutChannelRange('Bi=$r==="org"', 'dl={cancel:', '移除旧群创建弹窗');
    channelBody=root.__evaCut(channelBody,')),uo,ys,ki,Ss)', ')),ki,Ss)', '移除旧弹窗渲染');
    for(var fragment of [',[sr,pr]=reactExports.useState(null)',',[mr,dr]=reactExports.useState("")',',[ur,hr]=reactExports.useState(!1)',',[$r,Ir]=reactExports.useState(null)',',[Ur,Qr]=reactExports.useState(null)'])channelBody=root.__evaCut(channelBody,fragment,'','移除旧群表单状态');
    source=root.__evaCut(source,oldChannelBody,channelBody,'统一群创建移除平行实现');
    source=root.__evaCut(source,'EvaIMComposer=({placeholder:rt,onSend:ct,initialDraft:evaInitialDraft="",onDraftChange:evaDraftChange,disabled:evaDisabled=false})=>{const[ut,pt]=reactExports.useState(evaInitialDraft)',
      'EvaIMComposer=({placeholder:rt,onSend:ct,initialDraft:evaInitialDraft="",onDraftChange:evaDraftChange,disabled:evaDisabled=false,scopeId:evaMentionScope})=>{const[evaMentionOpen,setEvaMentionOpen]=reactExports.useState(false),[evaMentionQuery,setEvaMentionQuery]=reactExports.useState(""),[evaMentionIndex,setEvaMentionIndex]=reactExports.useState(0),evaMentionRange=reactExports.useRef(null),[evaEmojiOpen,setEvaEmojiOpen]=reactExports.useState(false),evaEmojiRange=reactExports.useRef(null);const[ut,pt]=reactExports.useState(evaInitialDraft)','共享输入区提及状态');
    source=root.__evaCut(source,'return React.createElement("div",{className:"wk-messageinput-box"},React.createElement("div",{className:"wk-messageinput-card"}',
      'return React.createElement("div",{className:"wk-messageinput-box"},React.createElement(EvaEmojiPicker,{visible:evaEmojiOpen,onClose:()=>setEvaEmojiOpen(false),onChoose:evaEmoji=>{evaEmojiRange.current=evaInsertComposerEmoji(mt.current,evaEmoji,evaEmojiRange.current);const evaText=evaComposerPlainText(mt.current);pt(evaText);evaDraftChange?.(evaText)}}),evaMentionScope&&React.createElement(evaMembers().ui.MentionPicker,{scopeId:evaMentionScope,visible:evaMentionOpen,query:evaMentionQuery,activeIndex:evaMentionIndex,onActiveChange:setEvaMentionIndex,onClose:()=>setEvaMentionOpen(false),onChoose:(evaName,evaUid)=>{evaInsertComposerMention(mt.current,evaName,evaUid,evaMentionRange.current);evaMentionRange.current=null;const evaText=evaComposerPlainText(mt.current);pt(evaText);evaDraftChange?.(evaText)}}),React.createElement("div",{className:"wk-messageinput-card"}','提及选人复用输入区');
    source=root.__evaCut(source,'tabIndex:0,title:"提及","aria-label":"提及"},React.createElement(AtSign',
      'tabIndex:0,"data-eva-tooltip":"提及","aria-label":"提及",onClick:()=>{if(evaMentionScope){setEvaEmojiOpen(false);evaMentionRange.current=evaComposerMentionRange(mt.current)?.range||null;setEvaMentionQuery("");setEvaMentionIndex(0);setEvaMentionOpen(true);mt.current?.focus();}},onKeyDown:evaEvent=>{if(evaMentionScope&&(evaEvent.key==="Enter"||evaEvent.key===" ")){evaEvent.preventDefault();setEvaMentionOpen(true)}}},React.createElement(AtSign','提及按钮接入');
    source=root.__evaCut(source,'tabIndex:0,title:"表情","aria-label":"表情"},React.createElement(Smile',
      'tabIndex:0,"data-eva-tooltip":"表情","aria-label":"表情",onClick:()=>{setEvaMentionOpen(false);if(!evaEmojiOpen){const evaSel=window.getSelection();evaEmojiRange.current=(evaSel&&evaSel.rangeCount&&mt.current&&mt.current.contains(evaSel.anchorNode))?evaSel.getRangeAt(0).cloneRange():null;}setEvaEmojiOpen(evaV=>!evaV);mt.current?.focus();},onKeyDown:evaEvent=>{if(evaEvent.key==="Enter"||evaEvent.key===" "){evaEvent.preventDefault();setEvaMentionOpen(false);setEvaEmojiOpen(evaV=>!evaV)}}},React.createElement(Smile','表情按钮接入');
    source=root.__evaCut(source,'tabIndex:0,title:"添加文件","aria-label":"添加文件"},React.createElement(Paperclip$3',
      'tabIndex:0,"data-eva-tooltip":"添加文件","aria-label":"添加文件"},React.createElement(Paperclip$3','添加文件按钮接入');
    source=root.__evaCut(source,'tabIndex:0,title:"语音","aria-label":"语音"},React.createElement(Mic',
      'tabIndex:0,"data-eva-tooltip":"语音","aria-label":"语音"},React.createElement(Mic','语音按钮接入');
    source=root.__evaCut(source,'role:"button",tabIndex:0,title:"发送","aria-label":"发送",onClick:gt',
      'role:"button",tabIndex:0,"data-eva-tooltip":"发送","aria-label":"发送",onClick:gt','发送按钮接入');
    source=root.__evaCut(source,'!fa&&ct?.sidebarVariant!=="ai-sessions"&&React.createElement("span",{className:`op','!fa&&!Sa.id.startsWith("dm-")&&Sa.chatType!=="direct"&&ct?.sidebarVariant!=="ai-sessions"&&React.createElement("span",{className:`op','Hide group subzones in direct chat');
    source=root.__evaCut(source,'pt=evaMembershipProjectId?evaMemberStore.channels(evaMembershipProjectId,evaActorId,evaChannelDrafts):ct?[...ct.channels,...evaChannelDrafts.filter(evaC=>evaC.id.startsWith("dm-")&&!ct.channels.some(evaKnown=>evaKnown.id===evaC.id))]:evaChannelDrafts,gt=',
      'evaBaseChannels=evaMembershipProjectId?evaMemberStore.channels(evaMembershipProjectId,evaActorId,evaChannelDrafts):ct?[...ct.channels,...evaChannelDrafts.filter(evaC=>evaC.id.startsWith("dm-")&&!ct.channels.some(evaKnown=>evaKnown.id===evaC.id))]:evaChannelDrafts,pt=evaBaseChannels.map(evaC=>{const evaP=evaMemberStore.chatPreferences(evaC.id,evaActorId),evaS=evaMemberStore.chatSettings(evaC.id);return {...evaC,...evaS,name:evaS.name||evaC.name,identityAvatarUrl:evaS.avatar||evaC.identityAvatarUrl,unread:evaMemberStore.conversationMuted(evaC.id,evaActorId)?0:evaMemberStore.conversationUnread(evaC.id,evaActorId,evaC.unread),atMe:evaP.readMessageCount===undefined&&evaC.atMe,threads:(evaC.threads||[]).map(t=>({...t,unread:evaMemberStore.conversationMuted(t.id,evaActorId)?0:evaMemberStore.conversationUnread(t.id,evaActorId,t.unread||0)})),evaPinned:!!evaP.top}}).sort((a,b)=>Number(b.id.startsWith("all:"))-Number(a.id.startsWith("all:"))||Number(b.evaPinned)-Number(a.evaPinned)),gt=', 'Project shared conversation preferences');
    cut('!fa&&ct?.sidebarVariant!=="ai-sessions"&&Zi.push', '!fa&&!Sa.id.startsWith("dm-")&&Sa.chatType!=="direct"&&ct?.sidebarVariant!=="ai-sessions"&&Zi.push', 'group-only message subzone menu');

    source=root.__evaCut(source,
      '[evaGroupCreateOpen,setEvaGroupCreateOpen]=reactExports.useState(false),[evaTransferFile,setEvaTransferFile]=reactExports.useState(null);',
      '[evaGroupCreateOpen,setEvaGroupCreateOpen]=reactExports.useState(false),[evaTransferFile,setEvaTransferFile]=reactExports.useState(null),[evaInlineProjectId,setEvaInlineProjectId]=reactExports.useState(null),[evaInlineTaskRequest,setEvaInlineTaskRequest]=reactExports.useState(null);',
      '消息内联项目状态');
    source=root.__evaCut(source,
      'evaMemberReset=reactExports.useEffect(()=>{Nt(null);Dt("none");Qt(null);Ht(null);setEvaGroupCreateOpen(false);},[evaMembershipProjectId,evaActorId]),evaSelectedChannel=',
      'evaMemberReset=reactExports.useEffect(()=>{Nt(null);Dt("none");Qt(null);Ht(null);setEvaGroupCreateOpen(false);setEvaInlineProjectId(null);setEvaInlineTaskRequest(null);},[evaMembershipProjectId,evaActorId]),evaInlineProjectEffect=reactExports.useEffect(()=>{const evaOpenInlineProject=evaEvent=>{const evaProjectId=evaEvent.detail?.projectId;if(evaProjectId){WKApp$1.routeRight.popAll();setEvaInlineProjectId(evaProjectId);setEvaInlineTaskRequest(evaEvent.detail?.taskIdentifier?{projectId:evaProjectId,identifier:evaEvent.detail.taskIdentifier}:null)}};window.addEventListener("eva:open-inline-project",evaOpenInlineProject);return()=>window.removeEventListener("eva:open-inline-project",evaOpenInlineProject)},[]),evaSelectedChannel=',
      '消息内联项目事件');
    source=root.__evaCut(source,
      'onClick:ns=>{ns.stopPropagation(),window.__evaOpenWorkspaceFromTree?.(ci.id.slice(6),"tasks")}',
      'onClick:ns=>{ns.stopPropagation(),window.dispatchEvent(new CustomEvent("eva:open-inline-project",{detail:{projectId:ci.id.slice(6)}}))}',
      '项目入口内联打开');
    source=root.__evaCut(source,
      '!ui&&Vs)),ki,Ss)',
      '!ui&&Vs),evaInlineProjectId&&React.createElement(EvaInlineProjectPanel,{projectId:evaInlineProjectId,taskRequest:evaInlineTaskRequest})),ki,Ss)',
      '消息内容区内联项目面板');

    // Normalize at the shared IM tokenizer: the @ prefix is part of the mention entity.
    cut('function segmentText(rt,ct,ut){if(!ct.length&&!ut.length)',
      'function segmentText(rt,ct,ut){ct=Array.from(new Map((ct||[]).filter(m=>typeof m?.name==="string"&&m.name.replace(/^@+/,"").trim()).map(m=>{const name="@"+m.name.replace(/^@+/,"");return[name,{...m,name}]})).values());ut=(ut||[]).filter(e=>typeof e?.key==="string"&&e.key.length>0);if(!ct.length&&!ut.length)',
      '统一 IM 提及包含 @ 前缀并过滤空实体');
    cut('function getMentionRenderState(rt){return rt==="all"||rt==="channel"?{className:"mention-highlight",interactive:!1}', 'function getMentionRenderState(rt){return rt==="all"||rt==="channel"?{className:"mention-entity",interactive:!1}', '所有人提及沿用成员提及样式');
    // Restore the historical message search while retaining the shared member picker.
    cut('ii=ci=>{const Zi=SENDERS[ci];if(!Zi)return;Fa(""),ir("recent");const Fi=pt.find(ro=>ro.members===2&&ro.name===Zi.name);if(Fi){La(Fi.id);return}const Ki={id:`dm-${ci}`,name:Zi.name,color:Zi.color,unread:0,members:2,category:NO_CAT,lastAt:new Date().toISOString(),threads:[]};mt(ro=>[...ro,Ki]),La(Ki.id)}',
      'ii=ci=>{const id=evaMemberStore.openDirect(evaActorId,ci);Fa("");La(id)}', '搜索联系人沿用持久化私聊');
    cut('searchPeople(ci).filter(Zi=>Zi.uid!==ME&&!Zi.ai).slice(0,6)',
      'evaMemberStore.people().filter(p=>p.id!==evaActorId&&p.name.includes(ci)).slice(0,6).map(p=>({...p,uid:p.id}))', '搜索仅展示当前有效联系人身份');
    cut('src:avatarUri(ci.uid??ci.name,ci.color),alt:""}),React.createElement("span",{className:"nm"},ci.name),React.createElement("span",{className:"ds"},ci.dept,ci.title?` · ${ci.title}`:""))',
      'src:window.EvaAvatar.personUri(ci.uid),alt:""}),React.createElement("span",{className:"nm"},ci.name))', '搜索结果复用账号头像并保持无组织架构');
    cut('Vs=Mt==="none"?null:Mt==="threads"?', 'Vs=Mt==="tasks"&&evaCanOpenProjectTasks?React.createElement("div",{className:"ch-right-panel ch-right-panel--overlay"},React.createElement(EvaChatTaskList,{projectId:evaTaskProjectId,conversationId:fa?.id||Sa.id,messages:evaAllMessages,onClose:()=>Dt("none"),onCreate:()=>setEvaTaskContext({projectId:evaTaskProjectId,groupId:evaTaskGroupId,channelId:Sa.id,conversationId:fa?.id||Sa.id})})):Mt==="none"?null:Mt==="threads"?', 'chat task panel');
    // Loop belongs to the parent project, never to a direct conversation or a
    // name-matched local task list. Subzones inherit their parent group's scope.
    cut('const evaMemberStore=evaMembers().store,evaMemberRevision=',
      'const [evaTaskContext,setEvaTaskContext]=reactExports.useState(null),evaMemberStore=evaMembers().store,evaMemberRevision=', 'IM project task native navigation');
    cut('Sa={...evaSelectedChannel,...evaMemberStore.chatSettings(evaSelectedChannel.id)},',
      'Sa={...evaSelectedChannel,...evaMemberStore.chatSettings(evaSelectedChannel.id)},evaTaskOwnership=evaMemberStore.conversationContext(Sa.id,evaActorId),evaTaskGroupId=evaTaskOwnership?.groupId||Sa.id,evaTaskProjectId=Sa.chatType!=="direct"&&!Sa.id.startsWith("dm-")&&!ct?.conversationOnly&&evaTaskOwnership?.projectId,evaCanOpenProjectTasks=!!evaTaskProjectId&&evaMemberStore.canRead(evaTaskGroupId,evaActorId)&&evaMemberStore.canRead(evaTaskProjectId,evaActorId),', 'IM Loop project ownership and permissions');
    cut('React.createElement("span",{className:"ops"},!fa&&!Sa.id.startsWith("dm-")',
      'React.createElement("span",{className:"ops"},evaCanOpenProjectTasks&&React.createElement("span",{className:"op",role:"button",tabIndex:0,"data-eva-tooltip":"聊天任务",onKeyDown:e=>{if(e.key==="Enter"||e.key===" "){e.preventDefault();e.currentTarget.click();}},"aria-label":"查看聊天任务",onClick:()=>{if(evaMemberStore.canRead(evaTaskGroupId,evaActorId)&&evaMemberStore.canRead(evaTaskProjectId,evaActorId))Dt(Mt==="tasks"?"none":"tasks")}},React.createElement(ClipboardList,{size:20,color:"currentColor"})),evaCanOpenProjectTasks&&evaTaskContext?.channelId===Sa.id&&React.createElement(CreateIssueModal,{key:Sa.id,visible:true,projectId:evaTaskContext.projectId,conversationId:evaTaskContext.conversationId,canCreate:()=>evaMemberStore.canRead(evaTaskContext.groupId,evaActorId)&&evaMemberStore.canRead(evaTaskContext.projectId,evaActorId),onClose:()=>setEvaTaskContext(null),onCreated:issue=>{setEvaTaskContext(null);Toast.success("任务 "+issue.identifier+" 已创建");}}),!fa&&!Sa.id.startsWith("dm-")', 'IM shared project Loop task entry');
    cut('fa=Pt?Sa.threads.find(ci=>ci.id===Pt)??null:null',
      'fa=(ct?.selectedThreadId??Pt)?Sa.threads.find(ci=>ci.id===(ct?.selectedThreadId??Pt))??null:null', 'AI selected topic uses Octo thread state');
    cut('fa?React.createElement("div",{className:"wk-chat-conversation-header-channel-thread-icon"}',
      'fa&&ct?.presentation!=="ai-direct"?React.createElement("div",{className:"wk-chat-conversation-header-channel-thread-icon"}', 'AI topic keeps identity avatar');
    cut('React.createElement("div",{className:"wk-chat-conversation-header-channel-avatar"},fa&&ct?.presentation!=="ai-direct"?',
      'React.createElement("div",{className:"wk-chat-conversation-header-channel-avatar"+(!fa&&Sa.chatType!=="direct"&&!Sa.id.startsWith("dm-")||fa&&ct?.presentation!=="ai-direct"?" is-settings-trigger":""),...(!fa&&Sa.chatType!=="direct"&&!Sa.id.startsWith("dm-")||fa&&ct?.presentation!=="ai-direct"?{role:"button",tabIndex:0,title:fa?"子区信息":"聊天信息","aria-label":fa?"打开子区信息":"打开聊天信息",onClick:()=>Dt(value=>value==="info"?"none":"info"),onKeyDown:event=>{if(event.key==="Enter"||event.key===" "){event.preventDefault();Dt(value=>value==="info"?"none":"info")}}}:{})},fa&&ct?.presentation!=="ai-direct"?', 'avatar opens settings of the current level');
    cut('fa?React.createElement("span",{className:"wk-chat-conversation-header-channel-info-name wk-chat-conversation-header-channel-info-name--thread"}',
      'fa&&ct?.presentation!=="ai-direct"?React.createElement("span",{className:"wk-chat-conversation-header-channel-info-name wk-chat-conversation-header-channel-info-name--thread"}', 'AI topic keeps direct title');
    cut('title:fa?"子区信息":"聊天信息"', 'title:fa&&ct?.presentation!=="ai-direct"?"子区信息":"聊天信息"', 'AI direct info label');
    cut('className:"ch-right-panel ch-right-panel--overlay"},fa?React.createElement',
      'className:"ch-right-panel ch-right-panel--overlay"},fa&&ct?.presentation!=="ai-direct"?React.createElement', 'AI topics reuse direct chat settings');
    cut('channel:Sa,sessionInfoOnly:!!ct?.conversationOnly',
      'channel:ct?.presentation==="ai-direct"?{...Sa,id:va,chatType:"direct"}:Sa,conversationActions:ct?.conversationActions,fixedGroupActions:ct?.fixedGroupActions,sessionInfoOnly:!!ct?.conversationOnly,projectScoped:!!evaMembershipProjectId&&evaMembershipProjectId===evaTaskProjectId', 'AI settings topic identity and actions');
    // Octo directWithName copy applies to every IM target; AI topics display the AI identity.
    cut('placeholder:ct?.composerDisabled?"个人助理离线":Sa.chatType==="direct"?`发送给 ${Sa.name}…`:`在 ${fa?fa.name:Sa.name} 中回复…`',
      'placeholder:evaIMPlaceholder(ct?.presentation==="ai-direct"?Sa.name:(fa?.name??Sa.name))', 'Unified recipient placeholder');
    cut('placeholder:`在 ${Es.name} 中回复…`',
      'placeholder:evaIMPlaceholder(Es.name)', 'Thread side composer recipient placeholder');
    // Contact identity navigation shares the existing IM patch registry entry.
  cut('const{search:evaMessageSearch}=useLocation(),evaMessageMode=', 'const{search:evaMessageSearch,key:evaContactRequestKey}=useLocation(),evaMessageMode=', '身份卡导航请求');
  cut('rt=reactExports.useMemo(()=>messageSource(evaMessageMode),[evaMessageMode,evaLiveMemberRevision])', 'rt=reactExports.useMemo(()=>({...messageSource(evaMessageMode),openChannelId:new URLSearchParams(evaMessageSearch).get("evaDM"),openMessageId:new URLSearchParams(evaMessageSearch).get("evaMessage"),openThreadId:new URLSearchParams(evaMessageSearch).get("evaThread"),openRequestKey:evaContactRequestKey}),[evaMessageMode,evaLiveMemberRevision,evaMessageSearch,evaContactRequestKey])', '私聊路由数据');
  cut('...DMS.map(mt=>({...mt,category:"scope:dm"}))', '...(evaMembers().store.actorId()==="u-wangyilin"?DMS:[]).filter(mt=>!evaMembers().store.directChannels(evaMembers().store.actorId()).some(c=>c.id===mt.id)).map(mt=>({...mt,personId:"u-"+mt.id.slice(3),identityAvatarUrl:window.EvaAvatar.personUri("u-"+mt.id.slice(3)),chatType:"direct",category:"scope:dm"})),...evaMembers().store.directChannels(evaMembers().store.actorId()).map(mt=>({...mt,category:"scope:dm"}))', '私聊稳定身份索引');
  cut('messages:{...CHANNEL_MESSAGES,...OWN_MESSAGES,...evaDemo.messages}', 'messages:evaConversationMessages({...CHANNEL_MESSAGES,...OWN_MESSAGES,...evaDemo.messages})', '私聊业务消息读取与附件示例');
  cut('const [evaTaskContext,setEvaTaskContext]=reactExports.useState(null),evaMemberStore=', 'const [evaIdentityProfile,setEvaIdentityProfile]=reactExports.useState(null),[evaTaskContext,setEvaTaskContext]=reactExports.useState(null),evaMemberStore=', '会话资料状态所有者');
  cut('vi=(ci,Zi)=>{if(evaMemberStore.canRead(ci,evaActorId))', 'vi=(ci,Zi)=>{if(ci.startsWith("dm-")){const target=pt.find(c=>c.id===ci)?.personId;if(target){const id=evaMemberStore.openDirect(evaActorId,target);evaMemberStore.sendDirect(id,evaActorId,Zi);return;}}if(evaMemberStore.canRead(ci,evaActorId))', '联系人私聊持久化发送');
  cut('evaOpenEffect=reactExports.useEffect(()=>{const evaOpen=', 'evaContactOpenEffect=reactExports.useEffect(()=>{if(ct?.openChannelId&&pt.some(c=>c.id===ct.openChannelId)){const group=pt.find(c=>c.id===ct.openChannelId);if(ct.openThreadId&&group.threads.some(t=>t.id===ct.openThreadId&&!t.deleted)){Za(group.id,ct.openThreadId);}else La(ct.openChannelId);ir("recent");}},[ct?.openChannelId,ct?.openRequestKey]),evaOpenEffect=reactExports.useEffect(()=>{const evaOpen=', '私聊路由选择');
  cut('return React.createElement(I18nProvider,null,React.createElement(evaMembers().ui.FileTransfer', 'return React.createElement(I18nProvider,null,React.createElement(evaMembers().ui.IdentityCard,{identity:evaIdentityProfile,onClose:()=>setEvaIdentityProfile(null)}),React.createElement(evaMembers().ui.FileTransfer', '消息头像统一身份卡');
  cut('React.createElement(TextContent,{content:ci.text??"",mentions:ci.mentions??[]})',
    'React.createElement(TextContent,{content:ci.text??"",mentions:ci.mentions??[],onMentionClick:uid=>{if(uid&&uid!=="all"&&uid!=="channel")setEvaIdentityProfile(uid)}})', '消息正文提及复用统一身份资料卡');
  for(const continuation of ['!1','ro'])cut('...rowProps(ci,'+continuation+'),onContextMenu:', '...rowProps(ci,'+continuation+'),onAvatarClick:()=>setEvaIdentityProfile(ci.sender),onSenderNameClick:()=>setEvaIdentityProfile(ci.sender),onContextMenu:', '消息身份点击 '+continuation);
    cut('initialDraft:ct?.initialDraft,onDraftChange:ct?.onDraftChange', 'initialDraft:Sa.personId?evaMemberStore.directDraft(Sa.id,evaActorId):ct?.initialDraft,onDraftChange:Sa.personId?text=>evaMemberStore.setDirectDraft(evaMemberStore.openDirect(evaActorId,Sa.personId),evaActorId,text):ct?.onDraftChange', '私聊草稿业务隔离');
    cut('setEvaGroupCreateOpen(false);setEvaInlineProjectId(null);setEvaInlineTaskRequest(null);},[evaMembershipProjectId,evaActorId])', 'setEvaGroupCreateOpen(false);setEvaInlineProjectId(null);setEvaInlineTaskRequest(null);setEvaIdentityProfile(null);},[evaMembershipProjectId,evaActorId])', '身份切换关闭资料卡');
    cut(':ct?[...ct.channels,...evaChannelDrafts.filter(evaC=>evaC.id.startsWith("dm-")&&!ct.channels.some(evaKnown=>evaKnown.id===evaC.id))]:evaChannelDrafts', ':ct?ct.channels:evaChannelDrafts', '私聊仅使用当前账号业务来源');
    cut('ChannelsView,{key:evaMessageMode,source:rt', 'ChannelsView,{key:evaMessageMode+":"+evaLiveMemberStore.actorId(),source:rt', '切换账号重置内部会话身份');
    cut('className:"ch-cat-gear",title:"新建"', 'className:"ch-cat-gear eva-message-invite",title:"新建群聊","aria-label":"新建群聊"', '恢复顶部拉人图标语义');
    // The follow/recent switch now belongs to ChannelsView. No DOM controller.
    cut('className:"ch-list__scroll"},wi,Ai,',
      'className:"ch-list__scroll"},wi,ut&&!ct?.conversationOnly?(Cn==="recent"?Aa:React.createElement(EvaFollowList,{store:evaMemberStore,actorId:evaActorId,categories:evaFollowCategories,channels:pt},Ai)):Ai,', 'React 关注最近统一列表');
    cut('React.createElement("div",{className:"ch-list__scroll"}',
      'ut&&!ct?.conversationOnly&&React.createElement("div",{className:"wk-sidebar-tabbar","data-eva-project-recent-switcher":true},React.createElement("div",{className:"wk-sidebar-tabbar__container"},["follow","recent"].map(mode=>React.createElement("button",{key:mode,type:"button",className:"wk-sidebar-tabbar__btn"+(Cn===mode?" wk-sidebar-tabbar__btn--active":""),"aria-pressed":Cn===mode,onClick:()=>ir(mode)},React.createElement("span",{className:"wk-sidebar-tabbar__label"},mode==="follow"?"关注":"最近"))))),React.createElement(EvaOverlayListScroll,{enabled:ut&&!ct?.conversationOnly,className:"ch-list__scroll"}', '关注最近 React 入口');
    cut('threadsExpanded:evaThreadsExpanded}){return React.createElement("div",{className:classNames("wk-conv-compact-item"',
      'threadsExpanded:evaThreadsExpanded,dragHandleProps:evaDragHandleProps,railMenu:evaRailMenu}){return React.createElement("div",{className:classNames("wk-conv-compact-item"', '关注手柄属性');
    const handleStart=source.indexOf('!pt&&React.createElement("span",{className:"wk-conv-compact-drag-handle"'),handleEnd=source.indexOf(',React.createElement("span",{className:"wk-conv-compact-icon"}',handleStart);
    if(handleStart<0||handleEnd<0)throw new Error('Octo compact drag handle boundary changed');
    cut(source.slice(handleStart,handleEnd),'!pt&&evaDragHandleProps&&React.createElement("button",{type:"button",className:"wk-conv-compact-drag-handle",...evaDragHandleProps,onClick:e=>e.stopPropagation()},React.createElement(EvaFollowGrip))','Octo 六点手柄');
    cut('return React.createElement(React.Fragment,{key:ci.id},React.createElement(ConvCompactItem',
      'return React.createElement(EvaFollowChannel,{key:ci.id,id:ci.id,categoryId:ci.category,enabled:ut&&!ct?.conversationOnly},React.createElement(ConvCompactItem', '父群和子区整体拖动');
    cut('Ai=ut?gt.map(ci=>{const Zi=Va.trim(),Fi=pt.filter(ns=>ns.category===ci.id).filter(',
      'evaFollowCategories=evaMemberStore.followOrder(evaActorId,"categories",gt.filter(c=>c.id==="scope:other"||evaMemberStore.pinnedProjects(evaActorId).includes(c.id.slice(6)))),Ai=ut?evaFollowCategories.map(ci=>{const Zi=Va.trim(),Fi=evaMemberStore.followOrder(evaActorId,"channels:"+ci.id,pt.filter(ns=>ns.category===ci.id&&evaMemberStore.conversationFollowed(ns.id,evaActorId))).filter(', 'pin 推导关注并保留手工排序');
    cut('return React.createElement(Card,{key:ci.id,className:`eva-space-card-foundation',
      'return React.createElement(EvaFollowCategory,{key:ci.id,categoryId:ci.id,sortableItems:Fi.map(c=>c.id),className:`eva-space-card-foundation', 'Octo 分组展示');
    // Group memberships remain the access authority; pin never grants membership.
    cut('category:"scope:groups"','category:"scope:other"','非项目群统一分组');
    cut('category:"scope:demo"','category:"scope:other"','无项目演示会话统一分组');
    cut('category:"scope:dm"','category:"scope:other"','历史私聊统一分组');
    cut('category:"scope:dm"','category:"scope:other"','新增私聊统一分组');
    cut('{id:"scope:groups",name:"非项目群"},{id:"scope:dm",name:"私聊消息"}',
      '{id:"scope:other",name:"其他会话"}', '唯一其他会话分类');
    cut('xt(evaId);Nt(null);Dt("none")','xt(evaId);Nt(null);Dt("none");ir("recent");setEvaInlineProjectId(null)', '建群后显示新会话');
    cut('const id=evaMemberStore.openDirect(evaActorId,ci);Fa("");La(id)',
      'const id=evaMemberStore.openDirect(evaActorId,ci);Fa("");ir("recent");La(id)', '搜索私聊显示最近');
    cut('ut&&Cn==="follow"&&Qa===0&&gt.every(ci=>pt.every(Zi=>Zi.category!==ci.id))',
      'ut&&Cn==="follow"&&evaFollowCategories.length===0', '关注空状态使用真实分类');
    cut('.sort((Fi,Ki)=>Ki.at.localeCompare(Fi.at))},[pt,Va,oa,ct])',
      '.sort((Fi,Ki)=>(ut&&!ct?.conversationOnly&&!Va.trim()?Number(!!evaMemberStore.chatPreferences(Ki.th?.id||Ki.ch.id,evaActorId).top)-Number(!!evaMemberStore.chatPreferences(Fi.th?.id||Fi.ch.id,evaActorId).top):0)||Ki.at.localeCompare(Fi.at))},[pt,Va,oa,ct])', '最近会话先按自身置顶状态排序，同组内按时间排序');
    // Recent-only pin presentation derives from the existing per-account preference.
    cut('classNames("wk-conversationlist-item",Zi&&"wk-conversationlist-item-selected"',
      'classNames("wk-conversationlist-item",ut&&!ct?.conversationOnly&&Cn==="recent"&&!Va.trim()&&evaMemberStore.chatPreferences(ci.th?.id||ci.ch.id,evaActorId).top&&"eva-recent-conversation-pinned",Zi&&"wk-conversationlist-item-selected"', '最近所有置顶会话统一灰底，不包含搜索');
    cut('name:Fi.name,at:Fi.lastAt??""','name:Fi.name,crumb:evaMemberStore.conversationContext(Fi.id,evaActorId)?.path,at:Fi.lastAt??""','最近项目群归属');
    cut('crumb:Fi.name,at:Ki.updated_at','crumb:evaMemberStore.conversationContext(Ki.id,evaActorId)?.path||Fi.name,at:Ki.updated_at','最近子区项目路径');
    cut(',Fi&&React.createElement("div",{className:"wk-conv-group-hash-badge"},React.createElement(GroupIcon,{size:10}))','', '最近列表群头像不显示子区角标');
    cut('ci.crumb&&React.createElement("div",{className:"wk-conv-breadcrumb"},ci.crumb),','','最近行取消独立项目行');
    cut('React.createElement("h3",null,ci.isThread&&React.createElement(ThreadIcon,{size:13,className:"wk-conv-channel-icon wk-conv-thread-icon"}),ci.name)',
      'React.createElement("h3",ci.crumb?{"data-eva-tooltip":ci.crumb+" / "+ci.name}:null,ci.isThread&&React.createElement(ThreadIcon,{size:13,className:"wk-conv-channel-icon wk-conv-thread-icon"}),ci.name)',
      '最近行群名保留完整路径提示');
    cut('Cn==="recent"?Aa:React.createElement(EvaFollowList','Cn==="recent"||Va.trim()?Aa:React.createElement(EvaFollowList','跨项目搜索统一归属行');
    cut('React.createElement("span",{className:"t"},Sa.name))),ut&&!fa&&(ct?.scopeNameOf[Sa.id]??Kr[Sa.id])&&React.createElement("span",{className:"ch-head__scope"},ct?.scopeNameOf[Sa.id]??Kr[Sa.id]),',
      'React.createElement("span",{className:"t"},Sa.name))),','聊天标题独立成行');
    cut('Wa=ci=>{const Zi=[...(ct?.messages??CHANNEL_MESSAGES)[ci]??[],...oa[ci]??[]];',
      'Wa=ci=>{const Zi=evaMemberStore.visibleMessages(ci,evaActorId,[...(ct?.messages??CHANNEL_MESSAGES)[ci]??[],...evaMemberStore.messagesFor(ci,evaActorId),...oa[ci]??[]].sort((a,b)=>Number(!!b.fixtureId?.startsWith("project-agent-welcome:"))-Number(!!a.fixtureId?.startsWith("project-agent-welcome:"))));','会话摘要读取与聊天流相同的成员消息');
    cut('preview:Ki.last_message_sender_name?`${Ki.last_message_sender_name}: ${Ki.last_message_content??""}`:""',
      'preview:Wa(Ki.id)||(Ki.last_message_sender_name?`${Ki.last_message_sender_name}: ${Ki.last_message_content??""}`:"")','最近子区摘要读取真实消息');
    cut('},[pt,Va,oa,ct]).map(ci=>','},[pt,Va,oa,ct,evaMemberRevision,evaActorId]).map(ci=>','成员消息更新时刷新最近摘要');
    cut('scopeId:evaMentionScope})=>', 'scopeId:evaMentionScope,mentionMembers:evaMentionMembers})=>', '固定群成员传入共享输入区');
    cut('scopeId:evaMentionScope,visible:evaMentionOpen', 'scopeId:evaMentionScope,members:evaMentionMembers,visible:evaMentionOpen', '固定群成员传入共享提及选择器');
    cut('key:evaActorId+":"+va,scopeId:evaMemberStore.canRead(Sa.id,evaActorId)?Sa.id:null,placeholder:',
      'key:evaActorId+":"+va,mentionMembers:Sa.fixedMembers,scopeId:Sa.fixedMembers?Sa.id:evaMemberStore.canRead(Sa.id,evaActorId)?Sa.id:null,placeholder:', '固定群提及成员范围');
    cut('key:evaActorId+":"+Es.id,scopeId:evaMemberStore.canRead(Sa.id,evaActorId)?Sa.id:null,placeholder:',
      'key:evaActorId+":"+Es.id,mentionMembers:Sa.fixedMembers,scopeId:Sa.fixedMembers?Sa.id:evaMemberStore.canRead(Sa.id,evaActorId)?Sa.id:null,placeholder:', '固定群侧面子区提及成员');
    cut('sessionInfoOnly:!!ct?.conversationOnly', 'sessionInfoOnly:ct?.presentation==="ai-direct"', '固定群沿用群聊信息');
    cut('evaMemberStore.canRead(Sa.id,evaActorId)&&evaMemberStore.createThread(Fi.id,Sa.id,{...Fi,creator_name:evaMemberStore.person(evaActorId)?.name},evaActorId)',
      'ct?.onCreateThread?ct.onCreateThread(Fi):evaMemberStore.canRead(Sa.id,evaActorId)&&evaMemberStore.createThread(Fi.id,Sa.id,{...Fi,creator_name:evaMemberStore.person(evaActorId)?.name},evaActorId)', '固定 AI 小队群复用创建子区表单');
    cut('evaMemberStore.updateThread(ci.id,{deleted:true},evaActorId);', 'ct?.onUpdateThread?ct.onUpdateThread(ci.id,{deleted:true}):evaMemberStore.updateThread(ci.id,{deleted:true},evaActorId);', '固定 AI 小队群删除子区');
    cut('ai=(ci,Zi,Fi)=>{if(evaMemberStore.canRead(ci,evaActorId))', 'ai=(ci,Zi,Fi)=>{if(ct?.onUpdateThread){ct.onUpdateThread(Zi,Fi);return;}if(evaMemberStore.canRead(ci,evaActorId))', '固定 AI 小队群修改子区');
    cut('const sent=ct.onSend(Zi);', 'const sent=ct.onSend(Zi,va);', '主消息流按子区发送');
    cut('vi=(ci,Zi)=>{if(ci.startsWith("dm-"))', 'vi=(ci,Zi)=>{if(ct?.onSend){ct.onSend(Zi,ci);return;}if(ci.startsWith("dm-"))', '侧面子区消息按频道发送');
    cut('initialDraft:Sa.personId?', 'initialDraft:ct?.getDraft?ct.getDraft(va):Sa.personId?', '固定群主消息流草稿隔离');
    cut(':ct?.onDraftChange,disabled:', ':ct?.getDraft?text=>ct.onDraftChange(text,va):ct?.onDraftChange,disabled:', '固定群草稿写入当前频道');
    cut('placeholder:evaIMPlaceholder(Es.name),onSend:ci=>vi(Es.id,ci)', 'placeholder:evaIMPlaceholder(Es.name),initialDraft:ct?.getDraft?.(Es.id),onDraftChange:ct?.getDraft?text=>ct.onDraftChange(text,Es.id):undefined,onSend:ci=>vi(Es.id,ci)', '侧面子区草稿隔离');
    cut('Za=(ci,Zi)=>{setEvaInlineProjectId(null),xt(ci),Nt(Zi)', 'Za=(ci,Zi)=>{ct?.onSelectThread?.(Zi);setEvaInlineProjectId(null),xt(ci),Nt(Zi)', '固定群中栏子区选择同步');
    cut('[evaGroupCreateOpen,setEvaGroupCreateOpen]=reactExports.useState(false),', '[evaCategoryEditor,setEvaCategoryEditor]=reactExports.useState(null),[evaCategoryToDelete,setEvaCategoryToDelete]=reactExports.useState(null),[evaCreateGroupCategory,setEvaCreateGroupCategory]=reactExports.useState(null),[evaGroupCreateOpen,setEvaGroupCreateOpen]=reactExports.useState(false),', '自定义分类菜单状态');
    cut('return {...evaC,...evaS,name:', 'return {...evaC,...evaS,category:ct&&!ct.conversationOnly?evaMemberStore.conversationCategory(evaActorId,evaC):evaC.category,name:', '非项目会话分类来源');
    cut('gt=ct?.cats??[]', 'gt=ct&&!ct.conversationOnly?[...(ct.cats||[]).filter(c=>c.id.startsWith("space:")),...evaMemberStore.conversationCategories(evaActorId)]:ct?.cats??[]', '用户分类列表');
    cut('c.id==="scope:other"||evaMemberStore.pinnedProjects', 'c.id.startsWith("scope:")||evaMemberStore.pinnedProjects', '自定义分类在关注展示');
    cut('React.createElement(Dropdown.Item,{onClick:()=>{cn(!1),setEvaGroupCreateOpen(true)}},"新建群聊")', 'React.createElement(Dropdown.Item,{onClick:()=>{cn(!1),setEvaGroupCreateOpen(true)}},"新建群聊"),React.createElement(Dropdown.Item,{onClick:()=>{cn(false);setEvaCategoryEditor({});}},"新建关注分组")', '消息加号创建分组');
    cut('title:"新建群聊","aria-label":"新建群聊"', 'title:"新建","aria-label":"新建"', '消息加号多操作语义');
    cut('return React.createElement(I18nProvider,null,', 'return React.createElement(I18nProvider,null,evaCategoryEditor&&React.createElement(EvaConversationCategoryEditor,{key:evaActorId+":"+(evaCategoryEditor.id||"new"),store:evaMemberStore,actorId:evaActorId,record:evaCategoryEditor,channels:pt,onClose:()=>setEvaCategoryEditor(null),onSaved:()=>{setEvaCategoryEditor(null);Fa("");ir("follow");}}),evaCategoryToDelete&&React.createElement(Modal,{visible:true,title:"删除分组",className:"eva-conversation-category-delete",width:420,onCancel:()=>setEvaCategoryToDelete(null),onOk:()=>{try{evaMemberStore.deleteConversationCategory(evaActorId,evaCategoryToDelete.id);setEvaCategoryToDelete(null);}catch(error){Toast.error(error.message||"删除失败");}},okText:"删除",cancelText:"取消",okButtonProps:{type:"danger"}},React.createElement("p",null,"确定删除「"+evaCategoryToDelete.name+"」吗？分组下的所有会话将取消关注。")),', '分类编辑与删除弹窗');
    cut('projectId:ci.id.slice(6)}}))}}):null,headerStyle:', 'projectId:ci.id.slice(6)}}))}}):React.createElement(Dropdown,{trigger:"click",position:"bottomRight",clickToHide:true,render:React.createElement(Dropdown.Menu,null,evaCategoryRailMenus({category:ci,onCreateGroup:id=>{setEvaCreateGroupCategory(id);setEvaGroupCreateOpen(true);},onRename:setEvaCategoryEditor,onDelete:setEvaCategoryToDelete}).map((item,index)=>item.separator?React.createElement(Dropdown.Divider,{key:index}):React.createElement(Dropdown.Item,{key:index,type:item.danger?"danger":undefined,icon:item.icon,onClick:item.onClick},item.title)))},React.createElement("span",{className:"eva-category-dropdown-anchor"},React.createElement(Button,{theme:"borderless",type:"tertiary",size:"small",icon:React.createElement(EllipsisIcon,{size:16}),"aria-label":"分组操作 "+ci.name}))),headerStyle:', '自定义分组三点使用 Semi Dropdown');
    cut('setEvaIdentityProfile(null);},[evaMembershipProjectId,evaActorId])', 'setEvaIdentityProfile(null);setEvaCategoryEditor(null);setEvaCategoryToDelete(null);setEvaCreateGroupCategory(null);},[evaMembershipProjectId,evaActorId])', '分类表单身份重置');
    cut('React.createElement(Dropdown,{trigger:"click",position:"bottomLeft",visible:sn,onVisibleChange:cn,render:React.createElement(Dropdown.Menu,null,React.createElement(Dropdown.Item,{onClick:()=>{cn(!1),setEvaGroupCreateOpen(true)}},"新建群聊"),React.createElement(Dropdown.Item,{onClick:()=>{cn(false);setEvaCategoryEditor({});}},"新建关注分组"))},React.createElement("button",{type:"button",className:"ch-cat-gear eva-message-invite",title:"新建","aria-label":"新建"},React.createElement(Plus$c,{size:15})))','evaMembershipProjectId?React.createElement("button",{type:"button",className:"ch-cat-gear eva-message-invite",title:"新建群聊","aria-label":"新建群聊",onClick:()=>setEvaGroupCreateOpen(true)},React.createElement(Plus$c,{size:15})):React.createElement(Dropdown,{trigger:"click",position:"bottomLeft",visible:sn,onVisibleChange:cn,render:React.createElement(Dropdown.Menu,null,React.createElement(Dropdown.Item,{icon:React.createElement(Users,{size:16}),onClick:()=>{cn(!1),setEvaGroupCreateOpen(true)}},"新建群聊"),React.createElement(Dropdown.Item,{icon:React.createElement(Star,{size:16}),onClick:()=>{cn(false);setEvaCategoryEditor({});}},"新建关注分组"))},React.createElement("button",{type:"button",className:"ch-cat-gear eva-message-invite",title:"新建","aria-label":"新建"},React.createElement(Plus$c,{size:15})))',"项目群聊直接打开拉人建群模板");
    cut('FileCard=({file:rt,onOpen:ct,onDownload:ut})=>{const[pt,mt]=reactExports.useState(()=>window.EvaFileMessage.isSaved(rt.name));reactExports.useEffect(()=>window.EvaFileMessage.subscribe(rt.name,mt),[rt.name]);const gt=window.EvaFileMessage.action(rt.name),St=xt=>{(xt.key==="Enter"||xt.key===" ")&&(xt.preventDefault(),xt.stopPropagation(),window.EvaFileMessage.activate(rt.name))};',
      'FileCard=({file:rt,onOpen:ct,onDownload:ut,saveContext:evaSaveContext,onSave:evaOnSave,savedRecord:evaSavedRecord})=>{const[pt,mt]=reactExports.useState(0);reactExports.useEffect(()=>window.EvaFileMessage.subscribe(rt,evaSaveContext,()=>mt(value=>value+1)),[rt.id,rt.name,evaSaveContext?.messageId]);const gt=window.EvaFileMessage.action(rt,evaSaveContext,evaSavedRecord),evaActivate=()=>gt.saved?window.EvaFileMessage.activate(rt,evaSaveContext,evaSavedRecord):evaOnSave?.(rt,evaSaveContext),St=xt=>{(xt.key==="Enter"||xt.key===" ")&&(xt.preventDefault(),xt.stopPropagation(),evaActivate())};', '文件卡保存状态使用稳定附件和文件库记录');
    cut('return React.createElement("div",{className:"wk-message-file wk-message-file--clickable",title:"预览",role:"button"',
      'return React.createElement("div",{className:"wk-message-file wk-message-file--clickable"+(new URLSearchParams(String(window.location?.hash||"").split("?")[1]||"").get("evaMessage")===evaSaveContext?.messageId?" eva-message-source-highlight":""),"data-eva-tooltip":"预览","data-eva-message-id":evaSaveContext?.messageId,role:"button"', '文件消息提供来源定位锚点');
    cut('onClick:xt=>{xt.preventDefault(),xt.stopPropagation(),window.EvaFileMessage.activate(rt.name)}',
      'onClick:xt=>{xt.preventDefault(),xt.stopPropagation(),evaActivate()}', '文件卡保存按钮打开统一弹窗');
    cut('className:"wk-message-file-name",title:rt.name',
      'className:"wk-message-file-name","data-eva-tooltip":rt.name,"data-eva-tooltip-clamp":""', '文件消息名称改为截断提示');
    cut('className:"wk-message-file-action",title:"下载"',
      'className:"wk-message-file-action","data-eva-tooltip":"下载"', '文件下载按钮进入统一提示');
    cut('className:"wk-message-file-action eva-file-drive-action",title:gt.title,"aria-label":gt.title',
      'className:"wk-message-file-action eva-file-drive-action","data-eva-tooltip":gt.title,"aria-label":gt.title', '文件存入文件库操作使用 Semi Tooltip');
    cut('className:"wk-msg-row-sender-space",title:`@${Ft}`',
      'className:"wk-msg-row-sender-space","data-eva-tooltip":`@${Ft}`,"data-eva-tooltip-clamp":""', '发送者 @ 改为截断提示');
    const evaFileDriveIconStart=source.indexOf('FileDriveIcon=({action:rt})=>');
    const evaFileDriveIconEnd=source.indexOf(',FileCard=',evaFileDriveIconStart);
    if(evaFileDriveIconStart<0||evaFileDriveIconEnd<evaFileDriveIconStart)throw new Error('IM 文件库动作图标边界不匹配');
    cut(source.slice(evaFileDriveIconStart,evaFileDriveIconEnd),
      'FileDriveIcon=({action:rt})=>React.createElement(rt==="saveDrive"?Save:EvaDriveIcon,{size:18,"aria-hidden":true})', '文件库动作复用 Lucide');
    const evaFileCardStart=source.indexOf('FileCard=({file:rt');
    const evaFileCardEnd=source.indexOf(')} ,REF_LABEL=',evaFileCardStart);
    if(evaFileCardStart<0||evaFileCardEnd<evaFileCardStart)throw new Error('IM 文件卡图标边界不匹配');
    const evaFileCardSource=source.slice(evaFileCardStart,evaFileCardEnd);
    const evaFileDownloadStart=evaFileCardSource.lastIndexOf('React.createElement("svg",');
    if(evaFileDownloadStart<0)throw new Error('IM 文件下载图标不存在');
    const evaFileDownloadTail=evaFileCardSource.slice(evaFileDownloadStart);
    cut(evaFileDownloadTail,
      'React.createElement(Download$5,{size:18,"aria-hidden":true})))', '文件下载复用 Lucide');
    const evaEllipsisStart=source.indexOf('EllipsisIcon=()=>');
    const evaEllipsisEnd=source.indexOf(',InfoRow=',evaEllipsisStart);
    if(evaEllipsisStart<0||evaEllipsisEnd<evaEllipsisStart)throw new Error('IM 更多图标边界不匹配');
    cut(source.slice(evaEllipsisStart,evaEllipsisEnd),
      'EllipsisIcon=({size:rt=20})=>React.createElement(Ellipsis,{size:rt,"aria-hidden":true})', '更多操作复用 Lucide');
    cut('evaMemberStore=evaMembers().store,evaMemberRevision=reactExports.useSyncExternalStore(evaMemberStore.subscribe,evaMemberStore.getSnapshot)',
      'evaMemberContext=evaMembers(),evaMemberStore=evaMemberContext.store,evaMemberFiles=evaMemberContext.files,evaFileRevision=reactExports.useSyncExternalStore(evaMemberFiles.subscribe,evaMemberFiles.getSnapshot),evaMemberRevision=reactExports.useSyncExternalStore(evaMemberStore.subscribe,evaMemberStore.getSnapshot)', '会话订阅文件库状态');
    cut('[evaTransferFile,setEvaTransferFile]=reactExports.useState(null),',
      '[evaTransferFile,setEvaTransferFile]=reactExports.useState(null),[evaFileSaveRequest,setEvaFileSaveRequest]=reactExports.useState(null),', '统一存到文件库弹窗状态');
    cut('evaMenuItems=ci=>{if(!ci)return[];const Zi=[];if(ci.kind==="file"&&ci.file&&evaMemberStore.canRead(Sa.id,evaActorId))Zi.push({title:"转存到项目",icon:React.createElement(FolderPlus,{size:18}),onClick:()=>setEvaTransferFile(ci.file)});',
      'evaSaveContextFor=ci=>{const evaAI=ct?.presentation==="ai-direct"||ct?.sidebarVariant==="ai-team-group",evaDirect=!evaAI&&(Sa.chatType==="direct"||Sa.id.startsWith("dm-")),evaType=evaAI?"ai-conversation":evaDirect?"chat":"group",evaConversationId=evaAI?(ct?.sidebarVariant==="ai-team-group"?(fa?.id||Sa.id):(fa?.short_id||fa?.id||Sa.id)):(fa?.id||Sa.id),evaMessageId=ci.id||ci.fixtureId||[evaConversationId,ci.sender?.uid||"unknown",ci.time||"",ci.file?.id||ci.file?.name||"file"].join(":");return{type:evaType,ownerId:evaAI?evaActorId:null,identityId:evaAI?(ct?.sidebarVariant==="ai-team-group"?Sa.id:(Sa.identityId||ci.sender?.uid)):null,identityName:evaAI?(Sa.identityName||ci.sender?.name||Sa.name):null,conversationKind:ct?.sidebarVariant||Sa.chatType||"group",conversationId:evaConversationId,conversationTitle:fa?.name||Sa.sessionTitle||Sa.name,messageId:evaMessageId,senderId:ci.sender?.uid||null,senderName:ci.sender?.name||null,groupId:evaType==="group"?Sa.id:null,groupName:evaType==="group"?Sa.name:null,threadId:evaType==="group"?fa?.id:null,threadName:evaType==="group"?fa?.name:null,projectId:evaType==="group"?evaTaskProjectId:null,taskId:ci.file?.taskId||null}},evaSaveConversationFile=(file,source)=>{if(source?.type==="group"&&source.projectId){try{const id=evaMemberFiles.saveConversationFile(evaActorId,source.projectId,0,file,source),record=evaMemberFiles.snapshot(evaActorId).find(item=>item.id===id);window.EvaFileMessage.markSaved(file,source,record);Toast.success("已存到项目文件库");}catch(error){Toast.error(error.message||"保存失败");}return;}setEvaFileSaveRequest({file,source})},evaMenuItems=ci=>{if(!ci)return[];const Zi=[];if(ci.kind==="file"&&ci.file)Zi.push({title:"存到文件库",icon:React.createElement(FolderPlus,{size:18}),onClick:()=>evaSaveConversationFile(ci.file,evaSaveContextFor(ci))});', '项目群文件直接保存，其他会话复用统一保存入口');
    cut('else if(ci.kind==="file"&&ci.file){const Ms=ci.file;ns=React.createElement(FileCard,{file:Ms,onOpen:()=>void $a(Ms),onDownload:()=>void Na(Ms)})}',
      'else if(ci.kind==="file"&&ci.file){const Ms=ci.file,evaSaveContext=evaSaveContextFor(ci),evaSavedRecord=evaMemberFiles.findConversationFile(evaActorId,Ms,evaSaveContext);ns=React.createElement(FileCard,{file:Ms,saveContext:evaSaveContext,savedRecord:evaSavedRecord,onSave:(file,source)=>evaSaveConversationFile(file,source),onOpen:()=>void $a(Ms),onDownload:()=>void Na(Ms)})}', '文件卡携带消息与会话来源');
    cut('React.createElement(evaMembers().ui.FileTransfer,{file:evaTransferFile,source:{groupId:Sa.id,groupName:Sa.name,threadId:fa?.id,threadName:fa?.name,taskId:evaTransferFile?.taskId},onClose:()=>setEvaTransferFile(null)}),',
      'React.createElement(evaMembers().ui.FileLibrarySave,{file:evaFileSaveRequest?.file,source:evaFileSaveRequest?.source,onClose:()=>setEvaFileSaveRequest(null)}),', '挂载统一存到文件库弹窗');
    cut('evaContactOpenEffect=reactExports.useEffect(()=>{if(ct?.openChannelId&&pt.some(c=>c.id===ct.openChannelId)){const group=pt.find(c=>c.id===ct.openChannelId);if(ct.openThreadId&&group.threads.some(t=>t.id===ct.openThreadId&&!t.deleted)){Za(group.id,ct.openThreadId);}else La(ct.openChannelId);ir("recent");}},[ct?.openChannelId,ct?.openRequestKey]),evaOpenEffect=',
      'evaContactOpenEffect=reactExports.useEffect(()=>{if(ct?.openChannelId&&pt.some(c=>c.id===ct.openChannelId)){const group=pt.find(c=>c.id===ct.openChannelId);if(ct.openThreadId&&group.threads.some(t=>t.id===ct.openThreadId&&!t.deleted)){Za(group.id,ct.openThreadId);}else La(ct.openChannelId);ir("recent");}},[ct?.openChannelId,ct?.openRequestKey]),evaRelationOpenEffect=reactExports.useEffect(()=>{evaRevealMessage(ct?.openMessageId)},[ct?.openMessageId,va,Ta.length]),evaOpenEffect=', '关联来源消息定位');
    cut('hi=(ci,Zi,Fi)=>{if(ci.kind==="divider")',
      'hi=(ci,Zi,Fi)=>{ci=evaRenderableMessage(ci);if(ci.kind==="divider")', '消息渲染兼容历史数据缺失字段');
    cut('avatarUri(zs,SENDERS[zs].color)',
      'avatarUri(zs,SENDERS[zs]?.color??"#8a8f99")', '子区消息兼容未知参与者');
    cut('React.createElement("span",{className:"ops"},evaCanOpenProjectTasks&&',
      'React.createElement("span",{className:"ops"},!ct?.conversationOnly&&!(evaMembershipProjectId&&evaMembershipProjectId===evaTaskProjectId)&&evaMemberStore.conversationContext(fa?.id||Sa.id,evaActorId)&&React.createElement("button",{type:"button",className:"eva-chat-project-jump","aria-label":"进入项目 "+evaMemberStore.conversationContext(fa?.id||Sa.id,evaActorId).projectName,"data-eva-tooltip":"进入项目",onClick:()=>{const evaHeaderProject=evaMemberStore.conversationContext(fa?.id||Sa.id,evaActorId);if(evaHeaderProject)window.dispatchEvent(new CustomEvent("eva:open-inline-project",{detail:{projectId:evaHeaderProject.projectId}}))}},React.createElement(LayoutGrid,{size:14,className:"eva-chat-project-jump__icon",style:{color:window.EvaProjectAppearance.css(evaMemberStore.conversationContext(fa?.id||Sa.id,evaActorId)).accent},"aria-hidden":true}),React.createElement("span",{className:"eva-chat-project-jump__name"},evaMemberStore.conversationContext(fa?.id||Sa.id,evaActorId).projectName)),!ct?.conversationOnly&&!(evaMembershipProjectId&&evaMembershipProjectId===evaTaskProjectId)&&evaMemberStore.conversationContext(fa?.id||Sa.id,evaActorId)&&React.createElement("span",{className:"eva-chat-head-divider","aria-hidden":true}),evaShowAiFilter&&React.createElement("button",{type:"button",className:"op eva-chat-ai-filter"+(evaHideAi?" is-off":""),"aria-label":evaHideAi?"显示 AI 回复":"隐藏 AI 回复","aria-pressed":evaHideAi,"data-eva-tooltip":evaHideAi?"显示 AI 回复":"隐藏 AI 回复",onClick:()=>{setEvaHideAi(v=>!v);evaSelection!==null&&setEvaSelection(null)}},React.createElement("span",{className:"eva-chat-ai-filter__icon","aria-hidden":true},window.EvaAIIdentity.badge(React.createElement),evaHideAi&&React.createElement("span",{className:"eva-chat-ai-filter__slash"}))),React.createElement("button",{type:"button",className:`op eva-chat-search-entry${Mt==="search"?" is-on":""}`,"aria-label":"查找聊天内容","aria-expanded":Mt==="search","aria-controls":"eva-conversation-search-panel","data-eva-tooltip":"查找聊天内容",onClick:()=>Dt(mode=>mode==="search"?"none":"search")},React.createElement(Search$1,{size:20,color:"currentColor"})),evaCanOpenProjectTasks&&', '统一 IM 查找入口与顶部项目跳转');
    cut('React.createElement("span",{className:`op${Mt==="threads"?" is-on":""}`,role:"button",tabIndex:0,title:"子区",onClick:()=>Dt(ci=>ci==="threads"?"none":"threads"),onKeyDown:ci=>{ci.key==="Enter"&&Dt(Zi=>Zi==="threads"?"none":"threads")}},React.createElement(ThreadIcon,{size:20,color:"currentColor"}))',
      'React.createElement("span",{className:`op${Mt==="threads"?" is-on":""}`,role:"button",tabIndex:0,"aria-label":"子区","data-eva-tooltip":"子区",onClick:()=>Dt(ci=>ci==="threads"?"none":"threads"),onKeyDown:ci=>{ci.key==="Enter"&&Dt(Zi=>Zi==="threads"?"none":"threads")}},React.createElement(ThreadIcon,{size:20,color:"currentColor"}))', 'IM 子区按钮 tooltip');
    cut('React.createElement("span",{className:`op${Mt==="info"?" is-on":""}`,role:"button",tabIndex:0,title:fa?"子区信息":"聊天信息",onClick:()=>Dt(ci=>ci==="info"?"none":"info"),onKeyDown:ci=>{ci.key==="Enter"&&Dt(Zi=>Zi==="info"?"none":"info")}},React.createElement(EllipsisIcon,null))',
      'React.createElement("span",{className:`op${Mt==="info"?" is-on":""}`,role:"button",tabIndex:0,"aria-label":fa?"打开子区信息":"打开聊天信息",onClick:()=>Dt(ci=>ci==="info"?"none":"info"),onKeyDown:ci=>{ci.key==="Enter"&&Dt(Zi=>Zi==="info"?"none":"info")}},React.createElement(EllipsisIcon,null))', 'IM 聊天信息按钮 tooltip');
    cut('"aria-label":`打开${ci.name}任务页`,title:`打开${ci.name}任务页`',
      '"aria-label":`进入项目 ${ci.name}`,"data-eva-tooltip":"进入项目"', '会话分组进入项目提示统一文案');
    cut('Vs=Mt==="tasks"&&evaCanOpenProjectTasks?',
      'Vs=Mt==="search"?React.createElement(EvaConversationSearch,{key:va,conversationId:va,conversationName:fa?.name||Sa.name,messages:Ta,onClose:()=>Dt("none"),onLocate:index=>{if(evaStreamFilter){if(!evaStreamFilter.index.has(index))return;index=evaStreamFilter.index.get(index)}evaRevealConversationMessage(da.current,index)},onPreview:file=>void $a(file),onDownload:file=>void Na(file)}):Mt==="tasks"&&evaCanOpenProjectTasks?', '当前对话查找右栏');
    cut('ci.identityAvatarUrl??window.EvaAvatar.uri({kind:ci.id.startsWith("dm-")?"person":"group",id:ci.id,color:ci.color})',
      'window.EvaAvatar.conversationUri(ci)', '会话列表头像按对方身份解析');
    cut('Sa.identityAvatarUrl??window.EvaAvatar.uri({kind:Sa.id.startsWith("dm-")?"person":"group",id:Sa.id,color:Sa.color})',
      'window.EvaAvatar.conversationUri(Sa)', '会话标题复用相同身份头像');
    cut('window.EvaAvatar.uri({kind:ci.ch.id.startsWith("dm-")?"person":"group",id:ci.ch.id,color:ci.ch.color})',
      'window.EvaAvatar.conversationUri(ci.ch)', '最近会话按对方身份解析头像');
    // Keep native table geometry; a separate container owns horizontal overflow.
    cut('const baseComponents={a:',
      'const baseComponents={table:({node,children,...props})=>React.createElement("div",{className:"eva-markdown-table-scroll"},React.createElement("table",props,children)),a:', 'Markdown 表格独立滚动容器');
    cut('a:({href:rt,children:ct,...ut})=>{const pt=',
      'a:({href:rt,children:ct,...ut})=>{const evaTarget=evaTaskLinkTarget(rt);if(evaTarget){const evaIssue=evaTaskLinkIssue(evaTarget);return React.createElement("a",{...ut,href:rt,className:"eva-task-message-link","data-eva-task-link":evaTarget.identifier,onClick:evaEvent=>{if(evaEvent.defaultPrevented||evaEvent.button!==0||evaEvent.metaKey||evaEvent.ctrlKey||evaEvent.shiftKey||evaEvent.altKey)return;evaEvent.preventDefault();evaTaskLinkOpen(evaTarget)}},evaIssue?evaIssue.identifier+"  "+evaIssue.title:ct)}const pt=', '统一消息正文识别任务链接并展示编号标题');
    // Preserve browser-created line breaks in multiline drafts and pasted Markdown.
    cut('const text=St.currentTarget.textContent??"";pt(text);evaDraftChange?.(text)',
      'const text=evaComposerPlainText(St.currentTarget);pt(text);evaDraftChange?.(text);if(evaMentionScope&&!St.nativeEvent.isComposing){const trigger=evaComposerMentionRange(mt.current);evaMentionRange.current=trigger?.range||null;setEvaMentionQuery(trigger?.query||"");setEvaMentionIndex(0);setEvaMentionOpen(!!trigger)}', '共享输入框保留可见换行');
    cut('onClick:()=>navigator.clipboard?.writeText(ci.text??"").catch(()=>{})',
      'onClick:async()=>{try{if(!navigator.clipboard?.writeText)throw new Error("clipboard unavailable");await navigator.clipboard.writeText(ci.text??"");Toast.success("已复制");}catch{Toast.error("复制失败，请选择消息文字后手动复制");}}', '消息复制成功及失败明确反馈');
    cut('[evaMenuMessage,setEvaMenuMessage]=reactExports.useState(null)',
      '[evaMenuMessage,setEvaMenuMessage]=reactExports.useState(null),[evaSelection,setEvaSelection]=reactExports.useState(null)', '共享消息多选状态');
    cut('va=fa?fa.id:Sa.id,ca=',
      'va=fa?fa.id:Sa.id,evaSelectionReset=reactExports.useEffect(()=>setEvaSelection(null),[va,evaActorId,Mt]),evaAiFilterReset=reactExports.useEffect(()=>setEvaHideAi(false),[va,evaActorId]),ca=', '会话切换清理多选');
    cut('hi=(ci,Zi,Fi)=>{ci=evaRenderableMessage(ci);',
      'hi=(ci,Zi,Fi,evaScope=va)=>{if(ci&&typeof ci==="object")ci={...ci,evaSelectionKey:evaSelectionMessageKey(evaScope,ci,Zi,Fi)};ci=evaRenderableMessage(ci);', '消息选择键限定会话');
    cut('className:"wk-msg-row-checkbox",onClick:mr=>',
      'className:"wk-msg-row-checkbox",role:"checkbox",tabIndex:0,"aria-checked":!!ut,"aria-label":"选择 "+gt+" 的消息",onKeyDown:event=>{if(event.key===" "||event.key==="Enter"){event.preventDefault();event.stopPropagation();Vt?.(!ut)}},onClick:mr=>', '消息多选键盘与状态语义');
    cut('className:"wk-msg-row-body"},!ir&&rn?',
      'className:"wk-msg-row-body",inert:ir?"":void 0},!ir&&rn?', '多选时卡片内容不接受键盘操作');
    cut('hi(ci,Zi,Cs)', 'hi(ci,Zi,Cs,Es.id)', '子区侧栏独立选择范围');
    cut('onClick:()=>Toast.info("已进入多选")',
      'onClick:()=>setEvaSelection({[ci.evaSelectionKey]:ci})', '菜单进入真实多选');
    cut('...rowProps(ci,ro),',
      '...rowProps(ci,ro),selectionMode:evaSelection!==null,showCheckbox:evaSelection!==null,isSelected:!!evaSelection?.[ci.evaSelectionKey],onSelect:checked=>setEvaSelection(previous=>{const next={...previous};if(checked)next[ci.evaSelectionKey]=ci;else delete next[ci.evaSelectionKey];return next;}),', '复用 Octo 消息行选择合同');
    cut('...rowProps(ci,!1),',
      '...rowProps(ci,!1),selectionMode:evaSelection!==null,showCheckbox:evaSelection!==null,isSelected:!!evaSelection?.[ci.evaSelectionKey],onSelect:checked=>setEvaSelection(previous=>{const next={...previous};if(checked)next[ci.evaSelectionKey]=ci;else delete next[ci.evaSelectionKey];return next;}),', '子区创建通知复用消息行选择合同');
    cut('className:"ch-stream",ref:da},Ta.map((ci,Zi)=>hi(ci,Zi,Ta))),React.createElement(EvaIMComposer,',
      'className:"ch-stream",ref:da},evaStreamMessages.map((ci,Zi)=>hi(ci,Zi,evaStreamMessages))),evaSelection!==null&&React.createElement("div",{className:"eva-im-selection-bar",role:"region","aria-label":"消息多选"},React.createElement("span",{role:"status"},"已选择 ",Object.keys(evaSelection).length," 条消息"),React.createElement("button",{type:"button",onClick:()=>setEvaSelection(null)},"退出多选")),React.createElement(EvaIMComposer,', '消息多选计数与退出');
    cut('[evaSelection,setEvaSelection]=reactExports.useState(null)', '[evaSelection,setEvaSelection]=reactExports.useState(null),[evaReply,setEvaReply]=reactExports.useState(null)', '回复状态由共享会话持有');
    cut('()=>setEvaSelection(null),[va,evaActorId,Mt]', '()=>{setEvaSelection(null);setEvaReply(null)},[va,evaActorId,Mt]', '回复随会话与侧栏切换清理');
    cut('evaSelectionKey:evaSelectionMessageKey(evaScope,ci,Zi,Fi)', 'evaSelectionKey:evaSelectionMessageKey(evaScope,ci,Zi,Fi),evaConversationId:evaScope,evaMessageIndex:Zi', '引用记录来源会话');
    cut('onClick:()=>Toast.info("已进入回复")', 'onClick:()=>setEvaReply({conversationId:ci.evaConversationId,messageId:ci.id||ci.fixtureId||ci.evaSelectionKey,fromName:ci.sender?.name||"",fromUID:ci.sender?.uid,autoMention:!!ci.sender?.uid&&ci.sender.uid!==evaActorId&&Sa.chatType!=="direct"&&!Sa.personId,digest:ci.text||ci.file?.name||"消息"})', '回复菜单选择原消息');
    cut('EvaIMComposer=({placeholder:rt,onSend:ct,', 'EvaIMComposer=({reply:evaReply,onCancelReply:evaCancelReply,placeholder:rt,onSend:ct,', '输入区回复合同');
    cut('className:"wk-messageinput-card"},React.createElement("div",{className:"wk-messageinput-row"', 'className:"wk-messageinput-card"},evaReply&&React.createElement("div",{className:"eva-im-reply-draft"},React.createElement("button",{type:"button","aria-label":"取消回复",onClick:evaCancelReply},React.createElement(X,{size:14})),React.createElement("span",{className:"eva-im-reply-draft-text","data-eva-tooltip":"回复 "+evaReply.fromName+"："+evaReply.digest,"data-eva-tooltip-clamp":""},"回复 ",evaReply.fromName,"：",evaReply.digest)),React.createElement("div",{className:"wk-messageinput-row"', '输入区单行回复预览与取消');
    cut('key:evaActorId+":"+va,mentionMembers:', 'key:evaActorId+":"+va,reply:evaReply?.conversationId===va?evaReply:null,onCancelReply:()=>setEvaReply(null),mentionMembers:', '主输入区回复接入');
    cut('key:evaActorId+":"+Es.id,', 'key:evaActorId+":"+Es.id,reply:evaReply?.conversationId===Es.id?evaReply:null,onCancelReply:()=>setEvaReply(null),', '侧栏输入区回复接入');
    cut('vi=(ci,Zi)=>{if(ct?.onSend){ct.onSend(Zi,ci);return;}', 'vi=(ci,Zi)=>{const reply=evaReply?.conversationId===ci?evaReply:undefined;if(ct?.onSend){const result=ct.onSend(Zi,ci,reply);if(result!==false)setEvaReply(null);return result;}', '侧栏发送传递引用');
    cut('evaMemberStore.sendDirect(id,evaActorId,Zi);return;', 'evaMemberStore.sendDirect(id,evaActorId,Zi,reply);setEvaReply(null);return;', '私聊发送保存引用');
    cut('evaMemberStore.sendMessage(ci,evaActorId,Zi);return;', 'evaMemberStore.sendMessage(ci,evaActorId,Zi,reply);setEvaReply(null);return;', '群聊发送保存引用');
    cut('const sent=ct.onSend(Zi,va);if(sent===false)return false;', 'const sent=ct.onSend(Zi,va,evaReply?.conversationId===va?evaReply:undefined);if(sent===false)return false;setEvaReply(null);', '主输入发送传递引用');
    cut('React.createElement("div",null,ns))},Si=', 'React.createElement("div",null,ci.replyTo&&React.createElement(EvaReplyBlock,{reply:ci.replyTo,onClick:event=>{const index=Fi.findIndex((message,index)=>(message?.id||message?.fixtureId||evaSelectionMessageKey(evaScope,message,index,Fi))===ci.replyTo.messageId);if(ci.replyTo.conversationId!==evaScope||index<0){Toast.info("原消息已不在当前记录中");return;}evaRevealConversationMessage(event.currentTarget.closest(".ch-stream"),index)}}),ns))},Si=', '消息内容前复用引用块');
    cut('Ki=za(ci).filter(ro=>!Fi||ci.name.includes(Fi)||ro.name.includes(Fi))',
      'Ki=za(ci).filter(ro=>evaMemberStore.conversationFollowed(ro.id,evaActorId)&&(!Fi||ci.name.includes(Fi)||ro.name.includes(Fi)))','关注列表子区仅显示已关注');
    cut('[evaReply,setEvaReply]=reactExports.useState(null)', '[evaReply,setEvaReply]=reactExports.useState(null),[evaForward,setEvaForward]=reactExports.useState(null)', '共享转发弹窗状态');
    cut('evaSelectionReset=reactExports.useEffect(', 'evaSelectionEscape=reactExports.useEffect(()=>{if(evaSelection===null)return;const onEscape=event=>{if(event.key!=="Escape"||event.isComposing||event.defaultPrevented||evaForward)return;const layers=document.querySelectorAll(".wk-contextmenus-open,.semi-modal,.semi-modal-wrap,.yarl__portal_open,.wk-file-preview-panel,[role=listbox],[role=dialog]");if(Array.from(layers).some(node=>node.getClientRects().length&&getComputedStyle(node).visibility!=="hidden"))return;event.preventDefault();setEvaSelection(null);};document.addEventListener("keydown",onEscape);return()=>document.removeEventListener("keydown",onEscape);},[evaSelection,evaForward]),evaSelectionReset=reactExports.useEffect(', '多选 Escape 退出并让顶层弹层优先处理');
    cut('setEvaSelection(null);setEvaReply(null)', 'setEvaSelection(null);setEvaReply(null);setEvaForward(null)', '会话切换关闭转发');
    cut('onClick:()=>Toast.info("已打开转发")', 'onClick:()=>setEvaForward({sourceId:ci.evaConversationId,messages:[ci]})', '单条消息转发入口');
    cut('React.createElement("button",{type:"button",onClick:()=>setEvaSelection(null)},"退出多选")', 'React.createElement(Button,{disabled:!Object.keys(evaSelection).length,onClick:()=>{const messages=Object.values(evaSelection).sort((a,b)=>a.evaMessageIndex-b.evaMessageIndex);if(new Set(messages.map(message=>message.evaConversationId)).size!==1){Toast.error("请选择同一会话中的消息");return;}setEvaForward({sourceId:messages[0].evaConversationId,messages})}},"转发"),React.createElement("button",{type:"button",onClick:()=>setEvaSelection(null)},"退出多选")', '多选消息转发入口');
    cut('React.createElement(EvaContextMenus,{ref:evaMenuRef,', 'evaForward&&React.createElement(EvaForwardMessagesDialog,{request:evaForward,store:evaMemberStore,actorId:evaActorId,onClose:()=>setEvaForward(null),onSent:()=>{setEvaForward(null);setEvaSelection(null);Toast.success("已转发");}}),React.createElement(EvaContextMenus,{ref:evaMenuRef,', '共享会话挂载转发选择');
    const batchStart=source.indexOf('evaSelection!==null&&React.createElement("div",{className:"eva-im-selection-bar"');
    const batchEnd=source.indexOf(',React.createElement(EvaIMComposer,',batchStart);
    if(batchStart<0||batchEnd<batchStart)throw new Error('多选操作栏替换锚点缺失');
    cut(source.slice(batchStart,batchEnd),'evaSelection!==null&&React.createElement(EvaIMSelectionToolbar,{count:Object.keys(evaSelection).length,onExit:()=>setEvaSelection(null),onDelete:()=>{const messages=Object.values(evaSelection);evaMemberStore.deleteSelectedMessages(messages[0]?.evaConversationId,evaActorId,messages);setEvaSelection(null);Toast.success("已删除");},onForward:mode=>{const messages=Object.values(evaSelection).sort((a,b)=>a.evaMessageIndex-b.evaMessageIndex);if(!messages.length)return;if(new Set(messages.map(message=>message.evaConversationId)).size!==1){Toast.error("请选择同一会话中的消息");return;}setEvaForward({sourceId:messages[0].evaConversationId,messages,mode});}})','独立批量操作栏替换旧栏');
    cut('ci=evaRenderableMessage(ci);if(ci.kind===', 'if(evaMemberStore.isMessageDeleted(evaActorId,ci?.evaSelectionKey))return null;ci=evaRenderableMessage(ci);if(ci.kind===','本地删除消息按账号过滤');
    cut('React.createElement(TextContent,{content:ci.text??"",mentions:ci.mentions??[],onMentionClick:', 'ci.mergedMessages?React.createElement(EvaMergedHistory,{messages:ci.mergedMessages}):React.createElement(TextContent,{content:ci.text??"",mentions:ci.mentions??[],onMentionClick:','合并转发记录卡片');
    cut('reactExports.useEffect(()=>{if(mt.current)mt.current.textContent=evaInitialDraft},[]);', 'reactExports.useEffect(()=>{if(mt.current)mt.current.textContent=evaInitialDraft},[]);reactExports.useEffect(()=>{if(!evaReply||!mt.current)return;const editor=mt.current;if(evaReply.autoMention&&evaReply.fromName){evaInsertComposerMention(editor,evaReply.fromName,evaReply.fromUID);const text=evaComposerPlainText(editor);pt(text);evaDraftChange?.(text);}editor.focus();const range=document.createRange();range.selectNodeContents(editor);range.collapse(false);const selection=window.getSelection();selection.removeAllRanges();selection.addRange(range);},[evaReply]);','回复按 Octo 群聊规则自动提及并聚焦');
    cut('React.createElement(Maximize2,{size:17})','React.createElement(ArrowUp,{size:17})','发送按钮使用向上箭头语义');
    cut('onKeyDown:St=>{St.key==="Enter"&&!St.shiftKey', 'onKeyDown:St=>{if(evaMentionOpen&&!St.nativeEvent.isComposing){const options=mt.current.closest(".wk-messageinput-box").querySelectorAll(".eva-im-mention-options > button:not([data-eva-mention-more])");if(St.key==="Escape"){St.preventDefault();setEvaMentionOpen(false);return;}if(St.key==="ArrowDown"||St.key==="ArrowUp"){St.preventDefault();setEvaMentionIndex(i=>options.length?(i+(St.key==="ArrowDown"?1:-1)+options.length)%options.length:0);return;}if(St.key==="Enter"){St.preventDefault();options[evaMentionIndex]?.click();return;}}St.key==="Enter"&&!St.shiftKey','提及候选保留编辑焦点并支持键盘选择');
    cut('onInput:St=>{const text=evaComposerPlainText(St.currentTarget);','onCompositionEnd:St=>{const text=evaComposerPlainText(St.currentTarget);pt(text);evaDraftChange?.(text);const trigger=evaComposerMentionRange(mt.current);evaMentionRange.current=trigger?.range||null;setEvaMentionQuery(trigger?.query||"");setEvaMentionIndex(0);setEvaMentionOpen(!!evaMentionScope&&!!trigger);},onInput:St=>{const text=evaComposerPlainText(St.currentTarget);','中文输入确认后更新提及候选');
    // Presentation only: ownership comes from the current actor, never the display name.
    cut('rowProps=(rt,ct)=>({isSend:!1,',
      'rowProps=(rt,ct,evaActorId)=>({isSend:!!evaActorId&&rt.sender.uid===evaActorId,bubbleKind:rt.kind,', '气泡方向使用当前身份');
    cut('rowProps(ci,!1)', 'rowProps(ci,!1,evaActorId)', '子区卡片沿用气泡方向');
    cut('rowProps(ci,ro)', 'rowProps(ci,ro,evaActorId)', '共享消息流沿用气泡方向');
    cut('function MessageRow({isSend:rt,', 'function MessageRow({bubbleKind:evaBubbleKind,isSend:rt,', '消息行展示类型');
    cut('classNames("wk-msg-row",rt&&', 'classNames("wk-msg-row",evaBubbleKind&&"eva-im-bubble-row",evaBubbleKind==="text"&&"eva-im-bubble-row--text",rt&&', '共享气泡样式边界');
    cut('className:"ch-list__top"', 'className:"ch-list__top eva-rail-header"', '统一消息与项目中栏标题栏');
    source=root.__evaCut(source,'za=ci=>ci.threads.filter(Zi=>Zi.status===1)','evaThreadPrefs=thread=>evaMemberStore.chatPreferences(thread.id,evaActorId),evaSortThreads=items=>[...items].sort((a,b)=>Number(!!evaThreadPrefs(b).top)-Number(!!evaThreadPrefs(a).top)),za=ci=>evaSortThreads(ci.threads.filter(Zi=>Zi.status===1&&!evaThreadPrefs(Zi).hidden))','子区个人置顶与隐藏列表');
    source=root.__evaCut(source,'return ci.filter(Fi=>!Zi||Fi.name.includes(Zi)||(Fi.crumb??"").includes(Zi))','return ci.filter(Fi=>!(ut&&!ct?.conversationOnly&&Cn==="recent"&&!Zi&&evaMemberStore.recentConversationHidden(Fi.th?.id||Fi.ch.id,evaActorId))&&(!Zi||Fi.name.includes(Zi)||(Fi.crumb??"").includes(Zi)))','不显示仅移出最近列表，保留搜索与关注入口');
    source=root.__evaCut(source,'Fi.threads.filter(Ki=>Ki.status===1).forEach','evaSortThreads(Fi.threads.filter(Ki=>Ki.status===1&&!evaThreadPrefs(Ki).hidden)).forEach','最近列表过滤隐藏子区');
    source=root.__evaCut(source,'ls=Sa.threads.filter(ci=>ci.status===2)','ls=evaSortThreads(Sa.threads.filter(ci=>ci.status===2&&!evaThreadPrefs(ci).hidden)),evaHiddenThreads=evaSortThreads(Sa.threads.filter(ci=>evaThreadPrefs(ci).hidden))','归档与隐藏分别管理');
    source=root.__evaCut(source,'React.createElement(Dropdown.Item,{onClick:()=>{Ra(Es),Ma(Es.name)}},t("base.threadPanel.editNameTitle")),','React.createElement(Dropdown.Item,{onClick:()=>{Ra(Es),Ma(Es.name)}},t("base.threadPanel.editNameTitle")),React.createElement(Dropdown.Item,{onClick:()=>evaMemberStore.setChatPreferences(Es.id,evaActorId,{top:!evaThreadPrefs(Es).top})},evaThreadPrefs(Es).top?"取消置顶":"置顶子区"),React.createElement(Dropdown.Item,{onClick:()=>evaMemberStore.setChatPreferences(Es.id,evaActorId,{hidden:!evaThreadPrefs(Es).hidden})},evaThreadPrefs(Es).hidden?"恢复显示":"隐藏子区"),','子区侧栏菜单共用个人偏好');
    source=root.__evaCut(source,'ls.map(Wi))))))','ls.map(Wi))),evaHiddenThreads.length>0&&React.createElement("div",{className:"wk-thread-panel-group"},React.createElement("div",{className:"wk-thread-panel-group-header"},React.createElement("span",null,"已隐藏子区")),React.createElement("div",{className:"wk-thread-panel-group-list"},evaHiddenThreads.map(thread=>React.createElement("div",{key:thread.id},Wi(thread),React.createElement(Button,{theme:"borderless",size:"small",onClick:()=>evaMemberStore.setChatPreferences(thread.id,evaActorId,{hidden:false})},"恢复显示"))))))))','隐藏子区恢复入口');
    const threadListStart=source.indexOf('):React.createElement(React.Fragment,null,React.createElement("div",{className:"wk-thread-panel-header"},React.createElement("div",{className:"wk-thread-panel-header-title"}');
    const threadListEnd=source.indexOf(':Mt==="file"',threadListStart);
    if(threadListStart<0||threadListEnd<threadListStart)throw new Error('子区列表替换边界不匹配');
    source=root.__evaCut(source,source.slice(threadListStart,threadListEnd),'):React.createElement(EvaThreadList,{key:Sa.id+":"+evaActorId,group:Sa,active:no,archived:ls,hidden:evaHiddenThreads,store:evaMemberStore,actorId:evaActorId,onOpen:id=>Da(id),onCreate:()=>pa(true),onClose:()=>Dt("none"),onRename:thread=>{Ra(thread);Ma(thread.name)},onArchive:Ka}))','子区列表状态页签与卡片');
    const threadItemStart=source.indexOf(',Wi=ci=>{const Zi=(ci.unread??0)>0'),threadItemEnd=source.indexOf(',no=za(Sa)',threadItemStart);
    if(threadItemStart<0||threadItemEnd<threadItemStart)throw new Error('旧子区条目边界不匹配');
    source=root.__evaCut(source,source.slice(threadItemStart,threadItemEnd),'','删除旧子区条目渲染');
    source=root.__evaCut(source,',[ha,ga]=reactExports.useState(!0),[Oa,ka]=reactExports.useState(!1)','','删除旧子区分组折叠状态');
    cut('fa&&ct?.presentation!=="ai-direct"?React.createElement("div",{className:"wk-chat-conversation-header-channel-thread-icon"},React.createElement(ThreadIcon,{size:18,color:"var(--wk-text-secondary, #5C6070)"})):Sa.identityAppearance?', 'Sa.identityAppearance?', '子区标题继承父大群头像');
    const menuStart=source.indexOf('EvaContextMenus=reactExports.forwardRef('),menuEnd=source.indexOf(',EMPTY_CHANNEL=',menuStart);
    if(menuStart<0||menuEnd<0)throw new Error('共享右键菜单边界变化');
    cut(source.slice(menuStart,menuEnd),'EvaContextMenus=reactExports.forwardRef(EvaSharedContextMenus)','复用 Octo 菜单交互');
    cut('[evaCategoryEditor,setEvaCategoryEditor]=reactExports.useState(null),','[evaRailMenus,setEvaRailMenus]=reactExports.useState([]),evaRailMenuRef=reactExports.useRef(null),evaOpenRailMenu=(event,channel,thread,recent)=>{if(!ut||ct?.conversationOnly)return;setEvaRailMenus(evaConversationRailMenus({store:evaMemberStore,actorId:evaActorId,channel,thread,recent,onEditCategory:setEvaCategoryEditor}));evaRailMenuRef.current?.show(event);},evaOpenCategoryMenu=(event,category)=>{setEvaRailMenus(evaCategoryRailMenus({category,onCreateGroup:id=>{setEvaCreateGroupCategory(id);setEvaGroupCreateOpen(true);},onRename:setEvaCategoryEditor,onDelete:setEvaCategoryToDelete}));evaRailMenuRef.current?.show(event);},[evaCategoryEditor,setEvaCategoryEditor]=reactExports.useState(null),','右键菜单由会话组件持有');
    cut('React.createElement(I18nProvider,null,evaCategoryEditor&&','React.createElement(I18nProvider,null,React.createElement(EvaContextMenus,{ref:evaRailMenuRef,menus:evaRailMenus}),evaCategoryEditor&&','挂载唯一会话列表菜单');
    cut('key:ci.key,className:classNames("wk-conversationlist-item",','key:ci.key,onContextMenu:event=>evaOpenRailMenu(event,ci.ch,ci.th,true),className:classNames("wk-conversationlist-item",','最近右键入口');
    cut('role:"button",tabIndex:0,onClick:()=>ci.isThread?', 'role:"button",tabIndex:0,onKeyUp:event=>{if(event.key==="ContextMenu"||(event.shiftKey&&event.key==="F10"))evaOpenRailMenu(event,ci.ch,ci.th,true);},onClick:()=>ci.isThread?', '最近键盘菜单入口');
    cut('name:ci.name,iconColor:ci.color,','name:ci.name,railMenu:event=>evaOpenRailMenu(event,ci,null,false),iconColor:ci.color,','关注父群右键入口');
    cut('key:ro.id,isThread:!0,name:ro.name,','key:ro.id,isThread:!0,railMenu:event=>evaOpenRailMenu(event,ci,ro,false),name:ro.name,','关注子区右键入口');
    cut('className:classNames("wk-conv-compact-item",','onContextMenu:evaRailMenu,onKeyUp:event=>{if(evaRailMenu&&(event.key==="ContextMenu"||(event.shiftKey&&event.key==="F10")))evaRailMenu(event);},className:classNames("wk-conv-compact-item",','紧凑行透传菜单');
    cut('categoryId:ci.id,sortableItems:Fi.map(c=>c.id),','categoryId:ci.id,onContextMenu:ci.id.startsWith("scope:")?event=>evaOpenCategoryMenu(event,ci):undefined,sortableItems:Fi.map(c=>c.id),','个人分类复用管理菜单');
    cut('setEvaCreateGroupCategory(null);},[evaMembershipProjectId,evaActorId])','setEvaCreateGroupCategory(null);evaRailMenuRef.current?.hide();},[evaMembershipProjectId,evaActorId])','身份变化关闭菜单');
    cut('evaContactOpenEffect=reactExports.useEffect(', 'evaRailMenuReset=reactExports.useEffect(()=>{evaRailMenuRef.current?.hide();},[Cn,Va]),evaContactOpenEffect=reactExports.useEffect(', '列表模式变化关闭菜单');
    // Selection changes must not rebuild every conversation and invalidate preview memoization.
    cut('evaBaseChannels=evaMembershipProjectId?evaMemberStore.channels(evaMembershipProjectId,evaActorId,evaChannelDrafts):ct?ct.channels:evaChannelDrafts,pt=evaBaseChannels.map(',
      'evaBaseChannels=reactExports.useMemo(()=>evaMembershipProjectId?evaMemberStore.channels(evaMembershipProjectId,evaActorId,evaChannelDrafts):ct?ct.channels:evaChannelDrafts,[evaMembershipProjectId,evaActorId,evaChannelDrafts,ct?.channels,evaMemberRevision]),pt=reactExports.useMemo(()=>evaBaseChannels.map(', '会话选择复用稳定列表数据');
    cut('Number(b.evaPinned)-Number(a.evaPinned)),gt=',
      'Number(b.evaPinned)-Number(a.evaPinned)),[evaBaseChannels,evaMemberRevision,evaActorId,ct?.conversationOnly]),gt=', '偏好变化才重新派生会话列表');
    cut('[pt,Va,oa,ct,evaMemberRevision,evaActorId]).map(ci=>',
      '[pt,Va,oa,ct,evaMemberRevision,evaActorId,Cn]).map(ci=>', '列表模式显式参与最近摘要缓存');
    // Telegram's chat list has one peer row. Keep topic activity in that row,
    // while search can still find the parent by any visible topic name.
    const recentStart=source.indexOf('Aa=reactExports.useMemo(()=>{const ci=[];pt.forEach(');
    const recentEnd=source.indexOf(';const Zi=Va.trim();return ci.filter',recentStart);
    if(recentStart<0||recentEnd<recentStart)throw new Error('最近会话数据边界不匹配');
    source=root.__evaCut(source,source.slice(recentStart,recentEnd),`Aa=reactExports.useMemo(()=>{const ci=[];pt.forEach(Fi=>{const topics=Fi.threads.filter(Ki=>Ki.status===1&&!evaThreadPrefs(Ki).hidden),latest=topics.reduce((best,Ki)=>(Wa(Ki.id)||(Ki.last_message_sender_name&&Ki.last_message_content))&&(!best.preview||evaRecentActivity(evaMemberStore,evaActorId,Ki.id,Ki.updated_at)>String(best.at||''))?{at:evaRecentActivity(evaMemberStore,evaActorId,Ki.id,Ki.updated_at),preview:Wa(Ki.id)||(Ki.last_message_sender_name?\`${'${Ki.last_message_sender_name}'}: ${'${Ki.last_message_content??""}'}\`:''),topic:Ki}:best,{at:evaRecentActivity(evaMemberStore,evaActorId,Fi.id,Fi.lastAt),preview:Wa(Fi.id),topic:null});ci.push({key:Fi.id,ch:Fi,name:Fi.name,crumb:evaMemberStore.conversationContext(Fi.id,evaActorId)?.path,at:latest.at,preview:latest.topic?\`${'${latest.topic.name}'} · ${'${latest.preview}'}\`:latest.preview,unread:evaRecentUnread(evaMemberStore,evaActorId,Fi)+topics.reduce((sum,Ki)=>sum+evaRecentUnread(evaMemberStore,evaActorId,Ki),0),atMe:Fi.atMe||topics.some(Ki=>Ki.atMe),isThread:!1});if(Va.trim())topics.forEach(Ki=>ci.push({key:Fi.id+'/'+Ki.id,ch:Fi,th:Ki,name:Fi.name+' / '+Ki.name,crumb:Fi.name,at:evaRecentActivity(evaMemberStore,evaActorId,Ki.id,Ki.updated_at),preview:Wa(Ki.id)||(Ki.last_message_sender_name?\`\${Ki.last_message_sender_name}: \${Ki.last_message_content??""}\`:''),unread:evaMemberStore.conversationUnread(Ki.id,evaActorId,Ki.unread||0),isThread:!0}))})`,'最近按大群聚合最新消息和子区提醒');
    source=root.__evaCut(source,'(!Zi||Fi.name.includes(Zi)||(Fi.crumb??"").includes(Zi))','(!Zi||Fi.name.includes(Zi)||(Fi.crumb??"").includes(Zi))','最近搜索可命中群内子区');
    source=root.__evaCut(source,'ci.ch.id===Ct&&!Pt,Fi=!ci.isThread','ci.ch.id===Ct,Fi=!ci.isThread','最近进入子区时保持所属大群行选中');
    source=root.__evaCut(source,'const ut=!!ct,[evaChannelDrafts,mt]=',
      'const evaRecentDrafts=reactExports.useRef({}),[evaRailSearchOpen,setEvaRailSearchOpen]=reactExports.useState(false);const ut=!!ct,[evaChannelDrafts,mt]=',
      '团队消息列表搜索开关');
    source=root.__evaCut(source,'evaMembershipProjectId?"群聊":"我的消息")',
      'evaMembershipProjectId?"群聊":"我的消息"),evaTeamGlobal&&Cn==="recent"&&React.createElement("button",{type:"button",className:"eva-recent-search-toggle","aria-label":"搜索会话","aria-pressed":evaRailSearchOpen,onClick:()=>{if(evaRailSearchOpen)Fa("");setEvaRailSearchOpen(!evaRailSearchOpen)}},React.createElement(Search$1,{size:16,"aria-hidden":true}))',
      '消息列表搜索入口');
    source=root.__evaCut(source,'React.createElement(EvaOverlayListScroll,{enabled:ut&&!ct?.conversationOnly,className:"ch-list__scroll"}',
      'evaTeamGlobal&&Cn==="recent"&&evaRailSearchOpen&&React.createElement(ForwardInput,{className:"eva-recent-search-input",placeholder:"搜索群聊或子区",value:Va,onChange:ci=>Fa(ci),showClear:!0,autoFocus:!0,"aria-label":"搜索群聊或子区"}),React.createElement(EvaOverlayListScroll,{enabled:ut&&!ct?.conversationOnly,className:"ch-list__scroll"}',
      '最近搜索父群与子区');
    source=root.__evaCut(source,'onClick:()=>ir(mode)',
      'onClick:()=>{if(mode!=="recent"){Fa("");setEvaRailSearchOpen(false)}ir(mode)}',
      '离开最近时清理搜索状态');
    source=root.__evaCut(source,'React.createElement("div",{className:"ch-main__body"}',
      'ut&&evaTeamGlobal&&Cn==="recent"&&!Sa.id.startsWith("dm-")&&Sa.chatType!=="direct"&&Sa.threads.some(thread=>!thread.deleted)&&React.createElement(EvaRecentTopicNavigation,{key:Sa.id,group:Sa,store:evaMemberStore,actorId:evaActorId,threads:evaSortThreads(Sa.threads.filter(thread=>thread.status===1&&!evaThreadPrefs(thread).hidden)),activeId:fa?.id||null,onMain:()=>La(Sa.id),onTopic:id=>Za(Sa.id,id),onCreate:()=>pa(true),onMenu:(event,thread)=>{setEvaRailMenus(evaTopicMenus({store:evaMemberStore,actorId:evaActorId,group:Sa,thread,onRename:item=>{Ra(item);Ma(item.name)},onArchive:Ka}));evaRailMenuRef.current?.show(event,event.target.closest("[role=tab]"))}}),React.createElement("div",{className:"ch-main__body"}',
      '最近群内使用主聊天和子区的连续切换导航');
    cut('fa&&ct?.presentation!=="ai-direct"?React.createElement("span",{className:"wk-chat-conversation-header-channel-info-name wk-chat-conversation-header-channel-info-name--thread"}',
      'fa&&ct?.presentation!=="ai-direct"&&!(evaTeamGlobal&&Cn==="recent")?React.createElement("span",{className:"wk-chat-conversation-header-channel-info-name wk-chat-conversation-header-channel-info-name--thread"}',
      '最近群内切换保留稳定的父群标题');
    cut('initialDraft:ct?.getDraft?ct.getDraft(va):Sa.personId?evaMemberStore.directDraft(Sa.id,evaActorId):ct?.initialDraft',
      'initialDraft:ct?.getDraft?ct.getDraft(va):Sa.personId?evaMemberStore.directDraft(Sa.id,evaActorId):evaTeamGlobal&&Cn==="recent"?evaRecentDrafts.current[evaActorId+":"+va]||"":ct?.initialDraft',
      '最近群内切换按身份与会话恢复草稿');
    cut('onDraftChange:Sa.personId?text=>evaMemberStore.setDirectDraft(evaMemberStore.openDirect(evaActorId,Sa.personId),evaActorId,text):ct?.getDraft?text=>ct.onDraftChange(text,va):ct?.onDraftChange',
      'onDraftChange:Sa.personId?text=>evaMemberStore.setDirectDraft(evaMemberStore.openDirect(evaActorId,Sa.personId),evaActorId,text):ct?.getDraft?text=>ct.onDraftChange(text,va):evaTeamGlobal&&Cn==="recent"?text=>{evaRecentDrafts.current[evaActorId+":"+va]=text}:ct?.onDraftChange',
      '最近群内聊天草稿唯一由会话组件持有');
    cut('onSend:di,initialDraft:',
      'onSend:text=>{const sent=di(text);if(sent!==false&&evaTeamGlobal&&Cn==="recent")delete evaRecentDrafts.current[evaActorId+":"+va];return sent},initialDraft:',
      '最近发送成功后清除当前会话草稿');
    // 原生 title 只保留语义/可访问名用途（如 iframe title）；其余提示统一改挂声明式 Tooltip 桥。
    // 这些字符串由前面的 cut 链生成，直接改 cut 锚点会互相破坏，故在最终成品上做定点收敛。
    source=source.replaceAll('title:"新建群聊","aria-label":"新建群聊"','"data-eva-tooltip":"新建群聊","aria-label":"新建群聊"');
    source=source.replaceAll('title:"新建","aria-label":"新建"','"data-eva-tooltip":"新建","aria-label":"新建"');
    source=source.replaceAll('title:fa&&ct?.presentation!=="ai-direct"?"子区信息":"聊天信息",','');
    const threadFormStart=source.indexOf('function ThreadCreateForm('),threadFormEnd=source.indexOf('function ThreadCreateDialog(',threadFormStart);
    if(threadFormStart<0||threadFormEnd<=threadFormStart)throw new Error('子区创建表单锚点不匹配');
    source=root.__evaCut(source,source.slice(threadFormStart,threadFormEnd),ThreadCreateForm.toString(),'子区创建使用统一 Semi Form');
    const threadDialogStart=source.indexOf('function ThreadCreateDialog('),threadDialogEnd=source.indexOf('const FALLBACK_PALETTE=',threadDialogStart);
    if(threadDialogStart<0||threadDialogEnd<=threadDialogStart)throw new Error('子区弹窗锚点不匹配');
    source=root.__evaCut(source,source.slice(threadDialogStart,threadDialogEnd),ThreadCreateDialog.toString(),'子区创建接入公共弹窗');
    cut('const Ms=Sa.threads.find(zs=>zs.name===ci.thread.name)','const Ms=Sa.threads.find(zs=>ci.thread.id?zs.id===ci.thread.id:zs.name===ci.thread.name)','创建记录按稳定子区 ID 跳转');
    cut('evaMemberStore.createThread(Fi.id,Sa.id,{...Fi,creator_name:','evaMemberStore.createThread(Fi.id,Sa.id,{...Fi,announce:true,creator_name:','创建子区写入父群记录');
    const topicDialogStart=source.indexOf('ki=React.createElement(ThreadCreateDialog,{visible:ma,');
    const topicDialogEnd=source.indexOf(',no=za(Sa)',topicDialogStart);
    if(topicDialogStart<0||topicDialogEnd<0)throw new Error('子区创建弹窗边界变化');
    const originalTopicDialog=source.slice(topicDialogStart,topicDialogEnd);
    cut(originalTopicDialog,'ki=!ct?.onCreateThread?React.createElement(EvaTopicCreateDialog,{visible:ma,group:Sa,store:evaMemberStore,actorId:evaActorId,onSubmit:bi,onCancel:()=>pa(false),onOpen:id=>Za(Sa.id,id)}):'+originalTopicDialog.slice(3),'群内创建子区统一重名校验');
    cut('pa(!1),Toast.success(t("base.module.createThread.success"))','pa(!1),!ct?.onCreateThread&&Za(Sa.id,Fi.id),Toast.success(t("base.module.createThread.success"))','创建后进入子区');
    cut('ai=(ci,Zi,Fi)=>{if(ct?.onUpdateThread){ct.onUpdateThread(Zi,Fi);return;}if(evaMemberStore.canRead(ci,evaActorId)){evaMemberStore.updateThread(Zi,Fi,evaActorId);}mt(Ki=>Ki.map(ro=>ro.id!==ci?ro:{...ro,threads:ro.threads.map(ns=>ns.id===Zi?{...ns,...Fi}:ns)}))}',
      'ai=(ci,Zi,Fi)=>{try{if(ct?.onUpdateThread){ct.onUpdateThread(Zi,Fi);return true;}evaMemberStore.updateThread(Zi,Fi,evaActorId);mt(Ki=>Ki.map(ro=>ro.id!==ci?ro:{...ro,threads:ro.threads.map(ns=>ns.id===Zi?{...ns,...Fi}:ns)}));if(Fi.status===2&&Pt===Zi&&evaTeamGlobal&&Cn==="recent")La(ci);return true;}catch(error){Toast.error(error.message);return false;}}', '子区治理失败保留原状并提示');
    cut('ai(Sa.id,Ca.id,{name:ci}),Toast.success(t("base.threadPanel.updateSuccess")),Ra(null)',
      'ai(Sa.id,Ca.id,{name:ci})&&(Toast.success(t("base.threadPanel.updateSuccess")),Ra(null))', '子区重名时保留重命名弹窗');
    cut('ai(Sa.id,ci.id,{status:Fi?2:1}),Toast.success(t(Fi?"base.module.thread.archiveSuccess":"base.module.thread.unarchiveSuccess"))',
      'ai(Sa.id,ci.id,{status:Fi?2:1})&&Toast.success(t(Fi?"base.module.thread.archiveSuccess":"base.module.thread.unarchiveSuccess"))', '归档成功后再显示成功提示');
    cut('evaMemberStore.canRead(Sa.id,evaActorId)&&evaMemberStore.createThread(Fi.id,Sa.id,{...Fi,announce:true,creator_name:',
      'evaMemberStore.createThread(Fi.id,Sa.id,{...Fi,announce:true,creator_name:', '创建时实时检查成员权限');
    cut('[ct?.openChannelId,ct?.openRequestKey]),evaRelationOpenEffect=', '[ct?.openChannelId,ct?.openThreadId,ct?.openRequestKey]),evaRelationOpenEffect=', '同群子区链接变化重新定位');
    cut('React.createElement(evaMembers().ui.ChatSettings.Row,{title:fa.status===1?', '(ct?.onUpdateThread||evaMemberStore.canManageThread(fa.id,evaActorId))&&React.createElement(evaMembers().ui.ChatSettings.Row,{title:fa.status===1?', '子区信息治理入口遵循创建者及群管理员权限');
    cut('ai(Sa.id,ci.id,{status:2});let Ki=', 'if(!ai(Sa.id,ci.id,{status:2}))return;let Ki=', '快捷归档失败不显示成功');
    cut('else ai(Sa.id,ci.id,{status:1}),Toast.success(t("base.module.thread.unarchiveSuccess"))', 'else ai(Sa.id,ci.id,{status:1})&&Toast.success(t("base.module.thread.unarchiveSuccess"))', '恢复归档失败不显示成功');
    cut('React.createElement(Dropdown.Item,{onClick:()=>{Ra(Es),Ma(Es.name)}}', '(ct?.onUpdateThread||evaMemberStore.canManageThread(Es.id,evaActorId))&&React.createElement(Dropdown.Item,{onClick:()=>{Ra(Es),Ma(Es.name)}}', '子区侧栏重命名权限一致');
    cut('React.createElement(Dropdown.Item,{onClick:()=>Ka(Es)}', '(ct?.onUpdateThread||evaMemberStore.canManageThread(Es.id,evaActorId))&&React.createElement(Dropdown.Item,{onClick:()=>Ka(Es)}', '子区侧栏归档权限一致');
    cut('React.createElement(Dropdown.Item,{type:"danger",onClick:()=>Ia(Es)}', '(ct?.onUpdateThread||evaMemberStore.canManageThread(Es.id,evaActorId))&&React.createElement(Dropdown.Item,{type:"danger",onClick:()=>Ia(Es)}', '已有子区侧栏删除权限一致');
    return EvaAIThreadRenameForm.toString()+'\n'+EvaForwardThreadForm.toString()+'\n'+EvaTopicCreateDialog.toString()+'\n'+evaPinMenuItem.toString()+'\n'+evaMuteMenuItem.toString()+'\n'+evaTopicMenus.toString()+'\n'+EvaSharedContextMenus.toString()+'\n'+evaConversationRailMenus.toString()+'\n'+evaCategoryRailMenus.toString()+'\n'+evaRailIcon.toString()+'\n'+EvaOverlayListScroll.toString()+'\n'+evaRecentUnread.toString()+'\n'+EvaRecentTopicNavigation.toString()+'\n'+EvaThreadList.toString()+'\n'+EvaDeleteMessagesDialog.toString()+'\n'+evaComposerMentionRange.toString()+'\n'+evaInsertComposerMention.toString()+'\n'+evaEmojiRecentRead.toString()+'\n'+evaEmojiRecentWrite.toString()+'\n'+evaEmojiGroups.toString()+'\n'+evaEmojiAll.toString()+'\n'+evaEmojiRecordFromText.toString()+'\n'+evaInsertComposerEmoji.toString()+'\n'+EvaEmojiPicker.toString()+'\n'+EvaMergedHistory.toString()+'\n'+EvaIMSelectionToolbar.toString()+'\n'+evaForwardIcon.toString()+'\n'+evaRecentActivity.toString()+'\n'+evaForwardCatalog.toString()+'\n'+evaForwardFollowRank.toString()+'\n'+evaForwardNoopSubscribe.toString()+'\n'+EvaForwardMessagesDialog.toString()+'\n'+EvaReplyBlock.toString()+'\n'+evaSelectionMessageKey.toString()+'\n'+evaComposerPlainText.toString()+'\n'+EvaConversationCategoryEditor.toString()+'\n'+EvaFollowGrip.toString()+'\n'+EvaFollowChannel.toString()+'\n'+EvaFollowCategory.toString()+'\n'+EvaFollowList.toString()+'\n'+evaIMPlaceholder.toString()+'\n'+evaRenderableMessage.toString()+'\n'+evaTeamThreadSource.toString()+'\n'+evaConversationMessages.toString()+'\n'+evaRevealMessage.toString()+'\n'+evaConversationSearchTimestamp.toString()+'\n'+evaConversationSearchRecord.toString()+'\n'+evaConversationSearchFileSize.toString()+'\n'+evaConversationSearchFileDate.toString()+'\n'+evaSearchConversationMessages.toString()+'\n'+evaRevealConversationMessage.toString()+'\n'+EvaConversationSearch.toString()+'\n'+EvaAssistantSourceCards.toString()+'\n'+EvaAssistantEditorHost.toString()+'\n'+EvaAssistantEditor.toString()+'\n'+evaIdentityAppearance.toString()+'\n'+EvaAIIdentityAvatar.toString()+'\n'+evaPreviewFixture.toString()+'\n'+EvaPresentationPreviewRenderer.toString()+'\n'+EvaArchivePreviewRenderer.toString()+'\n'+EvaWordPreviewRenderer.toString()+'\n'+EvaHtmlPreviewDocument.toString()+'\n'+EvaInlineProjectPanel.toString()+'\n'+EvaAITeamGroupEditor.toString()+'\n'+EvaAITeamPage.toString()+'\n'+source;
  });
})(window);
