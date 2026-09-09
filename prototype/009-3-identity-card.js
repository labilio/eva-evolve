/* Apache-2.0. Adapted from Octo-Web c2e2aeed2d7027e3aa25f8c726798eb7cdba2463:
 * ui/profileDetail/ProfileDetailShell (shell/header/footer) and UserInfoView.
 * Eva uses Semi Modal for focus/portal lifecycle, Lucide controls, and shared identities.
 */
(function(root){
'use strict';
root.EvaIdentityCard={create({React:R,Modal,Button,BackIcon,useNavigate},store){
 const h=R.createElement,model=root.EvaContactIdentities.create(store);
 function Appearance({profile,size=48}){
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
  const profile=model.resolve(ownerId||id);
  const action=()=>{try{
   const current=model.resolve(ownerId||id);if(!current?.action)throw Error('当前身份不可联系，请关闭后重试。');
   const url=current.action.personId?'/messages?evaDM='+encodeURIComponent(store.openDirect(actor,current.action.personId)):current.action.url;
   onClose();navigate(url);
  }catch(e){setError(e.message);}};
  return h(R.Fragment,null,h('div',{ref:popupHost,className:'eva-identity-portal'}),id&&h(Modal,{visible:true,getPopupContainer:popupContainer,className:'eva-members-modal eva-profile-modal',width:400,title:ownerId?h(Button,{theme:'borderless',type:'tertiary',icon:h(BackIcon,{size:18}),onClick:()=>{setOwnerId(null);setError('');}},'返回 AI 资料'):'身份资料',onCancel:onClose,footer:null,maskClosable:true},
   h('div',{className:'wk-profile-detail eva-profile-detail'},profile?h(R.Fragment,null,
    h('div',{className:'wk-profile-detail-scroll'},
     h('div',{className:'wk-profile-detail-header'},h('div',{className:'wk-profile-detail-avatar'},h(Appearance,{profile,size:56})),h('div',{className:'wk-profile-detail-heading'},h('div',{className:'wk-profile-detail-title'},h('span',{className:'wk-profile-detail-title-text',title:profile.name},profile.name),profile.kind!=='human'&&root.EvaAIIdentity.badge(h)),profile.owner?h('div',{className:'wk-profile-detail-subtitle'},h('button',{className:'eva-profile-owner',type:'button',onClick:()=>setOwnerId(profile.owner.id)},h(Appearance,{profile:model.resolve(profile.owner.id),size:28}),root.EvaAIIdentity.ownerLabel(profile,h))):profile.subtitle&&h('div',{className:'wk-profile-detail-subtitle'},profile.subtitle))),
     profile.description&&h('section',{className:'eva-profile-section'},h('div',{className:'eva-profile-label'},'简介'),h('p',null,profile.description)),
     profile.owner&&profile.subtitle&&h('div',{className:'wk-profile-detail-subtitle'},profile.subtitle),
     profile.ownership&&h('section',{className:'eva-profile-section eva-profile-meta'},h('span',{className:'eva-profile-label'},'归属'),h('span',null,profile.ownership)),
     profile.project&&h('section',{className:'eva-profile-section eva-profile-meta'},h('span',{className:'eva-profile-label'},'服务项目'),h('button',{type:'button',className:'eva-profile-link',onClick:()=>{if(!store.canRead(profile.project.id,store.snapshot().actorId)){setError('当前无法访问该项目。');return;}onClose();navigate('/collab?evaProject='+encodeURIComponent(profile.project.id));}},profile.project.name))),
    (profile.action||profile.hint||error)&&h('div',{className:'wk-profile-detail-footer'},error&&h('p',{role:'alert',className:'eva-members-error'},error),profile.action?h('div',{className:'wk-profile-detail-footer-action'},h(Button,{theme:'solid',block:true,onClick:action},profile.action.label)):h('div',{className:'wk-profile-detail-footer-hint'},profile.hint))
   ):h('p',{className:'eva-profile-unavailable',role:'status'},'该身份已不可用，或当前账号无权查看。'))));
 }
 return {IdentityCard,IdentityAppearance:Appearance,identityModel:model};
}};
})(window);
