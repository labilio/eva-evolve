(function(root){
  'use strict';
  // Business state only. React subscribes to this store; DOM is never a state source.
  function create(seed, persist, resolveProjectInfo){
    let state=JSON.parse(JSON.stringify({people:[],clones:[],projects:{},groups:{},threads:{},threadDetails:{},messages:{},chatSettings:{},chatPreferences:{},memberAdditions:[],sequence:0,...seed}));
    // Consolidate legacy records by stable owner ID. Existing memberships and
    // messages follow the same owner's canonical identity, never another person.
    const cloneAliases={...(state.cloneAliases||{})},byOwner=new Map();
    const canonical=[];
    for(const previous of state.clones){
      const current=byOwner.get(previous.ownerId);
      if(current){cloneAliases[previous.id]=current.id;current.active=current.active!==false||previous.active!==false;}
      else {byOwner.set(previous.ownerId,previous);canonical.push(previous);}
    }
    if(canonical.length!==state.clones.length)state.legacyCloneRecords ||= JSON.parse(JSON.stringify(state.clones));
    state.cloneAliases=cloneAliases;
    state.clones=canonical;
    const canonicalId=id=>cloneAliases[id]||id;
    for(const item of [...Object.values(state.projects),...Object.values(state.groups)]){
      item.cloneIds=[...new Set((item.cloneIds||[]).map(canonicalId))];
      if(item.memberRoleIds){
        const roles={};
        for(const [id,ids] of Object.entries(item.memberRoleIds)){const target=canonicalId(id);roles[target]=[...new Set([...(roles[target]||[]),...ids])];}
        item.memberRoleIds=roles;
      }
    }
    const cloneName=c=>{const owner=state.people.find(p=>p.id===c.ownerId);return root.EvaAIIdentity?.cloneName?root.EvaAIIdentity.cloneName(owner):(owner?.name||'未知成员')+'的 AI 分身';};
    const cloneView=c=>c&&({...c,name:cloneName(c),avatar:root.__EVA_COLLEAGUE_PORTRAIT});
    let revision=0;const listeners=new Set();
    const fail=message=>{throw new Error(message);};
    const person=id=>state.people.find(p=>p.id===id&&p.active!==false);
    const clone=id=>cloneView(state.clones.find(c=>c.id===canonicalId(id)&&c.active!==false));
    const scope=id=>state.projects[id]||state.groups[id]||fail('范围不存在');
    const projectId=id=>state.projects[id]?id:state.groups[id]?.projectId;
    const humanRows=id=>scope(id).humans;
    const requireHuman=id=>person(id)||fail('仅已激活的内部人类用户可操作');
    const member=(id,uid)=>humanRows(id).some(m=>m.id===uid);
    const manager=(id,uid)=>{const s=scope(id);if(!member(id,uid))return false;if(s.ownerId===uid)return true;const p=state.projects[projectId(id)];return !!p&&p.humans.some(m=>m.id===uid&&['owner','admin'].includes(m.role));};
    const selected=(uid,ids,pid)=>{if(!Array.isArray(ids))fail('分身选择格式无效');return [...new Set(ids.map(canonicalId))].map(id=>{const c=clone(id);if(!c||c.ownerId!==uid)fail('只能带入自己的可用分身');if(pid&&!state.projects[pid].cloneIds.includes(id))fail('请先将分身加入项目');return id;});};
    const notify=()=>{revision++;if(persist)persist(JSON.parse(JSON.stringify(state)));listeners.forEach(fn=>fn());};
    const writable=id=>{if(id.startsWith('all:'))fail('请在项目成员管理中操作');if(state.threads[id])fail('子区继承父群成员，不单独管理');return scope(id);};
    const drop=(id,uid)=>{const s=scope(id);if(state.projects[id]&&s.memberRoleIds){delete s.memberRoleIds[uid];s.cloneIds.filter(cid=>clone(cid)?.ownerId===uid).forEach(cid=>delete s.memberRoleIds[cid]);}s.humans=s.humans.filter(m=>m.id!==uid);s.cloneIds=s.cloneIds.filter(cid=>clone(cid)?.ownerId!==uid);};
    const dissolve=id=>{delete state.groups[id];Object.keys(state.threads).filter(t=>state.threads[t]===id).forEach(t=>delete state.threads[t]);};
    const employee=id=>{const a=root.EvaDigitalEmployeesStore?.get(id);return a?{...a,kind:'employee',ai:true,identityAppearance:root.EvaDigitalEmployeesStore.appearance(a)}:null;};
    const employeeRows=s=>(s.employeeIds||[]).map(employee).filter(Boolean);
    const agentFor=pid=>state.projects[pid]?{id:'project-agent:'+pid,name:root.EvaAIIdentity.projectAgentName(projectInfo(pid)),kind:'project-agent',ai:true,projectId:pid,cloud:true,removable:false,ownership:'project',identityAppearance:root.EvaAIIdentity.projectAgentAppearance(projectInfo(pid))}:null;
    const agentIn=id=>{id=state.threads[id]||id;return agentFor(id.startsWith('all:')?id.slice(4):projectId(id));};
    const projectInfo=pid=>({...state.projects[pid],...resolveProjectInfo?.(pid)});
    const agentSender=pid=>{const agent=agentFor(pid);return {...agent,uid:agent.id,color:'#1563EB'};};
    // Project AI names are derived at the shared message boundary, including saved history and quotes.
    const cloneMessage=value=>{
      if(Array.isArray(value))return value.map(cloneMessage);
      if(!value||typeof value!=='object')return value;
      const result=Object.fromEntries(Object.entries(value).map(([key,item])=>[key,cloneMessage(item)]));
      const c=clone(value.uid||value.id);
      if(c&&typeof value.name==='string'){
        result.name=(value.name.startsWith('@')?'@':'')+c.name;
        if(value.uid)result.uid=c.id;if(value.id)result.id=c.id;
        result.avatar=root.__EVA_COLLEAGUE_PORTRAIT;
        result.identityAppearance={name:c.name,sourceName:'Eva',avatar:root.__EVA_COLLEAGUE_PORTRAIT,logo:root.__EVA_COLLEAGUE_PORTRAIT};
      }
      if(typeof result.text==='string')for(const previous of [...state.clones,...(state.legacyCloneRecords||[])]){
        const identity=clone(previous.id);if(identity&&previous.name&&previous.name!==identity.name)result.text=result.text.split('@'+previous.name).join('@'+identity.name);
      }
      for(const mention of value.mentions||[]){
        const identity=clone(mention.uid||mention.id);
        if(identity&&mention.name&&typeof result.text==='string')result.text=result.text.split(mention.name).join('@'+identity.name);
      }
      return result;
    };
    const projectAgentMessage=(id,message)=>{
      message=cloneMessage(message);
      const gid=state.threads[id]||id,group=state.groups[gid]||root.__EVA_IM_DEMO?.channels?.find(c=>c.id===gid);
      const projectAgent=agentIn(id),context=projectAgent?projectInfo(projectAgent.projectId):group;
      if(!context)return message;
      // Legacy group AI keeps its identity and access scope; only its display name follows the group.
      const agent=projectAgent||{id:'b-eva-octo',name:root.EvaAIIdentity.projectAgentName(context),identityAppearance:{...root.EvaAIIdentity.projectAgentAppearance(),name:root.EvaAIIdentity.projectAgentName(context)}};
      const legacyNames=new Set(root.EvaAIIdentity.projectAgentLegacyNames(context));
      if(message.sender?.kind==='project-agent'&&message.sender.name&&message.sender.name!==agent.name)legacyNames.add(message.sender.name);
      const isAgent=value=>value&&(value.kind==='project-agent'||value.uid===agent.id||value.id===agent.id||value.uid==='b-eva-octo');
      const visit=value=>{
        if(Array.isArray(value))return value.map(visit);
        if(!value||typeof value!=='object')return value;
        const result=Object.fromEntries(Object.entries(value).map(([key,item])=>[key,visit(item)]));
        if(isAgent(value)){result.name=(String(value.name||'').startsWith('@')?'@':'')+agent.name;result.identityAppearance=agent.identityAppearance;}
        for(const key of ['text','content','name','senderName']){
          if(typeof result[key]!=='string')continue;
          for(const old of legacyNames)result[key]=result[key].split(old).join(agent.name);
        }
        return result;
      };
      const result=visit(message);
      if(result.mentions)result.mentions=result.mentions.filter(m=>typeof m.name==='string'&&m.name.replace(/^@+/,'').trim()).map(m=>({...m,name:'@'+m.name.replace(/^@+/,'')}));
      if(message.sender?.kind==='project-agent'&&message.sender.name&&message.sender.name!==agent.name&&message.fixtureId?.startsWith('project-agent-welcome:'))result.text=result.text?.replace(message.sender.name,agent.name);
      return result;
    };
    const agentWelcome=(pid,goal)=>{
      const list=state.messages['all:'+pid]||(state.messages['all:'+pid]=[]),fixtureId='project-agent-welcome:'+pid;
      if(list.some(m=>m.fixtureId===fixtureId))return;
      for(const prefs of Object.values(state.chatPreferences)){const pref=prefs['all:'+pid];if(pref?.clearedCount>0)pref.clearedCount++;}
      const p=projectInfo(pid),owner=person(state.projects[pid].ownerId);
      list.unshift({fixtureId,kind:'text',sender:agentSender(pid),time:'09:00',text:'@所有人 大家好，我是 '+agentFor(pid).name+'。\n项目：'+p.name+'\n共同目标：'+(goal||p.desc||'尚未填写，可在项目信息中补充')+'\n负责人：'+(owner?.name||'未指定')+'\n我是本项目的云端 AI，了解项目目标、成员、各群进展及共享资料，电脑关闭后也可继续服务。每位项目成员都可以 @我 提问，我会结合整个项目的信息回答。',notifiedHumanIds:state.projects[pid].humans.map(m=>m.id)});
    };
    const api={
      subscribe(fn){listeners.add(fn);return()=>listeners.delete(fn);},getSnapshot:()=>revision,
      snapshot:()=>JSON.parse(JSON.stringify({...state,clones:state.clones.map(cloneView)})),person,clone,employee,manager,projectAgent:agentFor,
      projectRoles(pid){return JSON.parse(JSON.stringify(state.projects[pid]?.projectRoles||[]));},
      memberRoles(pid,id){const p=state.projects[pid];if(!p||!api.canRead(pid,id))return [];const ids=p.memberRoleIds?.[id]||[];return api.projectRoles(pid).filter(r=>ids.includes(r.id));},
      saveProjectRole(pid,uid,{id,name,description=''}){
        requireHuman(uid);const p=state.projects[pid];if(!p||!manager(pid,uid))fail('仅项目负责人或管理员可管理角色');
        name=String(name||'').trim();description=String(description).trim();
        if(!name||name.length>20)fail('角色名称须为 1–20 个字符');if(description.length>200)fail('职责说明最多 200 个字符');
        const roles=p.projectRoles||[];if(id&&!roles.some(r=>r.id===id))fail('角色不存在');
        if(roles.some(r=>r.id!==id&&r.name.toLowerCase()===name.toLowerCase()))fail('角色名称已存在');
        const role={id:id||'project-role:'+pid+':'+(++state.sequence),name,description};
        p.projectRoles=id?roles.map(r=>r.id===id?role:r):[...roles,role];notify();return {...role};
      },
      setMemberRoles(pid,uid,id,ids){
        requireHuman(uid);const p=state.projects[pid];if(!p||!manager(pid,uid))fail('仅项目负责人或管理员可分配角色');
        if(!api.canRead(pid,id))fail('成员已不在本项目');if(!Array.isArray(ids)||ids.some(rid=>!(p.projectRoles||[]).some(r=>r.id===rid)))fail('角色不属于当前项目');
        p.memberRoleIds||={};p.memberRoleIds[id]=[...new Set(ids)];notify();
      },
      deleteProjectRole(pid,uid,id){
        requireHuman(uid);const p=state.projects[pid];if(!p||!manager(pid,uid))fail('仅项目负责人或管理员可管理角色');
        if(!(p.projectRoles||[]).some(r=>r.id===id))fail('角色不存在');p.projectRoles=p.projectRoles.filter(r=>r.id!==id);
        for(const key of Object.keys(p.memberRoleIds||{}))p.memberRoleIds[key]=p.memberRoleIds[key].filter(rid=>rid!==id);notify();
      },
      taskIssuer(pid,uid,roleId){
        const actor=requireHuman(uid);if(!state.projects[pid]||!member(pid,uid))fail('请先加入项目');
        const roles=api.memberRoles(pid,uid),role=roleId?roles.find(r=>r.id===roleId):roles[0];
        if(roleId&&!role)fail('下达角色已不属于当前成员，请重新选择');
        return {issuer_role_id:role?.id||null,issuer_role_name:role?.name||null,creator_id:uid,creator_name:actor.name};
      },
      pinnedProjects(uid){return [...(state.pinnedProjects?.[uid]||[])].filter(id=>!state.projects[id]||api.canRead(id,uid));},
      setPinnedProjects(uid,ids){
        requireHuman(uid);const next=[...new Set(ids)].slice(0,6);
        if(JSON.stringify(state.pinnedProjects?.[uid]||[])===JSON.stringify(next))return;
        state.pinnedProjects||={};state.pinnedProjects[uid]=next;notify();
      },
      conversationCategories(uid){
        return [{id:'scope:other',name:state.conversationCategories?.[uid]?.find(c=>c.id==='scope:other')?.name||'其他会话'},...(state.conversationCategories?.[uid]||[]).filter(c=>c.id!=='scope:other').map(c=>({...c}))];
      },
      conversationCategory(uid,channel){
        if(channel.category?.startsWith('space:'))return channel.category;
        const id=state.conversationCategoryAssignments?.[uid]?.[channel.id];
        return api.conversationCategories(uid).some(c=>c.id===id)?id:'scope:other';
      },
      saveConversationCategory(uid,{id,name,channelIds=[],availableChannels=[]}){
        requireHuman(uid);name=String(name||'').trim();
        if(!name||name.length>50)fail('分组名称需为 1–50 个字符');
        const categories=api.conversationCategories(uid);
        if(id&&!categories.some(c=>c.id===id))fail('分组不存在');
        if(categories.some(c=>c.id!==id&&c.name===name))fail('分组名称已存在');
        const allowed=new Set(availableChannels.filter(c=>!c.category?.startsWith('space:')&&!state.groups[c.id]?.projectId&&!state.projects[c.id]&&!c.id.startsWith('all:')).map(c=>c.id));
        if(channelIds.some(cid=>!allowed.has(cid)))fail('只能整理非项目会话');
        id ||= 'scope:custom-'+(++state.sequence);
        state.conversationCategories||={};state.conversationCategories[uid]=categories.some(c=>c.id===id)?categories.map(c=>c.id===id?{id,name}:c):categories.concat({id,name});
        state.conversationCategoryAssignments||={};const assignments=state.conversationCategoryAssignments[uid]||={};
        availableChannels.filter(c=>allowed.has(c.id)).forEach(c=>{if(api.conversationCategory(uid,c)===id&&!channelIds.includes(c.id))assignments[c.id]='scope:other';});
        channelIds.forEach(cid=>assignments[cid]=id);notify();return id;
      },
      followOrder(uid,bucket,items){
        const order=state.followOrders?.[uid]?.[bucket]||[],rank=new Map(order.map((id,index)=>[id,index]));
        return [...items].sort((a,b)=>(rank.get(a.id)??order.length)-(rank.get(b.id)??order.length));
      },
      setFollowOrder(uid,bucket,ids){
        requireHuman(uid);state.followOrders||={};state.followOrders[uid]||={};
        state.followOrders[uid][bucket]=[...new Set(ids)];notify();
      },

      addEmployee(id,uid,eid){requireHuman(uid);const sid=id.startsWith("all:")?id.slice(4):id,s=state.projects[sid]||fail("数字员工只能放进项目，不能拉进群聊"),a=employee(eid)||fail("数字员工不存在");if(!member(sid,uid))fail("请先加入项目");if((a.ownership==="personal"||a.scope==="self")&&a.by!==uid)fail("只有创建者能邀请自己的数字员工");if(a.ownership==="project"&&a.projectId!==projectId(sid))fail("项目助手只能在所属项目中使用");s.employeeIds=[...new Set([...(s.employeeIds||[]),eid])];notify();},
      removeEmployee(id,uid,eid){const s=writable(id),a=employee(eid)||fail("数字员工不存在");if(!member(id,uid)||(!manager(id,uid)&&a.by!==uid))fail("无移除权限");s.employeeIds=(s.employeeIds||[]).filter(x=>x!==eid);if(state.projects[id]&&s.memberRoleIds)delete s.memberRoleIds[eid];if(state.projects[id])Object.values(state.groups).filter(g=>g.projectId===id).forEach(g=>{g.employeeIds=(g.employeeIds||[]).filter(x=>x!==eid);});notify();},
      openDirect(uid,target){
        requireHuman(uid);const p=requireHuman(target);if(uid===target)fail('不能给自己发消息');
        state.directConversations||={};
        const existing=Object.values(state.directConversations).find(c=>c.memberIds.includes(uid)&&c.memberIds.includes(target));if(existing)return existing.id;
        const id=uid==='u-wangyilin'?'dm-'+target.replace(/^u-/, ''):'dm-pair:'+JSON.stringify([uid,target].sort());
        state.directConversations[id]||={id,memberIds:[uid,target],lastAt:new Date().toISOString(),messages:[]};notify();return id;
      },
      directChannels(uid){return Object.values(state.directConversations||{}).filter(c=>c.memberIds.includes(uid)).map(c=>{const p=person(c.memberIds.find(id=>id!==uid));return p?{id:c.id,personId:p.id,name:p.name,chatType:'direct',members:2,unread:0,threads:[],lastAt:c.lastAt,identityAvatarUrl:p.id==='u-wangyilin'?root.__EVA_CURRENT_USER_PORTRAIT:root.EvaAvatar?.personUri(p.id)}:null;}).filter(Boolean);},
      canReadDirect(id,uid){
        if(!person(uid)||!String(id||'').startsWith('dm-'))return false;
        const saved=state.directConversations?.[id];
        if(saved)return saved.memberIds.includes(uid);
        if(uid!=='u-wangyilin')return false;
        const peer='u-'+String(id).slice(3);
        return Boolean(person(peer));
      },
      directMessages(uid,base={}){return {...base,...Object.fromEntries(Object.values(state.directConversations||{}).filter(c=>c.memberIds.includes(uid)).map(c=>[c.id,[...(base[c.id]||[]),...JSON.parse(JSON.stringify(c.messages))]]))};},
      directDraft(id,uid){const c=state.directConversations?.[id];return c?.memberIds.includes(uid)?c.drafts?.[uid]||'':'';},
      setDirectDraft(id,uid,text){const c=state.directConversations?.[id];if(!c||!c.memberIds.includes(uid))fail('无私聊访问权限');if((c.drafts?.[uid]||'')===text)return;c.drafts||={};c.drafts[uid]=text;notify();},
      sendDirect(id,uid,text){
        requireHuman(uid);const c=state.directConversations?.[id];if(!c||!c.memberIds.includes(uid))fail('无私聊访问权限');
        if(!person(c.memberIds.find(p=>p!==uid)))fail('对方账号不可用');if(!text.trim())return false;
        c.drafts||={};c.drafts[uid]='';c.lastAt=new Date().toISOString();c.messages.push({kind:'text',sender:{...person(uid),uid},time:new Date().toLocaleTimeString('zh-CN',{hour:'2-digit',minute:'2-digit'}),text});notify();return true;
      },
      transaction(fn){const staged=create(state,undefined,resolveProjectInfo);fn(staged);state=staged.snapshot();notify();},
      renameProject(id,uid,name){requireHuman(uid);if(!state.projects[id]||!manager(id,uid))fail('仅项目负责人或管理员可修改');if(!name.trim()||name.length>50)fail('项目名称须为 1–50 个字符');state.projects[id].name=name.trim();notify();},
      chatSettings(id){return JSON.parse(JSON.stringify(state.chatSettings[id]||{}));},
      chatPreferences(id,uid){return JSON.parse(JSON.stringify(state.chatPreferences[uid]?.[id]||{}));},
      setChatSettings(id,uid,patch){
        const sid=id.startsWith('all:')?id.slice(4):id;
        if(!api.canRead(id,uid)||!manager(sid,uid))fail('仅群主或群内管理员可修改');
        const allowed=['name','notice','avatar'];
        if(Object.keys(patch).some(k=>!allowed.includes(k)))fail('未知群设置');
        if(patch.name!==undefined&&(!patch.name.trim()||patch.name.length>50))fail('群名须为 1–50 个字符');
        if(patch.notice?.length>400)fail('公告最多 400 个字符');
        if(patch.avatar&&!/^data:image\/(png|jpeg|webp);base64,/.test(patch.avatar))fail('请上传 PNG、JPEG 或 WebP 图片');
        state.chatSettings[id]={...state.chatSettings[id],...patch};
        if(patch.name&&state.groups[id])state.groups[id].name=patch.name.trim();
        notify();
      },
      setChatPreferences(id,uid,patch){
        requireHuman(uid);if(!id)fail('会话不存在');
        if((state.groups[id]||id.startsWith('all:'))&&!api.canRead(id,uid))fail('请先加入群聊');
        if(Object.keys(patch).some(k=>!['mute','top','clearedCount'].includes(k)))fail('未知个人设置');
        state.chatPreferences[uid]||={};state.chatPreferences[uid][id]={...state.chatPreferences[uid][id],...patch};notify();
      },
      visibleMessages(id,uid,messages){return messages.slice(api.chatPreferences(id,uid).clearedCount||0).map(m=>projectAgentMessage(id,m));},
      setActor(uid){requireHuman(uid);state.actorId=uid;notify();},
      seedSupplyChatContent(){
        let changed=false;
        if(!state.conciseAllHandsV2){
          const id='all:prod',old=state.messages[id]||[],isOld=m=>String(m.fixtureId||'').startsWith('supply-chat-v1:all:prod:')||String(m.fixtureId||'').startsWith('project-agent-demo:');
          // Replace shipped demo messages only; retain user messages and clear-history boundaries.
          Object.values(state.chatPreferences||{}).forEach(prefs=>{const pref=prefs[id];if(pref?.clearedCount)pref.clearedCount=old.slice(0,pref.clearedCount).filter(m=>!isOld(m)).length;});
          state.messages[id]=old.filter(m=>!isOld(m));state.conciseAllHandsV2=true;changed=true;
        }
        for(const block of root.__EVA_SUPPLY_CHAT_CONTENT||[]){
          const id=block.scopeId||Object.values(state.groups).find(g=>g.projectId==='prod'&&g.name===block.groupName)?.id;
          if(!id||!api.canRead(id,'u-wangyilin'))continue;
          const list=state.messages[id]||(state.messages[id]=[]);
          block.messages.forEach((entry,index)=>{
            const record=Array.isArray(entry)?{kind:'text',senderId:entry[0],time:entry[1],text:entry[2]}:entry;
            const {senderId,time,text}=record;
            const fixtureId=record.fixtureId||(id==='all:prod'?'supply-chat-v2:':'supply-chat-v1:')+id+':'+index;
            const projectAgent=senderId==='project-agent:prod'&&agentIn(id)?.projectId==='prod';
            if(list.some(m=>m.fixtureId===fixtureId)||(!projectAgent&&(!person(senderId)||!api.canRead(id,senderId))))return;
            const payload=JSON.parse(JSON.stringify(record));delete payload.fixtureId;delete payload.senderId;
            list.push({...payload,fixtureId,kind:payload.kind||'text',sender:projectAgent?agentSender('prod'):{...person(senderId),uid:senderId},time,...(text===undefined?{}:{text})});changed=true;
          });
          if(block.notice&&!state.chatSettings[id]?.notice){state.chatSettings[id]={...state.chatSettings[id],notice:block.notice};changed=true;}
        }
        // Upgrade only the shipped request text, preserving user messages and edits.
        const request=(state.messages['all:prod']||[]).find(m=>m.fixtureId==='supply-chat-v2:all:prod:7');
        if(request&&request.text==="备选方案会多一次换型。我把产能影响补到 SC-105，等质量结论一起确认。"){request.text="备选方案会多一次换型。我把产能影响补到 SC-105，等质量结论一起确认。\n@Eva 项目管理专员 请结合刚才的更新，简要汇总还需要确认的事项。";changed=true;}
        if(changed)notify();
      },
      loadSupplyDemo(){
        const d=root.__EVA_SUPPLY_MEMBER_DEMO;
        if(!d||!state.projects[d.projectId])fail('供应链演示项目不存在');
        d.humans.forEach(m=>requireHuman(m.id));
        const pid=d.projectId, groupIds=Object.values(state.groups).filter(g=>g.projectId===pid).map(g=>g.id);
        const scopeIds=new Set([pid,'all:'+pid,...groupIds,d.group.id]);
        Object.entries(state.threads).forEach(([tid,gid])=>{if(scopeIds.has(gid)){delete state.messages[tid];delete state.threadDetails[tid];if(gid===d.group.id)delete state.threads[tid];}});
        for(const id of scopeIds)delete state.messages[id];
        // Keep existing group/thread fixtures, restore membership only within this project.
        state.projects[pid]={...state.projects[pid],ownerId:'u-wangyilin',humans:JSON.parse(JSON.stringify(d.humans)),cloneIds:[...d.cloneIds]};
        for(const id of groupIds){state.groups[id]={...state.groups[id],ownerId:'u-wangyilin',humans:d.humans.map(m=>({id:m.id,role:'member'})),cloneIds:[]};}
        state.groups[d.group.id]={...JSON.parse(JSON.stringify(d.group)),projectId:pid};
        state.threads[d.thread.id]=d.group.id;state.threadDetails[d.thread.id]={...d.thread};
        state.messages[d.group.id]=d.messages.map(m=>{const {senderId,...message}=m;return {...JSON.parse(JSON.stringify(message)),sender:{...person(senderId),uid:senderId}};});
        state.messages[d.thread.id]=[{kind:'text',sender:{...person('u-linxiao'),uid:'u-linxiao'},time:'10:04',text:'现场验证照片和8D整改证据待补齐；子区沿用供应商整改协同群的成员权限。'}];
        state.memberAdditions=state.memberAdditions.filter(i=>!scopeIds.has(i.scopeId));
        state.actorId='u-wangyilin';state.supplyDemoVersion=d.version;api.seedSupplyChatContent();state.projectAgentDemoVersion=0;api.seedProjectAgents();notify();
      },
      createProject(id,name,uid,ids,goal){requireHuman(uid);if(state.projects[id]||state.groups[id])fail('项目已存在');const clones=selected(uid,ids);state.projects[id]={id,name,ownerId:uid,humans:[{id:uid,role:'owner'}],cloneIds:clones};agentWelcome(id,goal);notify();return id;},
      createGroup(id,name,pid,uid,ids){requireHuman(uid);if(state.groups[id]||state.projects[id])fail('群已存在');if(pid&&!member(pid,uid))fail('请先加入项目');const clones=selected(uid,ids,pid);state.groups[id]={id,name,projectId:pid||null,ownerId:uid,humans:[{id:uid,role:'member'}],cloneIds:clones};notify();return id;},
      createThread(id,gid,details={},uid){if(!state.groups[gid]&&!(gid.startsWith('all:')&&state.projects[gid.slice(4)]))fail('父群不存在');if(uid&&!api.canRead(gid,uid))fail('请先加入父群');state.threads[id]=gid;state.threadDetails[id]={...details,id};notify();},
      updateThread(id,patch,uid){if(!api.canRead(id,uid))fail('请先加入父群');state.threadDetails[id]={...state.threadDetails[id],...patch,id};notify();},
      sendMessage(id,uid,text){requireHuman(uid);if(!api.canRead(id,uid))fail('请先加入群聊');const p=person(uid);(state.messages[id]||(state.messages[id]=[])).push({kind:'text',sender:{...p,uid:p.id},time:new Date().toLocaleTimeString('zh-CN',{hour:'2-digit',minute:'2-digit'}),text,notifiedHumanIds:(text.includes('@所有人')||text.includes('@全体成员'))?api.mentionCandidates(id).map(p=>p.id):[]});const agent=agentIn(id),project=agent&&projectInfo(agent.projectId),mentionsAgent=agent&&[agent.name,...root.EvaAIIdentity.projectAgentLegacyNames(project)].some(name=>text.includes('@'+name));if(mentionsAgent){const owner=person(state.projects[agent.projectId].ownerId);state.messages[id].push({kind:'text',sender:agentSender(agent.projectId),time:new Date().toLocaleTimeString('zh-CN',{hour:'2-digit',minute:'2-digit'}),text:'@'+p.name+' 本项目的共同目标是：'+(project.desc||'尚未填写，请在项目信息中补充')+'。\n负责人是'+owner.name+'。成员加入项目后会同步进入全员群，具体问题可在对应群聊讨论。我在云端提供项目协作支持，你可以继续 @我。'});}notify();},
      messagesFor(id,uid){
        if(!api.canRead(id,uid))return [];
        const candidates=[{name:'@所有人',uid:'all'},{name:'@全体成员',uid:'all'},...api.groupMembers(id).map(m=>({name:'@'+m.name,uid:m.id}))];
        return JSON.parse(JSON.stringify(state.messages[id]||[])).map(m=>projectAgentMessage(id,m)).map(m=>({...m,mentions:[...(m.mentions||[]),...candidates.filter(c=>m.text?.includes(c.name)&&!m.mentions?.some(x=>x.name===c.name))]}));
      },
      mentionCandidates(id){return api.groupMembers(state.threads[id]||id).filter(p=>p.kind==='human');},
      members(id){const s=scope(id);return [...s.humans.map(m=>({...person(m.id),...m,kind:'human'})),...s.cloneIds.map(cid=>({...clone(cid),kind:'clone'})),...employeeRows(s),...(agentIn(id)?[agentIn(id)]:[])];},
      groupMembers(id){id=state.threads[id]||id;return api.members(id.startsWith('all:')?id.slice(4):id);},
      canRead(id,uid){if(!id||state.threadDetails[id]?.deleted)return false;const target=state.threads[id]||id;const sid=target.startsWith('all:')?target.slice(4):target;const s=state.projects[sid]||state.groups[sid];return !!s&&(s.humans.some(m=>m.id===uid)||s.cloneIds.includes(canonicalId(uid))||(s.employeeIds||[]).includes(uid)||agentIn(id)?.id===uid);},
      channels(pid,uid,base=[]){pid=pid||null;
        if(pid&&!api.canRead(pid,uid))return [];
        const p=state.projects[pid];
        const view=(g,id,isAll)=>{const original=base.find(c=>c.id===id)||{};return {...original,id,name:isAll?'全员群':g.name,lastAt:original.lastAt||root.__EVA_DEMO_TIME?.T1||'2026-09-02T10:00:00+08:00',color:root.EvaProjectAppearance&&p?root.EvaProjectAppearance.get(projectInfo(pid)).accent:original.color||'var(--semi-color-primary)',unread:original.unread||0,threads:[...(original.threads||[]).map(t=>({...t,...state.threadDetails[t.id]})),...Object.entries(state.threads).filter(([tid,gid])=>gid===id&&state.threadDetails[tid]&&!(original.threads||[]).some(t=>t.id===tid)).map(([tid])=>state.threadDetails[tid])].filter(t=>!t.deleted).map(t=>({...t,updated_at:t.updated_at||t.created_at||root.__EVA_DEMO_TIME?.T1||'2026-09-02T10:00:00+08:00'})),members:g.humans.length+g.cloneIds.length+(g.employeeIds||[]).length+(p?1:0),systemAICount:p?1:0,humanCount:g.humans.length,cloneCount:g.cloneIds.length,employeeCount:(g.employeeIds||[]).length,allMembers:isAll,projectId:pid};};
        return [...(p?[view(p,'all:'+pid,true)]:[]),...Object.values(state.groups).filter(g=>g.projectId===pid&&api.canRead(g.id,uid)).map(g=>view(g,g.id,false))];
      },
      conversationContext(id,uid){
        const gid=state.threads[id]||id,sid=gid?.startsWith('all:')?gid.slice(4):gid;
        const pid=state.projects[sid]?sid:state.groups[sid]?.projectId;
        if(!pid||!api.canRead(id,uid)||!api.canRead(pid,uid))return null;
        const name=projectInfo(pid).name||'',groupName=gid.startsWith('all:')?'全员群':state.chatSettings[gid]?.name||state.groups[gid]?.name||'';
        return {projectId:pid,colorKey:root.EvaProjectAppearance?.keyFor(projectInfo(pid)),projectName:name,groupId:gid,groupName,path:state.threads[id]?[name,groupName].filter(Boolean).join(' / '):name};
      },
      candidates(id,uid){const s=writable(id);if(!member(id,uid))fail('请先加入');return state.people.filter(p=>p.active!==false&&!member(id,p.id)&&(!s.projectId||member(s.projectId,p.id)));},
      addMember(id,uid,target){
        requireHuman(uid);requireHuman(target);const s=writable(id);
        if(!member(id,uid))fail('请先加入');
        if(s.projectId&&!member(s.projectId,target))fail('只能添加当前项目成员');
        if(member(id,target))return target;
        s.humans.push({id:target,role:'member'});
        state.memberAdditions.push({id:'member-add-'+(++state.sequence),scopeId:id,actorId:uid,memberId:target,addedAt:new Date().toISOString()});
        notify();return target;
      },
      addClone(id,uid,cid){cid=canonicalId(cid);const s=writable(id);requireHuman(uid);if(!member(id,uid))fail('主人必须先加入');selected(uid,[cid],s.projectId);if(!s.cloneIds.includes(cid))s.cloneIds.push(cid);notify();},
      removeClone(id,uid,cid){cid=canonicalId(cid);if(cid?.startsWith('project-agent:'))fail('项目分身不可移除');const s=writable(id);const c=clone(cid)||fail('分身不存在');if(!member(id,uid)||(c.ownerId!==uid&&!manager(id,uid)))fail('无移除权限');s.cloneIds=s.cloneIds.filter(x=>x!==cid);if(state.projects[id]&&s.memberRoleIds)delete s.memberRoleIds[cid];if(state.projects[id])Object.values(state.groups).filter(g=>g.projectId===id).forEach(g=>{g.cloneIds=g.cloneIds.filter(x=>x!==cid);});notify();},
      transfer(id,uid,target){const s=writable(id);if(s.ownerId!==uid||!member(id,target)||target===uid)fail('只能转让给范围内的另一位人类成员');s.ownerId=target;s.humans.forEach(m=>{if(state.projects[id]){if(m.id===uid)m.role='member';if(m.id===target)m.role='owner';}});notify();},
      setAdmin(id,uid,target,enabled){const s=state.projects[id]||fail('仅项目可设置管理员');if(s.ownerId!==uid||target===uid||!member(id,target))fail('无设置权限');s.humans.find(m=>m.id===target).role=enabled?'admin':'member';notify();},
      remove(id,uid,target,successors={}){if(target?.startsWith('project-agent:'))fail('项目分身不可移除');const s=writable(id);if(!member(id,uid)||(uid!==target&&!manager(id,uid)))fail('无移除权限');if(!member(id,target))fail('成员已离开');if(s.ownerId===target)fail('请先转让负责人或群主');const groups=state.projects[id]?Object.values(state.groups).filter(g=>g.projectId===id&&member(g.id,target)):[];const owned=groups.filter(g=>g.ownerId===target);for(const g of owned){if(g.humans.length>1&&(!successors[g.id]||successors[g.id]===target||!member(g.id,successors[g.id])))fail('请为 '+g.name+' 指定群内的人类接任者');}for(const g of owned){if(g.humans.length===1)dissolve(g.id);else g.ownerId=successors[g.id];}drop(id,target);groups.filter(g=>state.groups[g.id]).forEach(g=>drop(g.id,target));notify();},
      dissolveGroup(id,uid){const g=state.groups[id]||fail('仅普通群可解散');if(g.ownerId!==uid)fail('仅群主可解散');dissolve(id);notify();},
      seedProjectAgents(){
        for(const pid of Object.keys(state.projects))agentWelcome(pid);
        const pid='prod',list=state.messages['all:'+pid];
        if(list&&state.projectAgentDemoVersion!==2){
          for(const [senderId,time,text] of root.__EVA_PROJECT_AGENT_DEMO||[]){
            if((senderId!=='agent'&&!api.canRead('all:'+pid,senderId))||list.some(m=>m.text===text))continue;
            list.push({fixtureId:'project-agent-demo:'+list.length,kind:'text',sender:senderId==='agent'?agentSender(pid):{...person(senderId),uid:senderId},time,text});
          }
          state.projectAgentDemoVersion=2;
        }
        notify();
      },
    };
    // One-time conversion of old local invitation data; no acceptance workflow remains.
    if(state.invitations){
      const pending=state.invitations.filter(i=>['pending_approval','pending_accept'].includes(i.status));
      // Resolve project membership before ordinary groups; retry chains only when progress occurs.
      pending.sort((a,b)=>Number(!!state.projects[b.scopeId])-Number(!!state.projects[a.scopeId]));
      let remaining=pending,progress=true;
      while(progress&&remaining.length){
        progress=false;const next=[];
        for(const i of remaining){
          const s=state.projects[i.scopeId]||state.groups[i.scopeId];
          if(!s||!person(i.inviteeId)||!person(i.inviterId))continue;
          if(member(i.scopeId,i.inviteeId))continue;
          if(!member(i.scopeId,i.inviterId)||(s.projectId&&!member(s.projectId,i.inviteeId))){next.push(i);continue;}
          s.humans.push({id:i.inviteeId,role:'member'});
          state.memberAdditions.push({id:'member-add-'+(++state.sequence),scopeId:i.scopeId,actorId:i.inviterId,memberId:i.inviteeId,migrated:true});
          progress=true;
        }
        remaining=next;
      }
      delete state.invitations;
    }
    return api;
  }
  function bootstrap(people,projects,channels,orgChannels=[],resolveProjectInfo){
    const key='eva:project-members:v1';
    let saved;try{saved=JSON.parse(root.localStorage.getItem(key));}catch{}
    if(!saved||saved.schema!==2){
      const humans=people.filter(p=>!p.robot&&!p.ai&&p.active!==false).map(p=>({...p,id:p.uid,active:true}));
      const seed={schema:2,actorId:'u-wangyilin',people:humans,clones:root.__EVA_MEMBERSHIP_CLONES||[],projects:{},groups:{},threads:{}};
      for(const p of projects){
        const ids=[...new Set(['u-wangyilin',...(p.members||[]).map(m=>humans.find(h=>h.name===m.name)?.id).filter(Boolean)])];
        seed.projects[p.id]={id:p.id,name:p.name,ownerId:ids[0],humans:ids.map((id,i)=>({id,role:i===0?'owner':'member'})),cloneIds:[]};
        for(const g of channels[p.id]||[]){
          // Existing demo participants seed ordinary groups once; live relationships use the store.
          if(seed.groups[g.id])continue;
          seed.groups[g.id]={id:g.id,name:g.name,projectId:p.id,ownerId:ids[0],humans:ids.map(id=>({id,role:'member'})),cloneIds:[]};
          for(const t of g.threads||[])seed.threads[t.id]=g.id;
        }
      }
      saved=seed;
    }
    if(!saved.seededOrgGroups){
      saved.seededOrgGroups=true;
      for(const g of orgChannels){saved.groups[g.id]={id:g.id,name:g.name,projectId:null,ownerId:'u-wangyilin',humans:[{id:'u-wangyilin',role:'member'}],cloneIds:[]};for(const t of g.threads||[])saved.threads[t.id]=g.id;}
    }
    // One-time additive fixture migration; do not recreate removed demo groups.
    const driveDemo=root.__EVA_DRIVE_CHAT_DEMO,driveProject=saved.projects['drive-design'];
    if(driveDemo&&driveProject&&!saved.seededDriveDiscussionV1){
      saved.messages||={};saved.threadDetails||={};
      for(const g of driveDemo){
        if(saved.groups[g.id])continue;
        const humans=driveProject.humans.map(p=>({id:p.id,role:'member'}));
        saved.groups[g.id]={id:g.id,name:g.name,projectId:'drive-design',ownerId:driveProject.ownerId,humans,cloneIds:[],employeeIds:[]};
        for(const t of g.threads||[]){saved.threads[t.id]=g.id;saved.threadDetails[t.id]={status:1,...t,created_at:root.__EVA_DEMO_TIME?.T1};}
        for(const [id,messages] of Object.entries(g.messages))saved.messages[id]=messages.filter(m=>humans.some(p=>p.id===m.sender.uid)).map(m=>({...m,sender:{...saved.people.find(p=>p.id===m.sender.uid),...m.sender}}));
      }
      saved.seededDriveDiscussionV1=true;
    }
    if(!saved.officialGroupConsolidationV1){
      const retired=new Set(['c-official-announcements','c-official-feedback','c-official-community'].filter(id=>{
        const children=Object.entries(saved.threads||{}).filter(([,parent])=>parent===id).map(([tid])=>tid);
        return ![id,...children].some(cid=>(saved.messages?.[cid]||[]).length||saved.chatSettings?.[cid]||saved.threadDetails?.[cid]);
      }));
      for(const [id,parent] of Object.entries(saved.threads||{})){if(retired.has(parent)){delete saved.threads[id];delete saved.threadDetails?.[id];delete saved.messages?.[id];}}
      for(const id of retired){delete saved.groups[id];delete saved.messages?.[id];delete saved.chatSettings?.[id];}
      if(saved.groups['official-community']?.name==='用户反馈与开发交流')saved.groups['official-community'].name='用户使用反馈与开发交流';
      saved.officialGroupConsolidationV1=true;
    }
    const officialDemo=root.__EVA_OFFICIAL_COMMUNITY_DEMO,officialProject=saved.projects.official;
    if(officialDemo&&officialProject&&!saved.seededOfficialCommunityV1){
      for(const id of officialDemo.humans){if(saved.people.some(p=>p.id===id&&p.active!==false)&&!officialProject.humans.some(p=>p.id===id))officialProject.humans.push({id,role:'member'});}
      const cloneIds=officialDemo.cloneIds.filter(id=>saved.clones.some(c=>c.id===id&&c.active!==false&&officialProject.humans.some(p=>p.id===c.ownerId)));
      officialProject.cloneIds=[...new Set([...officialProject.cloneIds,...cloneIds])];
      if(!saved.groups[officialDemo.id]){
        saved.groups[officialDemo.id]={id:officialDemo.id,name:officialDemo.name,projectId:'official',ownerId:officialProject.ownerId,humans:officialProject.humans.map(p=>({id:p.id,role:'member'})),cloneIds};
        saved.messages||={};saved.threadDetails||={};
        for(const t of officialDemo.threads){saved.threads[t.id]=officialDemo.id;saved.threadDetails[t.id]={status:1,...t,created_at:root.__EVA_DEMO_TIME?.T1};}
        for(const [id,messages] of Object.entries(officialDemo.messages))saved.messages[id]=messages.map((m,index)=>{
          const {senderId,...message}=m;
          const sender=senderId==='project-agent:official'?{id:senderId,uid:senderId,name:root.EvaAIIdentity.projectAgentName(saved.projects.official),kind:'project-agent',ai:true,projectId:'official'}:saved.people.find(p=>p.id===senderId)||saved.clones.find(p=>p.id===senderId);
          return {...message,fixtureId:'official-community-v1:'+id+':'+index,sender:{...sender,uid:senderId,...(cloneIds.includes(senderId)?{ai:true}: {})}};
        });
      }
      saved.seededOfficialCommunityV1=true;
    }
    for(const t of officialDemo?.threads||[]){const existing=saved.threadDetails?.[t.id];if(existing&&existing.status==null&&!existing.deleted)existing.status=1;}
    // Reconcile only retired demo defaults; preserve user-edited names and active flags.
    for(const [id,oldName] of [['b-wangyilin','王宜林的分身'],['clone-linxiao','林晓的分身'],['clone-hejing','何静的分身']]){
      const c=saved.clones?.find(c=>c.id===id),seed=root.__EVA_MEMBERSHIP_CLONES?.find(c=>c.id===id);
      if(c?.name===oldName&&seed)c.name=seed.name;
    }
    // Import the former project-directory preference once. Future pin changes
    // are owned by the member store and shared with the follow list.
    if(!saved.pinnedProjects){
      let ids=['prod','drive-design','official','lab'];
      try{
        const raw=root.localStorage.getItem('eva:pinned-project-ids:v3');
        const legacy=raw===null?root.localStorage.getItem('eva:pinned-project-ids:v2'):null;
        const value=JSON.parse(raw??legacy??'["prod","drive-design","official","lab"]');
        ids=Array.isArray(value)?value.slice(0,6):ids;
        if(raw===null&&ids.length===1&&ids[0]==='drive-design')ids=['prod','drive-design','official','lab'];
      }catch{}
      saved.pinnedProjects={'u-wangyilin':ids};
    }
    const roleDemo=root.__EVA_PROJECT_ROLE_DEMO;
    if(roleDemo&&saved.projects[roleDemo.projectId]&&!saved.seededProjectRolesV1){
      const p=saved.projects[roleDemo.projectId];p.projectRoles=JSON.parse(JSON.stringify(roleDemo.roles));p.memberRoleIds={};
      for(const [id,ids] of Object.entries(roleDemo.assignments))if(p.humans.some(m=>m.id===id)||p.cloneIds.includes(id))p.memberRoleIds[id]=[...ids];
      saved.seededProjectRolesV1=true;
    }
    const store=create(saved,state=>{try{root.localStorage.setItem(key,JSON.stringify(state));}catch{}},resolveProjectInfo);
    root.EvaAvatar?.setGroupAppearanceResolver(id=>{
      const context=store.conversationContext(id,store.snapshot().actorId);
      const settings=store.snapshot().chatSettings[context?.groupId||id];
      return {avatar:settings?.avatar,project:context};
    });
    store.seedSupplyChatContent();store.seedProjectAgents();return store;
  }
  root.EvaMembership=Object.freeze({create,bootstrap});
})(window);
