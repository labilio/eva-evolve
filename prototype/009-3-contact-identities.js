/* Shared identity projection. No UI state, name inference, or membership grants. */
(function(root){
'use strict';
root.EvaContactIdentities={create(store,{team=root.EvaAITeam,digital=root.EvaDigitalEmployeesStore,ownerId='u-wangyilin'}={}){
 const portrait=id=>id==='u-wangyilin'?root.__EVA_CURRENT_USER_PORTRAIT:root.EvaAvatar.personUri(id);
 const link=(label,url)=>({label,url});
 function resolve(ref){
  const id=typeof ref==='string'?ref:ref?.id||ref?.uid;if(!id)return null;
  const actor=store.snapshot().actorId;
  const human=store.person(id);
  if(human)return {id,name:human.name,kind:'human',departmentL2:human.departmentL2||root.__EVA_CONTACT_L2_DEPARTMENTS?.[id]||'数智化中心',avatar:portrait(id),owner:null,action:id===actor?null:{label:'发消息',personId:id}};
  const alias=team?.getSnapshot().identityAliases?.[id]||root.__EVA_CONTACT_IDENTITY_ALIASES?.[id];
  if(alias)return resolve(alias);
  const persona=team?.getSnapshot().identities.find(i=>i.id===id&&i.role==='persona');
  const clone=store.clone(id)||root.__EVA_CONTACT_PERSONAS?.find(i=>i.id===id);
  if(persona||clone){
   const p=persona||clone,owner=store.person(persona?ownerId:p.ownerId);
   const appearance=root.EvaAIIdentity.cloneAppearance(owner);
   return {id:p.id,name:appearance.name,kind:'clone',subtitle:'云端分身',description:p.configuration?.description||p.description||'',appearance,owner:owner?{id:owner.id,name:owner.name}:null,action:persona&&actor===ownerId?link('进入对话','/messages?evaIM=my-ai&evaIdentity='+encodeURIComponent(id)):null,hint:persona&&actor!==ownerId?'请使用本人账号进入自己的分身对话。':!persona?'可在已加入的项目群中 @ 协作。':''};
  }
  const employee=digital?.get(id);
  if(employee?.kind==='staff'){
   const personal=employee.ownership==='personal'||employee.scope==='self';
   const allowed=actor===ownerId&&(!personal||employee.by===actor)&&digital.hasInTeam(id);
   const pid=employee.projectId,project=pid&&store.canRead(pid,actor)?store.snapshot().projects[pid]:null;
   if(employee.ownership==='project'&&!project)return null;
   return {id,name:employee.name,kind:'employee',subtitle:'数字员工',description:employee.desc||employee.one||'',appearance:digital.appearance(employee),owner:null,ownership:personal?'个人创建':employee.ownership==='project'?'项目专属':'公共数字员工',project,action:allowed?link('进入对话','/messages?evaIM=my-ai&evaIdentity='+encodeURIComponent(id)):null,hint:allowed?'':actor===ownerId&&!digital.hasInTeam(id)?'可先在数字员工市场添加到我的 AI。':'当前账号未开放个人对话。'};
  }
  if(id.startsWith('project-agent:')){
   const pid=id.slice('project-agent:'.length),agent=store.projectAgent(pid);
   if(!agent||!store.canRead(pid,actor))return null;
   return {id,name:agent.name,kind:'project-agent',subtitle:'项目 AI',description:'同步项目事项、提醒与进展汇总，可以主动通知项目成员。项目群中可 @ 协作。',appearance:agent.identityAppearance||root.EvaAIIdentity.projectAgentAppearance(),owner:null,project:store.snapshot().projects[pid],action:link('进入项目','/collab?evaProject='+encodeURIComponent(pid))};
  }
  return null;
 }
 function directory(){
  const s=store.snapshot();
  return s.people.filter(p=>p.active!==false&&(!root.__EVA_MEMBER_DEMO_IDS||root.__EVA_MEMBER_DEMO_IDS.includes(p.id))).map(p=>{
   const ids=p.id===ownerId?team.getSnapshot().identities.filter(i=>i.role==='persona').map(i=>i.id):[...s.clones.filter(c=>c.ownerId===p.id&&c.active!==false).map(c=>c.id),...(root.__EVA_CONTACT_PERSONAS||[]).filter(c=>c.ownerId===p.id).map(c=>c.id)];
   return {person:resolve(p.id),personas:[...new Set(ids)].map(resolve).filter(Boolean)};
  });
 }
 return {resolve,directory,portrait};
}};
})(window);
