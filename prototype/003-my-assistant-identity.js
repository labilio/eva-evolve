
window.__EVA_MY_ASSISTANT_IDENTITY = Object.freeze({
  name: '王宜林的 AI 分身',
  ownerName: '王宜林',
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
  function avatar(appearance, size=32, render=html) {
    const label=appearance.markerKind==='bot'?appearance.name+'，Eva 云端项目 AI':appearance.name+'，来自'+(appearance.sourceName||'Eva');
    const src=appearance.avatar||appearance.logo;
    return render('span',{className:'eva-identity-avatar',role:'img','aria-label':label,title:label,style:{'--eva-identity-avatar-size':size+'px',...(appearance.project?{'--eva-identity-avatar-background':window.EvaProjectAppearance.css(appearance.project).surface}:{})}},
      render('img',{className:'eva-identity-avatar__logo',src,alt:''}));
  }
  function badge(render=html,className='') {return render('span',{className:'ai-badge ai-badge-small'+(className?' '+className:'')},'AI');}
  // Fixed clone identity comes from its owner; detail retains the navigable relationship.
  function ownerLabel(profile, render=html) {
    if(profile?.kind!=='clone'||!profile.owner?.name)return null;
    const text='所属人：'+profile.owner.name;
    return render('span',{className:'eva-identity-owner',title:text},render===html?escape(text):text);
  }
  function cloneName(owner){return String(owner?.name||'未知成员')+'的 AI 分身';}
  function cloneAppearance(owner){return {name:cloneName(owner),sourceName:'Eva',avatar:window.__EVA_COLLEAGUE_PORTRAIT,logo:window.__EVA_COLLEAGUE_PORTRAIT};}
  function projectAgentName(project){return project?.name?String(project.name)+' · 项目管家':'项目管家';}
  function projectAgentLegacyNames(project){return ['Eva 项目管理专员','Eva 项目助手',...(project?.name?[String(project.name)+'项目管家']:[])];}
  function projectAgentAppearance(project){return {project:project?{id:project.id,colorKey:window.EvaProjectAppearance.keyFor(project)}:undefined,name:projectAgentName(project),sourceName:'Eva',avatar:'prototype/assets/project-agent-bot.svg',logo:window.__EVA_COLLEAGUE_PORTRAIT,markerKind:'bot'};}
  return Object.freeze({avatar,badge,ownerLabel,cloneName,cloneAppearance,projectAgentName,projectAgentLegacyNames,projectAgentAppearance});
})();
