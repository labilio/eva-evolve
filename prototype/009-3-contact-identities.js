/* Shared identity projection. No UI state, name inference, or membership grants. */
(function(root){
'use strict';
const nameCollator=new Intl.Collator('zh-Hans-CN',{collation:'pinyin'});
root.EvaContactIdentities={create(store,{team=root.EvaAITeam,digital=root.EvaDigitalEmployeesStore,ownerId='u-wangyilin'}={}){
 const portrait=id=>root.EvaAvatar.personUri(id);
 const link=(label,url)=>({label,url});
 function resolve(ref){
  const id=typeof ref==='string'?ref:ref?.id||ref?.uid;if(!id)return null;
  const actor=store.actorId();
  const human=store.person(id);
  if(human){const deptFull=human.deptFull||root.__EVA_ORG_UNITS?.[human.dept]||'';return {id,name:human.name,kind:'human',subtitle:'联系人',departmentL2:deptFull.split('/').filter(Boolean).pop()||human.dept||'',deptFull,avatar:portrait(id),owner:null,action:id===actor?null:{label:'发消息',personId:id}};}
  const alias=team?.getSnapshot().identityAliases?.[id]||root.__EVA_CONTACT_IDENTITY_ALIASES?.[id];
  if(alias)return resolve(alias);
  const persona=team?.getSnapshot().identities.find(i=>i.id===id&&i.role==='persona');
  const clone=store.clone(id)||root.__EVA_CONTACT_PERSONAS?.find(i=>i.id===id);
  if(persona||clone){
   const p=persona||clone,ownerRefId=persona?ownerId:p.ownerId,own=actor===ownerRefId,owner=store.person(ownerRefId);
   const appearance=root.EvaAIIdentity.cloneAppearance(owner);
   // 本人的分身可以直接私聊；他人分身仍只在已加入的项目群中 @ 协作，查看不授予私聊权限。
   return {id:p.id,name:appearance.name,kind:'clone',subtitle:'云端分身',appearance,owner:owner?{id:owner.id,name:owner.name}:null,action:own?link('发送消息','/messages?evaIM=my-ai&evaIdentity='+encodeURIComponent(p.id)):null,hint:own?undefined:persona&&actor!==ownerId?'请使用本人账号进入自己的分身对话。':'可在已加入的项目群中 @ 协作。'};
  }
  const assistant=team?.getSnapshot().identities.find(i=>i.id===id&&i.role==='assistant');
  if(assistant){
   if(actor!==ownerId)return null;
   return {id:assistant.id,name:assistant.name,kind:'assistant',subtitle:'个人助理',appearance:root.EvaAIIdentity.assistantAppearance(assistant),owner:null,action:link('进入对话','/messages?evaIM=my-ai&evaIdentity='+encodeURIComponent(assistant.id))};
  }
  const employee=digital?.get(id);
  if(employee?.kind==='staff'){
   const personal=employee.ownership==='personal'||employee.scope==='self';
   const allowed=actor===ownerId&&(!personal||employee.by===actor)&&digital.hasInTeam(id);
   const pid=employee.projectId,project=pid&&store.canRead(pid,actor)?store.projectRecord(pid):null;
   if(employee.ownership==='project'&&!project)return null;
   return {id,name:employee.name,kind:'employee',subtitle:'数字员工',description:employee.desc?.trim()||employee.one?.trim()||'',appearance:digital.appearance(employee),owner:null,ownership:personal?'个人创建':employee.ownership==='project'?'项目专属':'公共数字员工',project,action:allowed?link('进入对话','/messages?evaIM=my-ai&evaIdentity='+encodeURIComponent(id)):null,hint:allowed?'':actor===ownerId&&!digital.hasInTeam(id)?'可先在数字员工市场添加到我的 AI。':'当前账号未开放个人对话。'};
  }
  if(id.startsWith('project-agent:')){
   const pid=id.slice('project-agent:'.length),agent=store.projectAgent(pid);
   if(!agent||!store.canRead(pid,actor))return null;
   return {id,name:agent.name,kind:'project-agent',subtitle:'项目管家',appearance:agent.identityAppearance||root.EvaAIIdentity.projectAgentAppearance(),owner:null,project:store.projectRecord(pid),action:link('进入项目','/collab?evaProject='+encodeURIComponent(pid))};
  }
  return null;
 }
 function directory(){
  const clones=store.cloneRecords(),actor=store.actorId();
  return store.people().map(p=>{
   const ids=p.id===ownerId?team.getSnapshot().identities.filter(i=>i.role==='persona').map(i=>i.id):[...clones.filter(c=>c.ownerId===p.id&&c.active!==false).map(c=>c.id),...(root.__EVA_CONTACT_PERSONAS||[]).filter(c=>c.ownerId===p.id).map(c=>c.id)];
   return {person:resolve(p.id),personas:[...new Set(ids)].map(resolve).filter(Boolean)};
  }).sort((a,b)=>{
   if(a.person.id===actor)return -1;
   if(b.person.id===actor)return 1;
   return nameCollator.compare(a.person.name,b.person.name);
  });
 }
 return {resolve,directory,portrait};
}};
})(window);
