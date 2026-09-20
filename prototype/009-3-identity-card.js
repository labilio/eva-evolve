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
 // One upload contract for every local avatar image: valid PNG/JPG/WebP, then a
 // circular crop confirmed with 取消 / 保存 and stored as a 512×512 PNG.
 const AVATAR_MAX_BYTES=5*1024*1024,AVATAR_UPLOAD_TYPES=['image/png','image/jpeg','image/webp'];
 function readAvatarFile(file,maxBytes=AVATAR_MAX_BYTES){
  return new Promise((resolve,reject)=>{
   if(!file)return reject(Error('未选择图片'));
   if(!AVATAR_UPLOAD_TYPES.includes(file.type))return reject(Error('头像仅支持 PNG、JPG 或 WebP 图片'));
   if(file.size>maxBytes)return reject(Error('头像图片请不超过 '+Math.round(maxBytes/1024/1024)+' MB'));
   const reader=new FileReader();reader.onerror=()=>reject(Error('头像读取失败，请重新选择'));
   reader.onload=()=>{const img=new Image();img.onerror=()=>reject(Error('头像读取失败，请重新选择'));img.onload=()=>resolve(img);img.src=String(reader.result);};
   reader.readAsDataURL(file);
  });
 }
 // Shared circular-crop editor for every avatar entry. Idle shows the current image and
 // picking opens the crop; `initialImage` opens straight into the crop. `bare` drops the
 // internal header for hosts (e.g. the group-avatar modal) that already render a title.
 function AvatarEditor({current,initialImage,onCancel,onSave,bare=false}){
  const [stage,setStage]=R.useState(initialImage?'crop':'idle');
  const [zoom,setZoom]=R.useState(1),[offset,setOffset]=R.useState({x:0,y:0}),[tick,setTick]=R.useState(0),[error,setError]=R.useState('');
  const canvasRef=R.useRef(null),imageRef=R.useRef(initialImage||null),fileRef=R.useRef(null),dragRef=R.useRef(null);
  const size=240;
  const coverOf=(img,nextZoom)=>{const scale=Math.max(size/img.width,size/img.height)*(nextZoom||1);return {w:img.width*scale,h:img.height*scale};};
  const clamp=(nextZoom,x,y,img)=>{const {w,h}=coverOf(img,nextZoom),maxX=Math.max(0,(w-size)/2),maxY=Math.max(0,(h-size)/2);return {x:Math.max(-maxX,Math.min(maxX,x)),y:Math.max(-maxY,Math.min(maxY,y))};};
  R.useEffect(()=>{
   const canvas=canvasRef.current,img=stage==='crop'?imageRef.current:null;
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
  // 裁剪页才出现页脚：取消放弃裁剪，保存按当前裁剪写回并关闭资料卡。
  const submit=()=>{let value='';try{value=exportUpload();}catch(e){value='';}if(!value){setError('头像处理失败，请重新选择图片');return;}setError('');onSave(value);};
  const onPointerDown=event=>{if(stage!=='crop'||!imageRef.current)return;event.preventDefault();dragRef.current={x:event.clientX,y:event.clientY,ox:offset.x,oy:offset.y};event.currentTarget.setPointerCapture?.(event.pointerId);};
  const onPointerMove=event=>{const drag=dragRef.current,img=imageRef.current;if(!drag||!img)return;const rect=event.currentTarget.getBoundingClientRect(),scale=size/Math.max(1,rect.width);setOffset(clamp(zoom,drag.ox+(event.clientX-drag.x)*scale,drag.oy+(event.clientY-drag.y)*scale,img));};
  const onPointerUp=event=>{dragRef.current=null;event.currentTarget.releasePointerCapture?.(event.pointerId);};
  const onFile=event=>{
   const input=event.currentTarget,file=input.files?.[0];input.value='';if(!file)return;
   readAvatarFile(file).then(img=>{imageRef.current=img;setZoom(1);setOffset({x:0,y:0});setStage('crop');setTick(value=>value+1);setError('');},error=>setError(error.message));
  };
  const cropping=stage==='crop';
  const stageNode=cropping
   ?h('canvas',{ref:canvasRef,width:size,height:size,className:'eva-avatar-editor__canvas',onPointerDown,onPointerMove,onPointerUp,onPointerCancel:onPointerUp})
   :current?h('img',{className:'eva-avatar-editor__preview',src:current,alt:'',draggable:false}):h('span',{className:'eva-avatar-editor__placeholder'},'将使用系统默认头像');
  // Common product pattern: the circular avatar itself opens the file picker.
  const pickable=!cropping,pick=()=>{if(pickable)fileRef.current?.click();};
  const stageProps=pickable?{onClick:pick,role:'button',tabIndex:0,title:'上传头像','aria-label':'上传头像',onKeyDown:event=>{if(event.key==='Enter'||event.key===' '){event.preventDefault();pick();}}}:{};
  return h('div',{className:'eva-avatar-editor','aria-label':'更换头像'},
   !bare&&h('header',{className:'eva-avatar-editor__head'},h('h2',null,'更换头像')),
   h('div',{className:'eva-avatar-editor__stage'+(pickable?' eva-avatar-editor__stage--pick':''),...stageProps},
    stageNode,
    pickable&&CameraIcon&&h('span',{className:'eva-avatar-editor__overlay','aria-hidden':true},h(CameraIcon,{size:20}),h('span',null,'点击更换'))),
   h('p',{className:'eva-avatar-editor__hint'},cropping?'拖拽调整位置，拖动滑块缩放，点击保存。':'点击头像上传图片，不超过 5 MB'),
   cropping&&h('label',{className:'eva-avatar-editor__zoom'},h('span',null,'缩放'),h('input',{type:'range',min:'1',max:'3',step:'0.01',value:zoom,'aria-label':'头像缩放',onChange:event=>{const next=Number(event.target.value)||1;setZoom(next);if(imageRef.current)setOffset(currentOffset=>clamp(next,currentOffset.x,currentOffset.y,imageRef.current));}})),
   h('input',{ref:fileRef,type:'file',hidden:true,accept:'image/png,image/jpeg,image/webp','aria-label':'选择头像图片',onChange:onFile}),
   error&&h('p',{className:'eva-person-card__error',role:'alert'},error),
   cropping&&h('footer',{className:'eva-avatar-editor__footer'},
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
  const [avatarEditing,setAvatarEditing]=R.useState(!!startAvatarEditing),[avatarError,setAvatarError]=R.useState(''),[cropImage,setCropImage]=R.useState(null);
  const id=typeof identity==='string'?identity:identity?.id||identity?.uid;
  const actor=store.snapshot().actorId;
  R.useEffect(()=>{setOwnerId(null);setError('');setAvatarEditing(!!startAvatarEditing);setAvatarError('');setCropImage(null);},[id,actor,startAvatarEditing]);
  const profile=model.resolve(ownerId||id),owner=profile?.owner&&model.resolve(profile.owner.id);
  // Portrait ownership follows the identity data: self, clone owner, or the
  // assistant owner. Employees, project agents and squads never expose editing.
  const canEditAvatar=!!profile&&((profile.kind==='human'&&profile.id===actor)||(profile.kind==='clone'&&profile.owner?.id===actor)||profile.kind==='assistant');
  const saveAvatar=(value,close=true)=>{try{
   if(profile.kind==='human')store.setPersonAvatar(actor,value);
   else if(profile.kind==='clone')store.setCloneAvatar(actor,profile.owner.id,value);
   else if(profile.kind==='assistant')root.EvaAITeam.setAssistantAvatar(profile.id,value);
   // 账号菜单入口保存后关闭整个资料卡；资料卡入口保存后回到身份页就地查看结果。
   if(close)onClose();
   return true;
  }catch(e){setAvatarError(e.message);return false;}};
  // 资料卡头像入口：无论本人还是 AI，都先选图进入同一个圆形裁剪，再由「取消 / 保存」确认。
  const avatarFileRef=R.useRef(null);
  const pickAvatar=()=>{setAvatarError('');avatarFileRef.current?.click();};
  const onAvatarFile=event=>{
   const input=event.currentTarget,file=input.files?.[0];input.value='';if(!file)return;
   readAvatarFile(file).then(img=>{setCropImage(img);setAvatarEditing(true);},error=>setAvatarError(error.message));
  };
  const closeEditor=()=>{setCropImage(null);if(startAvatarEditing)onClose();else setAvatarEditing(false);};
  const finishAvatar=value=>{const fromMenu=!!startAvatarEditing;if(!saveAvatar(value,fromMenu))return;setCropImage(null);if(!fromMenu)setAvatarEditing(false);};
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
     h(AvatarEditor,{current:profile.appearance?profile.appearance.avatar:profile.avatar,initialImage:cropImage,onCancel:closeEditor,onSave:finishAvatar}),
     avatarError&&h('p',{className:'eva-person-card__error',role:'alert'},avatarError))
   :profile?h(R.Fragment,null,
    h('div',{className:'eva-person-card__scroll'},
     h('header',{className:'eva-person-card__identity'},
      h('div',{className:'eva-person-card__avatar'},h(Appearance,{profile,size:56}),canEditAvatar&&CameraIcon&&h(R.Fragment,null,
       h('button',{type:'button',className:'eva-person-card__avatar-edit','aria-label':'更换头像',onClick:pickAvatar},h(CameraIcon,{size:20})),
       h('input',{ref:avatarFileRef,type:'file',hidden:true,accept:'image/png,image/jpeg,image/webp','aria-label':'选择头像图片',onChange:onAvatarFile}))),
      h('div',{className:'eva-person-card__name-row'},h('h2',{title:profile.name},profile.name),profile.kind!=='human'&&root.EvaAIIdentity.badge(h)),
      profile.subtitle&&h('p',{className:'eva-person-card__type'},profile.subtitle)),
     avatarError&&h('p',{className:'eva-person-card__error',role:'alert'},avatarError),
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
 return {IdentityCard,IdentityAppearance:Appearance,ProjectIdentity,identityModel:model,AvatarEditor,readAvatarFile};
}};
})(window);
