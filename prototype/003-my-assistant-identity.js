
window.__EVA_MY_ASSISTANT_IDENTITY = Object.freeze({
  name: '王宜林的 AI 分身',
  ownerName: '王宜林',
  ownerId: 'u-wangyilin',
  logo: window.__EVA_COLLEAGUE_PORTRAIT
});
window.__EVA_MY_ASSISTANTS = Object.freeze([
  window.__EVA_MY_ASSISTANT_IDENTITY
]);

/* One identity contract for React and legacy HTML surfaces. */
window.EvaAIIdentity = (() => {
  const escape = value => String(value ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const html = (tag, props, ...children) => '<'+tag+Object.entries(props||{}).map(([key,value])=>{
    if(value==null)return '';
    if(key==='style')value=Object.entries(value).map(([k,v])=>k+':'+v).join(';');
    return ' '+(key==='className'?'class':key)+'="'+escape(value)+'"';
  }).join('')+'>'+children.join('')+(tag==='img'?'':'</'+tag+'>');
  // Owner portrait is the authoritative data source for the clone (owner main image).
  const ownerPortrait = owner => {
    if(!owner) return null;
    if(owner.avatar) return owner.avatar;
    const key = owner.id || owner.name;
    if(key && window.EvaAvatar && window.EvaAvatar.personUri) return window.EvaAvatar.personUri(key);
    return window.__EVA_CURRENT_USER_PORTRAIT || null;
  };
  // Personal assistants pick an emoji/icon as their own image; clones keep the owner portrait.
  const ASSISTANT_ICONS = ['✨','🌱','🍀','🐱','🐼','🦊','🐣','🍌','🎯','📎','🧭','💡','🚀','🧩','📚','🎨','☕','🛠️'];
  const AVATAR_IMAGE_PATTERN = /^(?:https:\/\/\S+|data:image\/(?:png|jpeg|webp|gif);base64,[A-Za-z0-9+/=]+)$/;
  const isAvatarImage = value => typeof value === 'string' && AVATAR_IMAGE_PATTERN.test(value.trim());
  const isAssistantIcon = value => { const text = typeof value === 'string' ? value.trim() : ''; return !!text && text.length <= 16 && !/[\u0000-\u001f]/.test(text) && !isAvatarImage(text); };
  const assistantIcons = () => ASSISTANT_ICONS.slice();
  // Owned AI renders a main image plus the Eva logo as the bottom-right corner.
  function avatar(appearance, size=32, render=html) {
    const label=appearance.markerKind==='bot'?appearance.name+'，Eva 云端项目 AI':appearance.name+'，来自'+(appearance.sourceName||'Eva');
    const icon=appearance.icon||null;
    const image=appearance.ownerAvatar||appearance.avatar||appearance.logo;
    const main=icon||image;
    const corner=appearance.evaCorner?(window.__EVA_COLLEAGUE_PORTRAIT||null):null;
    const showCorner=!!corner&&main!==corner;
    const children=[icon
      ?render('span',{className:'eva-identity-avatar__icon','aria-hidden':'true'},render===html?escape(icon):icon)
      :render('img',{className:'eva-identity-avatar__logo',src:image,alt:'',draggable:false})];
    if(showCorner)children.push(render('img',{className:'eva-identity-avatar__owner',src:corner,alt:'',draggable:false}));
    return render('span',{className:'eva-identity-avatar',role:'img','aria-label':label,title:label,style:{'--eva-identity-avatar-size':size+'px',...(appearance.project?{'--eva-identity-avatar-background':window.EvaProjectAppearance.css(appearance.project).surface}:{})}},...children);
  }
  function badge(render=html,className='') {return render('span',{className:'ai-badge ai-badge-small'+(className?' '+className:'')},'AI');}
  // Fixed clone identity comes from its owner; detail retains the navigable relationship.
  function ownerLabel(profile, render=html) {
    if(profile?.kind!=='clone'||!profile.owner?.name)return null;
    const text='所属人：'+profile.owner.name;
    return render('span',{className:'eva-identity-owner',title:text},render===html?escape(text):text);
  }
  // Default assistant main image is the owner portrait; picking an icon replaces it.
  const assistantOwnerPortrait = () => ownerPortrait({name:window.__EVA_MY_ASSISTANT_IDENTITY?.ownerName,id:window.__EVA_MY_ASSISTANT_IDENTITY?.ownerId});
  function assistantAppearance(identity){const logo=window.__EVA_COLLEAGUE_PORTRAIT;const value=identity?.configuration?.avatar;const appearance={name:identity.name,sourceName:'Eva',sourceAssistantId:identity.sourceAssistantId,logo,evaCorner:true,kind:'assistant'};if(isAssistantIcon(value))appearance.icon=value.trim();else if(isAvatarImage(value))appearance.avatar=value.trim();else appearance.ownerAvatar=assistantOwnerPortrait();return appearance;}
  function cloneName(owner){return String(owner?.name||'未知成员')+'的 AI 分身';}
  // The clone main image is one global property resolved by stable owner ID: the
  // owner may upload a replacement, otherwise the owner portrait is shown. The Eva
  // logo stays as the bottom-right corner in both cases.
  let cloneAvatarResolver=()=>'';
  function setCloneAvatarResolver(resolve){cloneAvatarResolver=typeof resolve==='function'?resolve:()=>'';}
  function cloneAppearance(owner){
    const ownerId=owner?.id||owner?.ownerId||'',custom=ownerId?cloneAvatarResolver(ownerId):'',logo=window.__EVA_COLLEAGUE_PORTRAIT;
    return {name:cloneName(owner),sourceName:'Eva',ownerName:owner?.name,ownerAvatar:custom||ownerPortrait(owner),avatar:custom||logo,logo,evaCorner:true,kind:'clone'};
  }
  function projectAgentName(project){return project?.name?String(project.name)+' · 项目管家':'项目管家';}
  function projectAgentLegacyNames(project){return ['Eva 项目管理专员','Eva 项目助手',...(project?.name?[String(project.name)+'项目管家']:[])];}
  function projectAgentAppearance(project){return {project:project?{id:project.id,colorKey:window.EvaProjectAppearance.keyFor(project)}:undefined,name:projectAgentName(project),sourceName:'Eva',avatar:'prototype/assets/project-agent-bot.svg',logo:window.__EVA_COLLEAGUE_PORTRAIT,markerKind:'bot'};}
  return Object.freeze({avatar,badge,ownerLabel,assistantAppearance,assistantIcons,isAvatarImage,isAssistantIcon,cloneName,cloneAppearance,setCloneAvatarResolver,projectAgentName,projectAgentLegacyNames,projectAgentAppearance});
})();
