/* Shared Eva identity card. Semi owns modal focus and portal lifecycle;
 * identity projections own fields and permissions; React owns the return stack.
 */
(function(root){
'use strict';
root.EvaIdentityCard={create({React:R,Modal,Button,BackIcon,ProjectIcon,CameraIcon,useNavigate},store){
 const h=R.createElement,model=root.EvaContactIdentities.create(store);
 function Appearance({profile,size=32}){
  return profile.appearance?root.EvaAIIdentity.avatar(profile.appearance,size,h):h('img',{className:'eva-profile-human-avatar',src:profile.avatar,alt:'',width:size,height:size,draggable:false});
 }
 // One editor for humans, clones and personal assistants. Upload crops to a
 // square PNG; default clears the value.
 function AvatarEditor({current,label,onCancel,onSave}){
  const [stage,setStage]=R.useState('idle'),[draft,setDraft]=R.useState(current||'');
  const [zoom,setZoom]=R.useState(1),[offset,setOffset]=R.useState({x:0,y:0}),[tick,setTick]=R.useState(0),[error,setError]=R.useState('');
  const canvasRef=R.useRef(null),imageRef=R.useRef(null),fileRef=R.useRef(null),dragRef=R.useRef(null);
  const size=240;
  const coverOf=(img,nextZoom)=>{const scale=Math.max(size/img.width,size/img.height)*(nextZoom||1);return {w:img.width*scale,h:img.height*scale};};
  const clamp=(nextZoom,x,y,img)=>{const {w,h}=coverOf(img,nextZoom),maxX=Math.max(0,(w-size)/2),maxY=Math.max(0,(h-size)/2);return {x:Math.max(-maxX,Math.min(maxX,x)),y:Math.max(-maxY,Math.min(maxY,y))};};
  R.useEffect(()=>{
   const canvas=canvasRef.current,img=stage==='upload'?imageRef.current:null;
   if(!canvas||!canvas.getContext)return;
   const ctx=canvas.getContext('2d');ctx.clearRect(0,0,size,size);
   if(!img)return;
   const {w,h}=coverOf(img,zoom);ctx.drawImage(img,(size-w)/2+offset.x,(size-h)/2+offset.y,w,h);
  },[stage,zoom,offset,tick]);
  const exportUpload=()=>{
   const img=imageRef.current;if(!img||!root.document)return '';
   const out=root.document.createElement('canvas'),edge=512;out.width=edge;out.height=edge;
   const ctx=out.getContext('2d'),{w,h}=coverOf(img,zoom),ratio=edge/size;
   ctx.drawImage(img,(edge-w*ratio)/2+offset.x*ratio,(edge-h*ratio)/2+offset.y*ratio,w*ratio,h*ratio);
   return out.toDataURL('image/png');
  };
  const onPointerDown=event=>{if(stage!=='upload'||!imageRef.current)return;event.preventDefault();dragRef.current={x:event.clientX,y:event.clientY,ox:offset.x,oy:offset.y};event.currentTarget.setPointerCapture?.(event.pointerId);};
  const onPointerMove=event=>{const drag=dragRef.current,img=imageRef.current;if(!drag||!img)return;const rect=event.currentTarget.getBoundingClientRect(),scale=size/Math.max(1,rect.width);setOffset(clamp(zoom,drag.ox+(event.clientX-drag.x)*scale,drag.oy+(event.clientY-drag.y)*scale,img));};
  const onPointerUp=event=>{dragRef.current=null;event.currentTarget.releasePointerCapture?.(event.pointerId);};
  const onFile=event=>{
   const input=event.currentTarget,file=input.files?.[0];input.value='';if(!file)return;
   if(!['image/png','image/jpeg','image/webp'].includes(file.type)){setError('头像仅支持 PNG、JPG 或 WebP 图片');return;}
   if(file.size>1024*1024){setError('头像图片请小于 1 MB');return;}
   const reader=new FileReader();reader.onerror=()=>setError('头像读取失败，请重新选择');
   reader.onload=()=>{const img=new Image();img.onerror=()=>setError('头像读取失败，请重新选择');img.onload=()=>{imageRef.current=img;setZoom(1);setOffset({x:0,y:0});setStage('upload');setTick(value=>value+1);setError('');};img.src=String(reader.result);};
   reader.readAsDataURL(file);
  };
  const useDefault=()=>{setDraft('');setStage('default');setError('');};
  const submit=()=>{
   if(stage==='idle'){onCancel();return;}
   let value=draft;
   if(stage==='upload'){try{value=exportUpload();}catch(e){value='';}if(!value){setError('头像处理失败，请重新选择图片');return;}}
   setError('');onSave(value);
  };
  const previewSrc=stage==='default'?'':draft;
  const stageNode=stage==='upload'
   ?h('canvas',{ref:canvasRef,width:size,height:size,className:'eva-avatar-editor__canvas',onPointerDown,onPointerMove,onPointerUp,onPointerCancel:onPointerUp})
   :previewSrc?h('img',{className:'eva-avatar-editor__preview',src:previewSrc,alt:'',draggable:false}):h('span',{className:'eva-avatar-editor__placeholder'},'将使用系统默认头像');
  // Common product pattern: the circular avatar itself opens the file picker.
  const pickable=stage!=='upload',pick=()=>{if(pickable)fileRef.current?.click();};
  const stageProps=pickable?{onClick:pick,role:'button',tabIndex:0,title:'上传头像','aria-label':'上传头像',onKeyDown:event=>{if(event.key==='Enter'||event.key===' '){event.preventDefault();pick();}}}:{};
  return h('div',{className:'eva-avatar-editor','aria-label':'更换头像'},
   h('header',{className:'eva-avatar-editor__head'},h('h2',null,'更换头像')),
   h('div',{className:'eva-avatar-editor__stage'+(pickable?' eva-avatar-editor__stage--pick':''),...stageProps},
    stageNode,
    pickable&&CameraIcon&&h('span',{className:'eva-avatar-editor__overlay','aria-hidden':true},h(CameraIcon,{size:20}),h('span',null,'点击更换'))),
   h('p',{className:'eva-avatar-editor__hint'},stage==='upload'?'拖拽调整位置，拖动滑块缩放，保存后导出正方形头像。':'点击圆形区域上传图片，支持 PNG / JPG / WebP，小于 1 MB。'),
   stage==='upload'&&h('label',{className:'eva-avatar-editor__zoom'},h('span',null,'缩放'),h('input',{type:'range',min:'1',max:'3',step:'0.01',value:zoom,'aria-label':'头像缩放',onChange:event=>{const next=Number(event.target.value)||1;setZoom(next);if(imageRef.current)setOffset(currentOffset=>clamp(next,currentOffset.x,currentOffset.y,imageRef.current));}})),
   h('input',{ref:fileRef,type:'file',hidden:true,accept:'image/png,image/jpeg,image/webp','aria-label':'选择头像图片',onChange:onFile}),
   error&&h('p',{className:'eva-person-card__error',role:'alert'},error),
   h('footer',{className:'eva-avatar-editor__footer'},
    h(Button,{className:'eva-avatar-editor__restore',theme:'borderless',type:'tertiary',size:'small',onClick:useDefault},'恢复默认头像'),
    h('span',{className:'eva-avatar-editor__gap','aria-hidden':true}),
    h(Button,{theme:'borderless',type:'tertiary',size:'small',onClick:onCancel},'取消'),
    h(Button,{theme:'solid',type:'primary',onClick:submit},'保存')));
 }
 function ProjectIdentity({project,name}){
  const label=name||project?.name||project?.projectName||'',appearance=root.EvaProjectAppearance.css(project||{});
  return h('span',{className:'eva-project-identity',title:label},h(ProjectIcon,{size:16,style:{color:appearance.accent},'aria-hidden':true}),h('span',{className:'eva-project-identity__name'},label));
 }
 function IdentityCard({identity,onClose,startAvatarEditing}){
  const navigate=useNavigate();
  // 资料卡可能从侧栏底部账号菜单打开。宿主挂到 body，避免模态被侧栏的层叠上下文
  // 压到内容区之下；投影范围仍由 .eva-identity-portal 的 topbar 偏移控制。
  const [popupHost,setPopupHost]=R.useState(null);
  R.useLayoutEffect(()=>{const host=root.document.createElement('div');host.className='eva-identity-portal';root.document.body.appendChild(host);setPopupHost(host);return()=>host.remove();},[]);
  const popupContainer=R.useCallback(()=>popupHost,[popupHost]);
  R.useSyncExternalStore(store.subscribe,store.getSnapshot);
  R.useSyncExternalStore(root.EvaAITeam.subscribe,root.EvaAITeam.getSnapshot);
  R.useSyncExternalStore(root.EvaDigitalEmployeesStore.subscribe,root.EvaDigitalEmployeesStore.getSnapshot);
  const [ownerId,setOwnerId]=R.useState(null),[error,setError]=R.useState('');
  const [avatarEditing,setAvatarEditing]=R.useState(!!startAvatarEditing),[avatarError,setAvatarError]=R.useState('');
  const id=typeof identity==='string'?identity:identity?.id||identity?.uid;
  const actor=store.snapshot().actorId;
  R.useEffect(()=>{setOwnerId(null);setError('');setAvatarEditing(!!startAvatarEditing);setAvatarError('');},[id,actor,startAvatarEditing]);
  const profile=model.resolve(ownerId||id),owner=profile?.owner&&model.resolve(profile.owner.id);
  // Portrait ownership follows the identity data: self, clone owner, or the
  // assistant owner. Employees, project agents and squads never expose editing.
  const canEditAvatar=!!profile&&((profile.kind==='human'&&profile.id===actor)||(profile.kind==='clone'&&profile.owner?.id===actor)||profile.kind==='assistant');
  const saveAvatar=value=>{try{
   if(profile.kind==='human')store.setPersonAvatar(actor,value);
   else if(profile.kind==='clone')store.setCloneAvatar(actor,profile.owner.id,value);
   else if(profile.kind==='assistant')root.EvaAITeam.setAssistantAvatar(profile.id,value);
   // 头像编辑器是终态：保存成功后直接关闭整个资料卡，不回到资料视图。
   onClose();
  }catch(e){setAvatarError(e.message);}};
  const action=()=>{try{
   const current=model.resolve(ownerId||id);if(!current?.action)throw Error('当前身份不可联系，请关闭后重试。');
   const url=current.action.personId?'/messages?evaDM='+encodeURIComponent(store.openDirect(actor,current.action.personId)):current.action.url;
   onClose();navigate(url);
  }catch(e){setError(e.message);}};
  const openProject=()=>{
   if(!store.canRead(profile.project.id,store.snapshot().actorId)){setError('当前无法访问该项目。');return;}
   onClose();navigate('/collab?evaProject='+encodeURIComponent(profile.project.id));
  };
  const field=(label,value,multiline=false)=>h('div',{className:'eva-person-card__field'+(multiline?' eva-person-card__field--multiline':''),key:label},h('dt',null,label),h('dd',null,value));
  const hasDetails=owner||profile?.description||profile?.ownership||profile?.project;
  return h(R.Fragment,null,id&&(popupHost||!root.document)&&h(Modal,{
   visible:true,centered:true,getPopupContainer:popupContainer,className:'eva-person-card-modal',width:440,title:null,
   'aria-label':profile?profile.name+'的资料':'身份资料',onCancel:onClose,footer:null,maskClosable:true
  },h('article',{className:'eva-person-card'},
   ownerId&&!avatarEditing&&h(Button,{className:'eva-person-card__back',theme:'borderless',type:'tertiary',size:'small',icon:h(BackIcon,{size:16}),onClick:()=>{setOwnerId(null);setError('');}},'返回'),
   avatarEditing&&profile&&canEditAvatar?h('div',{className:'eva-avatar-editor__host'},
     h(AvatarEditor,{current:profile.appearance?profile.appearance.avatar:profile.avatar,label:profile.name,onCancel:onClose,onSave:saveAvatar}),
     avatarError&&h('p',{className:'eva-person-card__error',role:'alert'},avatarError))
   :profile?h(R.Fragment,null,
    h('div',{className:'eva-person-card__scroll'},
     h('header',{className:'eva-person-card__identity'},
      h('div',{className:'eva-person-card__avatar'},h(Appearance,{profile,size:56}),canEditAvatar&&CameraIcon&&h('button',{type:'button',className:'eva-person-card__avatar-edit','aria-label':'更换头像',title:'更换头像',onClick:()=>{setAvatarError('');setAvatarEditing(true);}},h(CameraIcon,{size:14}))),
      h('div',{className:'eva-person-card__name-row'},h('h2',{title:profile.name},profile.name),profile.kind!=='human'&&root.EvaAIIdentity.badge(h)),
      profile.subtitle&&h('p',{className:'eva-person-card__type'},profile.subtitle)),
     hasDetails&&h('dl',{className:'eva-person-card__details'},
      owner&&field('所属人',h(Button,{className:'eva-person-card__person-link',theme:'borderless',type:'tertiary','aria-label':'所属人：'+owner.name,onClick:()=>setOwnerId(owner.id)},h(Appearance,{profile:owner,size:24}),h('span',null,owner.name))),
      profile.description&&field('简介',h('p',null,profile.description),true),
      profile.ownership&&field('归属',profile.ownership),
      profile.project&&field('所属项目',h(Button,{className:'eva-person-card__project-link',theme:'borderless',type:'tertiary',onClick:openProject},h(ProjectIdentity,{project:profile.project}))))),
    (profile.action||profile.hint||error)&&h('footer',{className:'eva-person-card__actions'},
     error&&h('p',{role:'alert',className:'eva-person-card__error'},error),
     profile.action?h(Button,{theme:'solid',type:'primary',block:true,onClick:action},profile.action.label):profile.hint&&h('p',{className:'eva-person-card__hint'},profile.hint))
   ):h('p',{className:'eva-person-card__unavailable',role:'status'},'该身份已不可用，或当前账号无权查看。'))));
 }
 return {IdentityCard,IdentityAppearance:Appearance,ProjectIdentity,identityModel:model};
}};
})(window);
