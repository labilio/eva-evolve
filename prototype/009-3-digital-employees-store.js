(function(root){
  'use strict';
  const seed=root.__EVA_DIGITAL_EMPLOYEES_DATA, key='eva:digital-employees:v1';
  const expertAliases=new Map([
    ['HR 助手','HR 入职服务专家'],['HR 助手专家','HR 入职服务专家'],
    ['会议纪要清洗','会议纪要专家'],['会议纪要清洗专家','会议纪要专家'],
    ['取数小工','数据提取专家'],['取数小工专家','数据提取专家'],
    ['交互稿自查','交互稿审查专家'],['交互稿自查专家','交互稿审查专家'],
    ['安全测试用例生成','安全测试专家'],['安全测试用例生成专家','安全测试专家'],
    ['新人上手问答','新人入职问答专家'],['新人上手问答专家','新人入职问答专家'],
    ['汇报材料助理','汇报材料专家'],['汇报材料助理专家','汇报材料专家'],
    ['原型批注跟进','原型批注跟进专家']
  ]);
  const expertName=value=>{
    const name=String(value||'').trim();
    const aliased=expertAliases.get(name)||name;
    return (aliased.endsWith('专家')?aliased:aliased.replace(/专家/g,'')+'专家').replace(/\s+专家$/,'专家');
  };
  let saved;try{saved=JSON.parse(root.localStorage.getItem(key));}catch{}
  let state={agents:seed.agents, drafts:{}, personaRequests:[], chats:{}, teamIds:[],...saved};
  // Add newly shipped organization employees without replacing local creations or edits.
  const hrOnboardingSeed=seed.agents.find(a=>a.id==='a_hr_onboarding');
  if(hrOnboardingSeed&&!state.agents.some(a=>a.id===hrOnboardingSeed.id))state.agents=[...state.agents,{...hrOnboardingSeed}];
  // Remove the retired employee from existing local demo state as well as the seed.
  state.agents=state.agents.filter(a=>a.id!=='s_AS00139').map(a=>a.kind==='staff'?{...a,name:expertName(a.name)}:a);
  state.teamIds=state.teamIds.filter(id=>id!=='s_AS00139');
  delete state.chats.s_AS00139;
  try{root.localStorage.setItem(key,JSON.stringify(state));}catch{}
  let revision=0;const listeners=new Set();
  const publish=()=>{revision++;try{root.localStorage.setItem(key,JSON.stringify(state));}catch{}listeners.forEach(fn=>fn());};
  const get=id=>state.agents.find(a=>a.id===id);
  const now=()=>new Date().toISOString();
  const titleOf=messages=>String(messages.find(m=>m.sender?.uid==='u-wangyilin'&&m.text)?.text||'新对话').trim().slice(0,32);
  // Preserve the old employee conversation as one stable session before any reads.
  Object.entries(state.chats).forEach(([id,chat])=>{
    if(!Array.isArray(chat.sessions))state.chats[id]={sessions:[{...chat,id:'digital-session:'+id+':legacy',title:titleOf(chat.messages||[]),updatedAt:chat.updatedAt||now(),pinned:false,messages:chat.messages||[],draft:chat.draft||''}]};
  });
  const privateConversations=root.EvaAIPrivateConversations;
  Object.entries(state.chats).forEach(([id,chat])=>{chat.sessions=chat.sessions.map(record=>privateConversations.threadRecord(id,record));});
  const list=id=>state.chats[id]?.sessions||[];
  const latest=id=>[...list(id)].reverse().sort((a,b)=>b.updatedAt.localeCompare(a.updatedAt))[0];
  const readSession=(id,sessionId)=>sessionId?list(id).find(s=>s.id===sessionId):latest(id);
  const newSession=id=>{
    if(!get(id))throw new Error('数字员工不存在');
    let title='新对话',number=2;while(list(id).some(s=>s.title===title))title='新对话 '+number++;
    const session=privateConversations.threadRecord(id,{id:'digital-thread:'+id+':'+root.crypto.randomUUID(),title,autoTitle:true,updatedAt:now(),pinned:false,messages:[],draft:''});
    state.chats[id]||={sessions:[]};state.chats[id].sessions.push(session);return session;
  };
  const writable=(id,sessionId)=>{
    const session=readSession(id,sessionId);
    if(session)return session;
    if(sessionId)throw new Error('会话已删除');
    return newSession(id);
  };
  const setSessionDraft=(id,sessionId,draft)=>{writable(id,sessionId).draft=draft;publish();};
  const sendSession=(id,sessionId,text,reply)=>{
    const a=get(id);if(!a)throw new Error('数字员工不存在');if(!text.trim())return false;
    const session=writable(id,sessionId),time=new Date().toLocaleTimeString('zh-CN',{hour:'2-digit',minute:'2-digit'});
    const replyTo=privateConversations.replySnapshot(session.channel_id,reply);
    if(session.autoTitle){session.title=Array.from(text.trim()).slice(0,20).join('');session.autoTitle=false;}
    session.messages.push({kind:'text',sender:{uid:'u-wangyilin',name:'王宜林'},time,text,...(replyTo?{replyTo}:{})},{kind:'text',sender:{uid:id,name:a.name,ai:true,identityAppearance:appearance(a)},time,text:a.presence==='offline'?'【原型】已排队，待数字员工上线后处理。':'【原型】已收到请求，后续由 '+a.name+' 的服务处理。当前未调用真实服务。'});
    session.draft='';session.updatedAt=now();publish();return true;
  };
  const appearance=a=>({name:a.name,sourceName:'Eva',avatar:a.avatar||'prototype/assets/project-agent-bot.svg',logo:'prototype/assets/project-agent-bot.svg'});
  const demoSession=(id,a,story,index)=>{
    const title=Array.isArray(story)?story[0]:story.title;
    const updatedAt=Array.isArray(story)?'2026-09-06T'+String(9+index).padStart(2,'0')+':10:00Z':story.updatedAt;
    const messages=Array.isArray(story)?[
      {kind:'text',sender:{uid:'u-wangyilin',name:'王宜林'},time:'17:00',text:story[1]},
      {kind:'text',sender:{uid:id,name:a.name,ai:true,identityAppearance:appearance(a)},time:'17:01',text:story[2]}
    ]:(story.messages||[]).map((message,messageIndex)=>{
      const {from,...content}=message;
      const sender=from==='user'
        ? {uid:'u-wangyilin',name:'王宜林'}
        : {uid:id,name:a.name,ai:true,identityAppearance:appearance(a)};
      return {id:content.id||'digital-demo:'+id+':'+index+':'+messageIndex,...content,sender};
    });
    return {id:'digital-session:'+id+':professional-v1:'+index,title,updatedAt:updatedAt||now(),pinned:false,draft:'',messages};
  };
  // One-time additive demo migration; never overwrite edits or restore deleted sessions.
  if(!state.professionalDemoV1){
    Object.entries(seed.demoConversations||{}).forEach(([id,stories])=>{
      const a=get(id);if(!a)return;
      state.chats[id]||={sessions:[]};
      const room=Math.max(0,3-state.chats[id].sessions.length);
      stories.slice(0,room).forEach((story,index)=>{
        const session=demoSession(id,a,story,index);
        if(state.chats[id].sessions.some(s=>s.id===session.id))return;
        state.chats[id].sessions.push(session);
      });
      if(!state.teamIds.includes(id))state.teamIds.push(id);
    });
    state.professionalDemoV1=true;publish();
  }
  // Existing installations may already have completed the generic demo migration.
  // Seed this scenario once, then preserve subsequent removal and conversation edits.
  if(!state.hrOnboardingDemoV1&&hrOnboardingSeed){
    const id=hrOnboardingSeed.id,stories=seed.demoConversations?.[id]||[];
    state.chats[id]||={sessions:[]};
    stories.forEach((story,index)=>{
      const session=demoSession(id,hrOnboardingSeed,story,index);
      if(!state.chats[id].sessions.some(s=>s.id===session.id))state.chats[id].sessions.push(session);
    });
    state.teamIds=[id,...state.teamIds.filter(value=>value!==id)];
    state.hrOnboardingDemoV1=true;publish();
  }
  if(!state.compactDemoV1){Object.values(state.chats).forEach(chat=>chat.sessions.forEach(session=>session.messages.forEach(m=>{if(m.sender?.ai&&Object.hasOwn(seed.compactCopy||{},m.text))m.text=seed.compactCopy[m.text];})));state.compactDemoV1=true;publish();}
  // Include newly seeded records in the same persisted Octo topic contract.
  Object.entries(state.chats).forEach(([id,chat])=>{chat.sessions=chat.sessions.map(record=>privateConversations.threadRecord(id,record));});
  root.EvaDigitalEmployeesStore={
    subscribe(fn){listeners.add(fn);return()=>listeners.delete(fn);},getSnapshot:()=>revision,
    agents:()=>state.agents,get,appearance,chatIds:()=>Object.keys(state.chats),
    teamIds:()=>state.teamIds.filter(id=>get(id)?.kind==='staff'),
    hasInTeam:id=>state.teamIds.includes(id),
    addToTeam(id){if(get(id)?.kind!=='staff')throw new Error('请选择数字员工');if(state.teamIds.includes(id))return false;state.teamIds=[...state.teamIds,id];publish();return true;},
    removeFromTeam(id){state.teamIds=state.teamIds.filter(value=>value!==id);publish();},
    sessions(id){return [...list(id)].reverse().sort((a,b)=>Number(!!b.pinned)-Number(!!a.pinned)||b.updatedAt.localeCompare(a.updatedAt)).map(({id,title,updatedAt,pinned})=>({id,title,updatedAt,pinned}));},
    renameThread(id,threadId,name){const session=readSession(id,threadId);if(!session)throw new Error('会话已删除');const title=String(name||'').trim();if(!title||Array.from(title).length>50)throw new Error('请输入 1–50 个字符的会话名称');session.title=title;session.autoTitle=false;publish();},
    createThread(id){const session=newSession(id);publish();return session.id;},
    createSession(id){const session=newSession(id);publish();return session.id;},
    setSessionFlag(id,sessionId,flag,value){if(flag!=='pinned')throw new Error('不支持的会话设置');const session=readSession(id,sessionId);if(!session)return;session.pinned=!!value;publish();},
    deleteSession(id,sessionId){if(!state.chats[id])return;state.chats[id].sessions=list(id).filter(s=>s.id!==sessionId);publish();},
    receiveForwarded(channelId,messages){
      for(const id of state.teamIds){const session=list(id).find(item=>item.channel_id===channelId);if(!session)continue;session.messages.push(...JSON.parse(JSON.stringify(messages)));session.updatedAt=now();publish();return true;}return false;
    },
    conversationSource(id,sessionId){
      const a=get(id);if(!a)return null;
      const selected=readSession(id,sessionId);if(sessionId&&!selected)return null;
      const c=selected||{messages:[],draft:''},targetId=selected?.id;
      const source=privateConversations.source({identityId:id,name:a.name,appearance:appearance(a),records:list(id),selectedId:targetId,
        messages:threadId=>(list(id).find(s=>s.id===threadId)?.messages||[]).map(m=>({...m,sender:m.sender.uid==='u-wangyilin'?{...m.sender,avatar:root.__EVA_CURRENT_USER_PORTRAIT}:{...m.sender,name:a.name,identityAppearance:appearance(a)}}))});
      return {...source,initialDraft:c.draft,onDraftChange:text=>setSessionDraft(id,targetId,text),onSend:(text,channelId,reply)=>sendSession(id,targetId,text,reply)};
    },
    personaRequests(ownerId){return structuredClone((state.personaRequests||[]).filter(r=>r.ownerId===ownerId));},
    submitPersonaRequest(ownerId,draft){
      if(!ownerId||!draft.name?.trim())throw new Error('请填写分身名称');
      if(!seed.businessDomains?.includes(draft.domain))throw new Error('请选择预置业务域');
      state.personaRequests||=[];
      if(state.personaRequests.some(r=>r.ownerId===ownerId&&r.name===draft.name.trim()&&r.status==='pending'))throw new Error('同名分身正在等待 IT 审核，请勿重复提交');
      const configuration=structuredClone(draft);delete configuration.runtimeEndpoint;
      const request={id:'persona-request:'+root.crypto.randomUUID(),ownerId,name:draft.name.trim(),domain:draft.domain,status:'pending',createdAt:now(),configuration};
      state.personaRequests.push(request);delete state.drafts.persona;publish();return structuredClone(request);
    },
    saveDraft(type,draft){state.drafts[type]=structuredClone(draft);publish();},draft:type=>state.drafts[type],
    create(type,draft){
      const rt=seed.runtimes.find(r=>r.key===type);if(!rt)throw new Error('请选择创建类型');
      const rawName=draft.name?.trim();if(!rawName)throw new Error('请填写名称');const name=expertName(rawName);
      const no='AS'+String(Math.max(518,...state.agents.map(a=>Number(a.no?.replace('AS',''))||0))+1).padStart(5,'0');
      const a={id:'digital:'+no,no,name,kind:type==='team'?'team':'staff',market:'mine',by:'u-wangyilin',creatorName:'王宜林',ownership:type==='mine'?'personal':type==='team'?'project':'organization',domain:draft.domain||'数智化',tier:draft.tier||'small',presence:'online',runtime:type==='dify'?'dify':type==='domain'?'external':'cloud',scope:type==='mine'?'self':type==='team'?'project':draft.publication==='org'?'org':'self',one:draft.one||'',desc:draft.description||'',skills:draft.skills||[],systems:draft.conn||[],configuration:structuredClone(draft),role:draft.role||'记录员',projectId:type==='team'?draft.target:undefined,tagline:type==='mine'?'我建的 · 只有我能拉进群':type==='team'?'项目 AI 助手':type==='dify'?'Dify 工作流 · 我接的':'业务域接入 · 我接的'};
      state.agents=[...state.agents,a];delete state.drafts[type];publish();return a;
    },
    discardCreated(id){state.agents=state.agents.filter(a=>a.id!==id);publish();},
    chat(id){return readSession(id)||{messages:[],draft:''};},
    setDraft(id,draft){setSessionDraft(id,null,draft);},
    send(id,text){return sendSession(id,null,text);}

  };
})(window);
