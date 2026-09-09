/* Shared Eva identity card. Semi owns modal focus and portal lifecycle;
 * identity projections own fields and permissions; React owns the return stack.
 */
(function(root){
'use strict';
root.EvaIdentityCard={create({React:R,Modal,Button,BackIcon,useNavigate},store){
 const h=R.createElement,model=root.EvaContactIdentities.create(store);
 function Appearance({profile,size=32}){
  return profile.appearance?root.EvaAIIdentity.avatar(profile.appearance,size,h):h('img',{className:'eva-profile-human-avatar',src:profile.avatar,alt:'',width:size,height:size});
 }
 function IdentityCard({identity,onClose}){
  const navigate=useNavigate(),popupHost=R.useRef(null);
  const popupContainer=R.useCallback(()=>popupHost.current,[]);
  R.useSyncExternalStore(store.subscribe,store.getSnapshot);
  R.useSyncExternalStore(root.EvaAITeam.subscribe,root.EvaAITeam.getSnapshot);
  R.useSyncExternalStore(root.EvaDigitalEmployeesStore.subscribe,root.EvaDigitalEmployeesStore.getSnapshot);
  const [ownerId,setOwnerId]=R.useState(null),[error,setError]=R.useState('');
  const id=typeof identity==='string'?identity:identity?.id||identity?.uid;
  const actor=store.snapshot().actorId;
  R.useEffect(()=>{setOwnerId(null);setError('');},[id,actor]);
  const profile=model.resolve(ownerId||id),owner=profile?.owner&&model.resolve(profile.owner.id);
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
  return h(R.Fragment,null,h('div',{ref:popupHost,className:'eva-identity-portal'}),id&&h(Modal,{
   visible:true,centered:true,getPopupContainer:popupContainer,className:'eva-person-card-modal',width:440,title:null,
   'aria-label':profile?profile.name+'的资料':'身份资料',onCancel:onClose,footer:null,maskClosable:true
  },h('article',{className:'eva-person-card'},
   ownerId&&h(Button,{className:'eva-person-card__back',theme:'borderless',type:'tertiary',size:'small',icon:h(BackIcon,{size:16}),onClick:()=>{setOwnerId(null);setError('');}},'返回'),
   profile?h(R.Fragment,null,
    h('div',{className:'eva-person-card__scroll'},
     h('header',{className:'eva-person-card__identity'},
      h(Appearance,{profile,size:56}),
      h('div',{className:'eva-person-card__name-row'},h('h2',{title:profile.name},profile.name),profile.kind!=='human'&&root.EvaAIIdentity.badge(h)),
      profile.subtitle&&h('p',{className:'eva-person-card__type'},profile.subtitle)),
     hasDetails&&h('dl',{className:'eva-person-card__details'},
      owner&&field('所属人',h(Button,{className:'eva-person-card__person-link',theme:'borderless',type:'tertiary','aria-label':'所属人：'+owner.name,onClick:()=>setOwnerId(owner.id)},h(Appearance,{profile:owner,size:24}),h('span',null,owner.name))),
      profile.description&&field('简介',h('p',null,profile.description),true),
      profile.ownership&&field('归属',profile.ownership),
      profile.project&&field('服务项目',h(Button,{className:'eva-person-card__project-link',theme:'borderless',type:'tertiary',onClick:openProject},profile.project.name)))),
    (profile.action||profile.hint||error)&&h('footer',{className:'eva-person-card__actions'},
     error&&h('p',{role:'alert',className:'eva-person-card__error'},error),
     profile.action?h(Button,{theme:'solid',type:'primary',block:true,onClick:action},profile.action.label):profile.hint&&h('p',{className:'eva-person-card__hint'},profile.hint))
   ):h('p',{className:'eva-person-card__unavailable',role:'status'},'该身份已不可用，或当前账号无权查看。'))));
 }
 return {IdentityCard,IdentityAppearance:Appearance,identityModel:model};
}};
})(window);
