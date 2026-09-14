(function(root){
  'use strict';

  const clone=value=>JSON.parse(JSON.stringify(value));
  const stamp=()=>new Date().toISOString();
  const ext=name=>String(name||'').includes('.')?String(name).split('.').pop().toLowerCase():'';
  const fileTypeLabel=name=>{
    const value=ext(name);
    if(value==='pdf')return'PDF';
    if(['doc','docx'].includes(value))return'Word';
    if(['xls','xlsx','csv'].includes(value))return'Excel';
    if(['ppt','pptx'].includes(value))return'PPT';
    if(['png','jpg','jpeg','gif','webp','svg'].includes(value))return'图片';
    if(['mp3','wav','aac','m4a','flac'].includes(value))return'音频';
    if(['mp4','mov','avi','mkv','webm'].includes(value))return'视频';
    if(['zip','rar','7z','tar','gz'].includes(value))return'压缩包';
    if(['txt','md','markdown','rtf'].includes(value))return'文本';
    return value?value.toUpperCase():'其他';
  };
  const folder=(id,spaceId,name,creator,updatedAt,parentId=0)=>({id,spaceId,projectId:spaceId,area:'project',parent_id:parentId,name,type:'folder',size:0,creator,editor:'未编辑过',createdBy:creator,updatedBy:creator,updated_at:updatedAt,description:'项目资料文件夹'});
  const file=(id,spaceId,name,size,creator,editor,updatedAt,source,description,parentId=0)=>({id,spaceId,projectId:spaceId,area:'project',parent_id:parentId,name,type:'blob',size,extension:ext(name),creator,editor,createdBy:creator,updatedBy:editor==='未编辑过'?creator:editor,updated_at:updatedAt,source:source||{type:'upload',label:'本地上传'},description:description||'项目团队文件'});
  const externalProviderLabel=provider=>provider==='feishu'?'飞书':provider==='wecom'?'企业微信':'网页';
  const externalKindLabel=kind=>kind==='folder'?'文件夹':kind==='document'?'文档':kind==='sheet'?'表格':kind==='page'?'页面':'链接';
  const externalTypeLabel=external=>externalProviderLabel(external?.provider)+externalKindLabel(external?.kind)+' · 外部链接';
  const externalKindFromURL=parsed=>{
    const locator=(parsed.pathname+'/'+String(parsed.hash||'').replace(/^#/,'')).toLowerCase();
    const declaredKind=String(parsed.searchParams.get('type')||parsed.searchParams.get('resource_type')||'').toLowerCase();
    if(['folder','directory','dir'].includes(declaredKind)||/(^|\/)(?:drive\/)?folders?(?:\/|$)/.test(locator)||/(^|\/)directories(?:\/|$)/.test(locator))return'folder';
    if(/(^|\/)(?:sheets?|bitable|base|smartsheet)(?:\/|$)/.test(locator))return'sheet';
    if(/(^|\/)(?:docx?|docs?|document)(?:\/|$)/.test(locator))return'document';
    if(/(^|\/)(?:wiki|pages?|smartpage)(?:\/|$)/.test(locator))return'page';
    return'unknown';
  };
  const externalResourceToken=(parsed,provider,kind)=>{
    const locator=parsed.pathname+'/'+String(parsed.hash||'').replace(/^#/,'');
    if(kind==='folder'){
      const folderMatch=locator.match(/(?:^|\/)(?:drive\/)?folders?\/([^/?#]+)/i)||locator.match(/(?:^|\/)directories\/([^/?#]+)/i);
      if(folderMatch)return folderMatch[1];
      if(provider==='wecom'&&parsed.hostname.toLowerCase()==='drive.weixin.qq.com'&&/^\/s\/?$/i.test(parsed.pathname)&&parsed.searchParams.get('k'))return parsed.searchParams.get('k');
    }
    return'';
  };
  const parseExternalLink=(value,options={})=>{
    const input=String(value||'').trim();if(!input)throw new Error('请输入外部链接');if(input.length>2048)throw new Error('外部链接不能超过 2048 个字符');
    let parsed;try{parsed=new URL(input);}catch{throw new Error('请输入完整的 http 或 https 链接');}
    if(!['http:','https:'].includes(parsed.protocol))throw new Error('仅支持 http 或 https 链接');
    if(parsed.username||parsed.password)throw new Error('外部链接不能包含账号或密码');
    const host=parsed.hostname.toLowerCase().replace(/\.$/,'');
    const matchesDomain=domain=>host===domain||host.endsWith('.'+domain);
    const provider=matchesDomain('feishu.cn')||matchesDomain('larksuite.com')?'feishu':matchesDomain('work.weixin.qq.com')||matchesDomain('wecom.work')||matchesDomain('drive.weixin.qq.com')||matchesDomain('doc.weixin.qq.com')?'wecom':'web';
    const detectedKind=externalKindFromURL(parsed),requestedKind=options.kind||null;
    if(requestedKind==='folder'&&detectedKind!=='unknown'&&detectedKind!=='folder')throw new Error('该地址看起来不是文件夹链接，请改用“普通外部链接”');
    const kind=requestedKind||detectedKind,detection=requestedKind==='folder'&&detectedKind==='unknown'?'user_confirmed':detectedKind==='unknown'?'unknown':'pattern';
    const url=parsed.toString(),resourceToken=externalResourceToken(parsed,provider,kind),resourceKey=resourceToken?[provider,kind,resourceToken].join(':'):url;
    return{url,canonicalUrl:url,provider,kind,detectedKind,detection,host,resourceKey};
  };
  const externalIdentity=external=>{
    if(external?.resourceKey)return external.resourceKey;
    try{return parseExternalLink(external?.url,{kind:external?.kind==='folder'?'folder':undefined}).resourceKey;}catch{return external?.url||'';}
  };

  const DEFAULT_RECORDS=[
    folder('prod-folder-meeting','prod','会议纪要','王宜林','2026-09-05T11:30:00+08:00'),
    folder('prod-folder-supplier','prod','供应商资料','周远','2026-09-04T16:20:00+08:00'),
    file('prod-report','prod','A-2409来料异常分析报告.pdf',421888,'林晓','林晓','2026-09-07T11:32:00+08:00',{type:'task',label:'任务 SC-103 · 来料异常分析'},'关键供应商来料异常的根因、措施与验证记录'),
    file('prod-demand','prod','本季度间接采购需求清单.xlsx',2936012,'王宜林','王宜林','2026-09-07T10:48:00+08:00',{type:'upload',label:'王宜林本地上传'},'各部门提交的采购数量、预算与期望到货时间'),
    file('prod-compliance','prod','新供应商准入合规材料.zip',18874368,'周远','周远','2026-09-06T17:26:00+08:00',{type:'group-copy',label:'项目群 · 供应商整改协同'},'从项目群保存到项目文件管理的独立副本'),
    file('prod-minutes','prod','0905-供应链周会纪要.md',9632,'Eva 项目管理专员','Eva 项目管理专员','2026-09-05T11:30:00+08:00',{type:'task',label:'任务 SC-105 · 项目周报'},'任务产出归属项目空间','prod-folder-meeting'),
    file('prod-qualification','prod','核心供应商资质汇总.xlsx',1572864,'周远','未编辑过','2026-09-04T16:20:00+08:00',{type:'upload',label:'周远本地上传'},'供应商资质与有效期汇总','prod-folder-supplier'),
    folder('lab-folder-delivery','lab','交付资料','苏航','2026-09-06T09:50:00+08:00'),
    file('lab-profile','lab','客户XX公司资料.pdf',1468006,'苏航','苏航','2026-09-06T09:18:00+08:00',{type:'group-copy',label:'项目群 · 客户联合交付群'},'从项目群保存的客户背景与需求资料','lab-folder-delivery'),
    file('lab-script','lab','客户XX公司销售话术.docx',131072,'销售话术专家','销售话术专家','2026-09-06T09:26:00+08:00',{type:'task',label:'任务 · 客户销售准备'},'专家任务产出，文件归属项目空间','lab-folder-delivery'),
    {id:'personal-brand',spaceId:'personal:u-wangyilin',projectId:null,area:'personal',parent_id:0,name:'品牌视觉素材.zip',type:'blob',size:25794969,extension:'zip',creator:'王宜林',editor:'未编辑过',createdBy:'王宜林',updatedBy:'王宜林',updated_at:'2026-09-06T18:05:00+08:00',source:{type:'upload',label:'本地上传'},description:'个人空间中的品牌素材'},
    {id:'personal-notes',spaceId:'personal:u-wangyilin',projectId:null,area:'personal',parent_id:0,name:'项目复盘备忘.md',type:'blob',size:18640,extension:'md',creator:'王宜林',editor:'王宜林',createdBy:'王宜林',updatedBy:'王宜林',updated_at:'2026-09-06T16:40:00+08:00',source:{type:'upload',label:'本地上传'},description:'个人空间文件'},
    {id:'personal-word-demo',spaceId:'personal:u-wangyilin',projectId:null,area:'personal',parent_id:0,name:'A-2409临时放行评审纪要.docx',type:'blob',size:28416,extension:'docx',creator:'王宜林',editor:'王宜林',createdBy:'王宜林',updatedBy:'王宜林',updated_at:'2026-09-07T17:35:00+08:00',source:{type:'upload',label:'本地上传'},description:'供应商异常临时放行评审纪要'},
    {id:'personal-sheet-demo',spaceId:'personal:u-wangyilin',projectId:null,area:'personal',parent_id:0,name:'EVA-分享权限验收矩阵.xlsx',type:'blob',size:48640,extension:'xlsx',creator:'王宜林',editor:'王宜林',createdBy:'王宜林',updatedBy:'王宜林',updated_at:'2026-09-07T16:20:00+08:00',source:{type:'upload',label:'本地上传'},description:'不同角色与分享范围的验收矩阵'},
    {id:'personal-slides-demo',spaceId:'personal:u-wangyilin',projectId:null,area:'personal',parent_id:0,name:'UI设计师发展前景.pptx',type:'blob',size:2516582,extension:'pptx',creator:'王宜林',editor:'未编辑过',createdBy:'王宜林',updatedBy:'王宜林',updated_at:'2026-09-07T15:45:00+08:00',source:{type:'task',label:'Eva 任务产出'},description:'管理层同步使用的六页演示文稿'}
  ].concat(clone(Array.isArray(root.__EVA_EXTERNAL_LINK_SAMPLES)?root.__EVA_EXTERNAL_LINK_SAMPLES:[]));

  const relation=(type,id,label,meta)=>({type,id,label,meta});
  const RECORD_METADATA={
    'prod-report':{tags:['质量','整改'],systemRelations:[relation('task','SC-103','SC-103 · 来料异常分析','进行中 · 负责人：林晓')]},
    'prod-demand':{tags:['采购','预算']},
    'prod-compliance':{tags:['供应商','准入'],systemRelations:[relation('group','supply-demo-rectification','供应商整改协同','项目群 · 来源文件')]},
    'prod-minutes':{tags:['周会','纪要'],systemRelations:[relation('task','SC-105','SC-105 · 项目周报','进行中 · 负责人：周远')]},
    'prod-qualification':{tags:['供应商','资质']},
    'lab-profile':{tags:['客户资料'],systemRelations:[relation('group','all:lab','客户联合交付群','项目群 · 来源文件')]},
    'lab-script':{tags:['销售','客户'],systemRelations:[relation('task','LAB-12','客户销售准备','已完成 · 负责人：苏航')]},
    'personal-brand':{tags:['品牌','素材']},
    'personal-notes':{tags:['复盘']},
    'personal-word-demo':{tags:['评审','纪要']},
    'personal-sheet-demo':{tags:['权限','验收']},
    'personal-slides-demo':{tags:['汇报','设计']}
  };
  const normalizeRecord=item=>{
    const preset=RECORD_METADATA[item.id]||{},isFolder=item.type==='folder',normalized=clone(item);delete normalized.category;
    delete normalized.pinned;delete normalized.pinnedAt;
    const systemRelations=clone(item.systemRelations||preset.systemRelations||[]).filter(itemRelation=>itemRelation.type!=='run');
    return {...normalized,createdAt:item.createdAt||item.created_at||item.updated_at||stamp(),tags:isFolder?[]:clone(item.tags||preset.tags||[]),systemRelations};
  };

  const normalizePins=value=>{
    const latest=new Map();
    (Array.isArray(value)?value:[]).forEach(item=>{
      const actorId=String(item?.actorId||''),fileId=String(item?.fileId||''),pinnedAt=String(item?.pinnedAt||'');
      if(!actorId||!fileId||!pinnedAt)return;
      const key=actorId+'\u0000'+fileId,old=latest.get(key);
      if(!old||old.pinnedAt<pinnedAt)latest.set(key,{actorId,fileId,pinnedAt});
    });
    return Array.from(latest.values());
  };

  function create(membership,seed=[],persist,resetSeed=seed,pinSeed=[],persistPins){
    let records=clone(seed).filter(item=>item.area!=='shared'&&!String(item.spaceId||'').startsWith('shared:')).map(normalizeRecord),pins=normalizePins(pinSeed),revision=0;const listeners=new Set();
    const actorName=actorId=>membership.person(actorId)?.name||membership.clone?.(actorId)?.name||membership.employee?.(actorId)?.name||membership.projectAgent?.(String(actorId).replace(/^project-agent:/,''))?.name||actorId;
    const snapshot=()=>membership.snapshot();
    const personalSpace=actorId=>'personal:'+actorId;
    const role=(spaceId,actorId)=>{
      if(spaceId===personalSpace(actorId))return'owner';
      const project=snapshot().projects[spaceId];
      const row=project?.humans?.find(item=>item.id===actorId);
      if(!row)return membership.canRead(spaceId,actorId)?'editor':null;
      if(project.ownerId===actorId||row.role==='owner')return'owner';
      if(row.role==='admin')return'manager';
      return'editor';
    };
    const editableActions=new Set(['read','preview','download','upload','add-external-link','edit-external-link','create-folder','rename','move','copy','copy-link','save-group-file','edit-tags','create-shortcut']);
    const managerActions=new Set(['trash','view-trash','restore','delete-forever','manage-members','manage-links','manage-settings','view-audit']);
    const ownerActions=new Set(['set-manager','transfer-ownership']);
    const can=(action,spaceId,actorId)=>{
      const value=role(spaceId,actorId);
      return Boolean(value&&(editableActions.has(action)||(value!=='editor'&&managerActions.has(action))||(value==='owner'&&ownerActions.has(action))));
    };
    const fail=message=>{throw new Error(message);};
    const requireAction=(action,spaceId,actorId)=>can(action,spaceId,actorId)||fail('当前角色无此操作权限');
    const notify=()=>{revision++;if(persist)persist(clone(records));if(persistPins)persistPins(clone(pins));listeners.forEach(fn=>fn());};
    const record=id=>records.find(item=>item.id===id)||fail('文件不存在');
    const pinRecord=(actorId,fileId)=>pins.find(item=>item.actorId===actorId&&item.fileId===fileId)||null;
    const areaForSpace=spaceId=>spaceId.startsWith('personal:')?'personal':'project';
    const projectForSpace=spaceId=>areaForSpace(spaceId)==='project'?spaceId:null;
    const ensureSameSpace=(item,targetParentId)=>{
      if(!targetParentId)return;
      const target=record(targetParentId);
      if(target.type!=='folder'||target.spaceId!==item.spaceId)fail('不能跨空间移动或复制');
    };
    const descendants=(id,spaceId)=>{const scope=spaceId??record(id).spaceId,ids=new Set([id]);let changed=true;while(changed){changed=false;for(const item of records){if(item.spaceId===scope&&ids.has(item.parent_id)&&!ids.has(item.id)){ids.add(item.id);changed=true;}}}return ids;};
    const activeDescendants=(id,spaceId)=>{const scope=spaceId??record(id).spaceId,ids=new Set([id]);let changed=true;while(changed){changed=false;for(const item of records){if(item.spaceId===scope&&!item.deletedAt&&ids.has(item.parent_id)&&!ids.has(item.id)){ids.add(item.id);changed=true;}}}return ids;};
    const isTrashRoot=item=>{
      if(!item?.deletedAt)return false;
      if(typeof item.directTrash==='boolean')return item.directTrash;
      if(item.trashRootId)return item.trashRootId===item.id;
      const parentId=item.originalParentId??item.parent_id??0;if(!parentId)return true;
      const parent=records.find(candidate=>candidate.id===parentId&&candidate.spaceId===item.spaceId);
      return !parent?.deletedAt;
    };
    const migrateLegacyTrashMetadata=()=>{
      const pending=records.filter(item=>item.deletedAt&&!item.trashRootId);
      const roots=pending.filter(item=>{const parentId=item.originalParentId??item.parent_id??0;return !parentId||!pending.some(candidate=>candidate.id===parentId&&candidate.spaceId===item.spaceId);});
      for(const rootItem of roots){
        const batchId='legacy:'+rootItem.id+':'+String(rootItem.deletedAt||'unknown'),ids=descendants(rootItem.id,rootItem.spaceId);
        for(const target of pending){if(target.spaceId===rootItem.spaceId&&ids.has(target.id)&&!target.trashRootId){target.deletionBatchId=batchId;target.trashRootId=rootItem.id;target.directTrash=target.id===rootItem.id;}}
      }
    };
    migrateLegacyTrashMetadata();
    const trashUnitRecords=item=>{
      if(item.deletionBatchId)return records.filter(target=>target.spaceId===item.spaceId&&target.deletedAt&&target.deletionBatchId===item.deletionBatchId&&target.trashRootId===item.id);
      const ids=descendants(item.id,item.spaceId);return records.filter(target=>target.spaceId===item.spaceId&&target.deletedAt&&ids.has(target.id));
    };
    const requireTrashRoot=(item,message)=>{
      if(!item.deletedAt)fail('文件不在回收站');
      if(!isTrashRoot(item))fail(message||'请操作整个文件夹');
    };
    const restoredName=(item,parentId)=>{
      const conflict=name=>records.some(candidate=>candidate.id!==item.id&&!candidate.deletedAt&&candidate.spaceId===item.spaceId&&candidate.parent_id===(parentId||0)&&candidate.name===name);
      if(!conflict(item.name))return item.name;
      const extension=item.type==='folder'?'':(String(item.name).match(/(\.[^.]+)$/)?.[1]||''),stem=extension?item.name.slice(0,-extension.length):item.name;
      const base=stem.replace(/（已恢复(?: \d+)?）$/,'');let index=1,candidate='';
      do{candidate=base+'（已恢复'+(index===1?'':' '+index)+'）'+extension;index++;}while(conflict(candidate));
      return candidate;
    };
    const shortcutSource=item=>item.type==='shortcut'?records.find(candidate=>candidate.id===item.sourceFileId)||null:null;
    const shortcutStatus=(item,actorId)=>{
      if(item.type!=='shortcut')return'available';
      const source=shortcutSource(item);if(!source||source.deletedAt)return'missing';
      return role(source.spaceId,actorId)?'available':'forbidden';
    };
    const sourceReadable=(item,actorId)=>{
      if(item.source?.type==='ai-conversation-copy')return item.source.ownerId===actorId;
      if(item.source?.type==='chat-copy')return Boolean(membership.canReadDirect?.(item.source.conversationId,actorId));
      if(item.source?.type==='group-copy')return Boolean(membership.canRead(item.source.threadId||item.source.groupId||item.source.conversationId,actorId));
      return true;
    };
    const visibleRecord=(item,actorId)=>{
      const value=clone(item),agent=membership.projectAgent?.(item.projectId||item.spaceId);
      if(agent)for(const key of ['creator','editor','createdBy','updatedBy'])if(root.EvaAIIdentity.projectAgentLegacyNames({name:agent.name.replace(/ · 项目管家$/,'')}).includes(value[key]))value[key]=agent.name;
      delete value.identity;
      if(actorId&&!sourceReadable(item,actorId)){
        const sourceType=item.source?.type;
        value.source={type:sourceType,label:sourceType==='ai-conversation-copy'?'从 AI 会话保存':sourceType==='chat-copy'?'从私聊保存':'从群聊保存'};
        value.systemRelations=(value.systemRelations||[]).map(itemRelation=>{
          if(itemRelation.type==='ai-conversation')return{type:'ai-conversation',id:null,label:'来源 AI 会话',meta:'你无权访问原会话',restricted:true,navigable:false};
          if(itemRelation.type==='chat')return{type:'chat',id:null,label:'来源私聊',meta:'你无权访问原会话',restricted:true,navigable:false};
          if(itemRelation.type==='group')return{type:'group',id:null,label:'来源群聊',meta:'你无权访问来源消息',restricted:true,navigable:false};
          return itemRelation;
        });
        delete value.conversationArtifact;
      }
      if(item.type==='shortcut'&&actorId){
        const status=shortcutStatus(item,actorId),source=shortcutSource(item);value.shortcutStatus=status;
        if(status==='available'){
          value.name=item.customName?item.name:source.name;value.extension=source.extension||ext(source.name);value.size=source.size||0;value.sourceAvailable=true;
        }else{
          value.name=status==='missing'?'源文件已失效':'无权访问的快捷方式';value.extension='';value.size=0;value.sourceAvailable=false;value.systemRelations=[];
        }
      }
      const preference=actorId?pinRecord(actorId,item.id):null;
      value.pinned=Boolean(preference);value.pinnedAt=preference?.pinnedAt||null;
      return value;
    };
    const normalizeTags=value=>Array.from(new Set((Array.isArray(value)?value:String(value||'').split(/[，,]/)).map(tag=>String(tag).trim()).filter(Boolean))).slice(0,8).map(tag=>tag.slice(0,20));
    const conversationReadable=(source,actorId)=>{
      if(source?.type==='ai-conversation')return Boolean(membership.person(actorId)&&source.ownerId===actorId);
      if(source?.type==='chat')return Boolean(membership.canReadDirect?.(source.conversationId,actorId));
      if(source?.type==='group')return Boolean(membership.canRead(source.threadId||source.groupId||source.conversationId,actorId));
      return false;
    };
    const conversationIdentity=(spaceId,parentId,sourceFile,source)=>JSON.stringify([
      spaceId,parentId||0,source.type,source.ownerId||null,source.conversationId||source.groupId||null,
      source.messageId,sourceFile.id||sourceFile.attachmentId||(source.messageId+':'+sourceFile.name),sourceFile.version||1
    ]);
    const availableName=(spaceId,parentId,name)=>{
      const occupied=new Set(records.filter(item=>!item.deletedAt&&item.spaceId===spaceId&&item.parent_id===(parentId||0)).map(item=>item.name));
      if(!occupied.has(name))return name;
      const match=String(name).match(/^(.*?)(\.[^.]*)?$/),base=match?.[1]||name,suffix=match?.[2]||'';
      let index=2,candidate;do{candidate=base+' ('+index+++')'+suffix;}while(occupied.has(candidate));return candidate;
    };
    const spaceLabel=(spaceId,actorId)=>{
      if(spaceId===personalSpace(actorId))return'个人空间';
      return snapshot().projects[spaceId]?.name||'项目空间';
    };
    const api={
      subscribe(fn){listeners.add(fn);return()=>listeners.delete(fn);},getSnapshot:()=>revision,
      snapshot(actorId){return clone(records.map(item=>visibleRecord(item,actorId)));},role,can,personalSpace,
      isPinned(actorId,id){return Boolean(pinRecord(actorId,id));},
      setPinned(actorId,id,nextPinned){
        const item=record(id);if(item.deletedAt)fail('回收站中的文件或文件夹不能置顶');requireAction('read',item.spaceId,actorId);
        const index=pins.findIndex(pin=>pin.actorId===actorId&&pin.fileId===id),desired=Boolean(nextPinned);
        if(desired&&index>=0)return true;if(!desired&&index<0)return false;
        if(desired)pins.push({actorId,fileId:id,pinnedAt:stamp()});else pins.splice(index,1);
        notify();return desired;
      },
      togglePinned(actorId,id){return api.setPinned(actorId,id,!api.isPinned(actorId,id));},
      pinnedFiles(actorId,options={}){
        const spaceId=options.spaceId||null;
        return pins.filter(pin=>pin.actorId===actorId).sort((left,right)=>right.pinnedAt.localeCompare(left.pinnedAt)||left.fileId.localeCompare(right.fileId)).map(pin=>{
          const item=records.find(candidate=>candidate.id===pin.fileId);
          if(!item||item.deletedAt||!role(item.spaceId,actorId)||(spaceId&&item.spaceId!==spaceId))return null;
          return visibleRecord(item,actorId);
        }).filter(Boolean).map(clone);
      },
      sortEntries(actorId,entries,options={}){
        const pinnedFirst=options.pinnedFirst!==false;
        return clone(entries).sort((left,right)=>{
          const leftPin=pinnedFirst&&!left.deletedAt?pinRecord(actorId,left.id):null;
          const rightPin=pinnedFirst&&!right.deletedAt?pinRecord(actorId,right.id):null;
          if(Boolean(leftPin)!==Boolean(rightPin))return leftPin?-1:1;
          if(leftPin&&rightPin){const pinOrder=rightPin.pinnedAt.localeCompare(leftPin.pinnedAt);if(pinOrder)return pinOrder;}
          if(left.type!==right.type){if(left.type==='folder')return-1;if(right.type==='folder')return 1;}
          return String(right.deletedAt||right.createdAt).localeCompare(String(left.deletedAt||left.createdAt))||String(left.id).localeCompare(String(right.id));
        });
      },
      fileTypeFor(idOrRecord,actorId){
        const item=typeof idOrRecord==='string'?record(idOrRecord):idOrRecord;if(item.type==='folder')return'文件夹';
        if(item.type==='shortcut'){
          const visible=visibleRecord(item,actorId),source=shortcutSource(item);return visible.shortcutStatus==='available'?(source?.type==='external_link'?externalTypeLabel(source.external):fileTypeLabel(visible.name))+' · 快捷方式':'快捷方式';
        }
        if(item.type==='external_link')return externalTypeLabel(item.external);
        return fileTypeLabel(item.name);
      },
      shortcutInfo(idOrRecord,actorId){
        const item=typeof idOrRecord==='string'?record(idOrRecord):idOrRecord;if(item.type!=='shortcut')return null;
        const status=shortcutStatus(item,actorId),source=shortcutSource(item);
        if(status!=='available')return{status,statusLabel:status==='missing'?'源文件已失效':'无权访问源文件'};
        return{status,statusLabel:'可访问',sourceName:source.name,sourceSpaceId:source.spaceId,sourceSpaceName:spaceLabel(source.spaceId,actorId)};
      },
      resolveFile(idOrRecord,actorId){
        const item=typeof idOrRecord==='string'?record(idOrRecord):record(idOrRecord.id);if(item.type!=='shortcut'){requireAction('read',item.spaceId,actorId);return clone(item);}
        if(shortcutStatus(item,actorId)!=='available')fail(shortcutStatus(item,actorId)==='missing'?'源文件已失效':'你无权访问源文件');return clone(shortcutSource(item));
      },
      externalLinkInfo(idOrRecord,actorId){
        const item=typeof idOrRecord==='string'?record(idOrRecord):record(idOrRecord.id),target=item.type==='shortcut'?api.resolveFile(item,actorId):(requireAction('read',item.spaceId,actorId),item);
        if(target.type!=='external_link')return null;
        return{url:target.external.url,canonicalUrl:target.external.canonicalUrl||target.external.url,host:target.external.host,provider:target.external.provider,providerLabel:externalProviderLabel(target.external.provider),kind:target.external.kind,kindLabel:externalKindLabel(target.external.kind),detection:target.external.detection||'unknown',resourceKey:externalIdentity(target.external),typeLabel:externalTypeLabel(target.external)};
      },
      inspectExternalLink(value,options={}){
        const external=parseExternalLink(value,options);return{...clone(external),providerLabel:externalProviderLabel(external.provider),kindLabel:externalKindLabel(external.kind),typeLabel:externalTypeLabel(external)};
      },
      writableSpaces(actorId,excludeSpaceId){
        const result=[{id:personalSpace(actorId),name:'个人空间',kind:'personal'}];
        Object.entries(snapshot().projects).forEach(([projectId,project])=>{if(role(projectId,actorId))result.push({id:projectId,name:project.name||projectId,kind:'project'});});
        return clone(result.filter(space=>space.id!==excludeSpaceId));
      },
      relationsFor(idOrRecord,actorId){
        const item=typeof idOrRecord==='string'?record(idOrRecord):idOrRecord;
        if(item.type==='shortcut'){
          const info=api.shortcutInfo(item,actorId);
          if(info.status!=='available')return[{type:'file',id:null,label:info.statusLabel,meta:'快捷方式不会授予源文件权限',restricted:true}];
          return[relation('file',item.sourceFileId,info.sourceName,'来源空间 · '+info.sourceSpaceName)];
        }
        return clone(item.systemRelations||[]).map(itemRelation=>{
          if(itemRelation.type==='group'&&itemRelation.id&&!membership.canRead(itemRelation.id,actorId))return {...itemRelation,label:'来源群聊',meta:'你无权访问来源消息',restricted:true};
          if(itemRelation.type==='chat'&&itemRelation.id&&!membership.canReadDirect?.(itemRelation.id,actorId))return{type:'chat',id:null,label:'来源私聊',meta:'你无权访问原会话',restricted:true,navigable:false};
          if(itemRelation.type==='ai-conversation'&&itemRelation.target?.ownerId!==actorId)return{type:'ai-conversation',id:null,label:'来源 AI 会话',meta:'你无权访问原会话',restricted:true,navigable:false};
          return itemRelation;
        });
      },
      sourceLabelFor(idOrRecord,actorId){
        const item=typeof idOrRecord==='string'?record(idOrRecord):idOrRecord;
        if(item.type==='shortcut'){const info=api.shortcutInfo(item,actorId);return info.status==='available'?'快捷方式 · '+info.sourceSpaceName:info.statusLabel;}
        if(item.source?.groupId&&!membership.canRead(item.source.groupId,actorId))return'从群聊保存';
        if(item.source?.type==='chat-copy'&&!membership.canReadDirect?.(item.source.conversationId,actorId))return'从私聊保存';
        if(item.source?.type==='ai-conversation-copy'&&item.source.ownerId!==actorId)return'从 AI 会话保存';
        return item.source?.label||'空间内创建';
      },
      list(spaceId,actorId,options={}){
        if(!role(spaceId,actorId))return[];
        return clone(records.filter(item=>item.spaceId===spaceId&&(options.deleted?Boolean(item.deletedAt):!item.deletedAt)).map(item=>visibleRecord(item,actorId)));
      },
      trashList(spaceId,actorId){
        requireAction('view-trash',spaceId,actorId);
        return clone(records.filter(item=>item.spaceId===spaceId&&isTrashRoot(item)).map(item=>({...visibleRecord(item,actorId),trashedItemCount:Math.max(0,trashUnitRecords(item).length-1)})));
      },
      all(actorId){return clone(records.filter(item=>!item.deletedAt&&Boolean(role(item.spaceId,actorId))).map(item=>visibleRecord(item,actorId)));},
      createFolder(actorId,spaceId,name,parentId=0){
        requireAction('create-folder',spaceId,actorId);name=String(name||'').trim();if(!name)fail('请输入文件夹名称');
        const now=stamp(),area=areaForSpace(spaceId),item={id:'folder-'+Date.now().toString(36)+'-'+Math.random().toString(36).slice(2,6),spaceId,projectId:projectForSpace(spaceId),area,parent_id:parentId||0,name,type:'folder',size:0,creator:actorName(actorId),editor:'未编辑过',createdBy:actorName(actorId),updatedBy:actorName(actorId),createdAt:now,updated_at:now,tags:[],systemRelations:[],source:{type:'created',label:'新建文件夹'},description:'文件夹'};
        ensureSameSpace(item,parentId);records.unshift(item);notify();return item.id;
      },
      upload(actorId,spaceId,blob,parentId=0){
        requireAction('upload',spaceId,actorId);if(!blob?.name)fail('请选择文件');
        const name=String(blob.name),now=stamp(),area=areaForSpace(spaceId),item={id:'upload-'+Date.now().toString(36)+'-'+Math.random().toString(36).slice(2,6),spaceId,projectId:projectForSpace(spaceId),area,parent_id:parentId||0,name,type:'blob',size:Number(blob.size||0),extension:ext(name),creator:actorName(actorId),editor:'未编辑过',createdBy:actorName(actorId),updatedBy:actorName(actorId),createdAt:now,updated_at:now,tags:[],systemRelations:[],source:{type:'upload',label:actorName(actorId)+'本地上传'},description:'本地上传文件'};
        ensureSameSpace(item,parentId);records.unshift(item);notify();return item.id;
      },
      createExternalLink(actorId,spaceId,draft={},parentId=0){
        requireAction('add-external-link',spaceId,actorId);const name=String(draft.name||'').trim();if(!name)fail('请输入链接名称');if(name.length>100)fail('链接名称不能超过 100 个字符');
        const external=parseExternalLink(draft.url,{kind:draft.kind}),targetProbe={spaceId};ensureSameSpace(targetProbe,parentId);
        const existing=records.find(item=>!item.deletedAt&&item.type==='external_link'&&item.spaceId===spaceId&&item.parent_id===(parentId||0)&&externalIdentity(item.external)===external.resourceKey);if(existing)return existing.id;
        const isFolder=external.kind==='folder',now=stamp(),area=areaForSpace(spaceId),item={id:'external-'+Date.now().toString(36)+'-'+Math.random().toString(36).slice(2,6),spaceId,projectId:projectForSpace(spaceId),area,parent_id:parentId||0,name,type:'external_link',size:0,extension:'',external,creator:actorName(actorId),editor:'未编辑过',createdBy:actorName(actorId),updatedBy:actorName(actorId),createdAt:now,updated_at:now,tags:normalizeTags(draft.tags||[]),systemRelations:[],source:{type:'external-link',label:isFolder?'手动添加外部文件夹':'手动添加外部链接'},description:isFolder?'外部文件夹访问入口；内容与版本由原平台维护':'外部资源入口；内容与版本由原平台维护'};
        records.unshift(item);notify();return item.id;
      },
      updateExternalLink(actorId,id,draft={}){
        const item=record(id);if(item.type!=='external_link')fail('当前资源不是外部链接');if(item.deletedAt)fail('请先从回收站恢复外部链接');requireAction('edit-external-link',item.spaceId,actorId);
        const name=String(draft.name??item.name).trim();if(!name)fail('请输入链接名称');if(name.length>100)fail('链接名称不能超过 100 个字符');const external=parseExternalLink(draft.url??item.external?.url,{kind:draft.kind||(item.external?.kind==='folder'?'folder':undefined)});
        if(item.external?.host&&external.host!==item.external.host&&!draft.confirmHostChange)fail('链接域名已变更，请确认后再保存');
        const duplicate=records.find(candidate=>candidate.id!==item.id&&!candidate.deletedAt&&candidate.type==='external_link'&&candidate.spaceId===item.spaceId&&candidate.parent_id===item.parent_id&&externalIdentity(candidate.external)===external.resourceKey);if(duplicate)fail('当前文件夹中已存在该外部链接');
        item.name=name;item.external=external;item.source={type:'external-link',label:external.kind==='folder'?'手动添加外部文件夹':'手动添加外部链接'};item.description=external.kind==='folder'?'外部文件夹访问入口；内容与版本由原平台维护':'外部资源入口；内容与版本由原平台维护';item.updatedBy=actorName(actorId);item.editor=actorName(actorId);item.updated_at=stamp();records.filter(candidate=>candidate.type==='shortcut'&&candidate.sourceFileId===item.id&&!candidate.customName).forEach(shortcut=>{shortcut.name=name;});notify();
      },
      rename(actorId,id,name){const item=record(id);requireAction('rename',item.spaceId,actorId);name=String(name||'').trim();if(!name)fail('请输入名称');item.name=name;if(item.type==='shortcut')item.customName=true;else records.filter(candidate=>candidate.type==='shortcut'&&candidate.sourceFileId===item.id&&!candidate.customName).forEach(shortcut=>{shortcut.name=name;});item.updatedBy=actorName(actorId);item.editor=actorName(actorId);item.updated_at=stamp();notify();},
      move(actorId,id,parentId=0){const item=record(id);requireAction('move',item.spaceId,actorId);if(id===parentId||descendants(id).has(parentId))fail('不能移动到自身或子文件夹');ensureSameSpace(item,parentId);if(item.type==='external_link'&&records.some(candidate=>candidate.id!==item.id&&!candidate.deletedAt&&candidate.type==='external_link'&&candidate.spaceId===item.spaceId&&candidate.parent_id===(parentId||0)&&externalIdentity(candidate.external)===externalIdentity(item.external)))fail('当前文件夹中已存在该外部链接');item.parent_id=parentId||0;item.updatedBy=actorName(actorId);item.editor=actorName(actorId);item.updated_at=stamp();notify();},
      updateTags(actorId,id,tags){
        const item=record(id);requireAction('edit-tags',item.spaceId,actorId);if(item.type==='folder')fail('文件夹无需设置标签');item.tags=normalizeTags(tags);notify();
      },
      findConversationFile(actorId,sourceFile,source){
        if(!sourceFile?.name||!source?.messageId)return null;
        const fileIdentity=sourceFile.id||sourceFile.attachmentId||(source.messageId+':'+sourceFile.name),sourceProjectId=source.type==='group'&&source.projectId?source.projectId:null;
        const found=records.find(item=>!item.deletedAt&&item.conversationArtifact&&item.conversationArtifact.sourceType===source.type&&item.conversationArtifact.conversationId===(source.conversationId||source.groupId)&&item.conversationArtifact.messageId===source.messageId&&item.conversationArtifact.fileIdentity===fileIdentity&&(item.sourceVersion||1)===(sourceFile.version||1)&&(!sourceProjectId||item.spaceId===sourceProjectId)&&Boolean(role(item.spaceId,actorId)));
        return found?clone(found):null;
      },
      saveConversationFile(actorId,targetSpaceId,targetParentId,sourceFile,source){
        if(!sourceFile?.name)fail('文件不存在');
        if(!source?.messageId||!['group','chat','ai-conversation'].includes(source.type))fail('文件来源信息不完整');
        if(!conversationReadable(source,actorId))fail('你无权访问来源会话，不能保存此文件');
        requireAction('upload',targetSpaceId,actorId);
        const parentId=targetParentId||0,targetProbe={spaceId:targetSpaceId};ensureSameSpace(targetProbe,parentId);
        const identity=conversationIdentity(targetSpaceId,parentId,sourceFile,source),old=records.find(item=>!item.deletedAt&&item.identity===identity);
        if(old)return old.id;
        const now=stamp(),area=areaForSpace(targetSpaceId),name=availableName(targetSpaceId,parentId,String(sourceFile.name));
        const conversationId=source.conversationId||source.groupId,fileIdentity=sourceFile.id||sourceFile.attachmentId||(source.messageId+':'+sourceFile.name);
        const target={ownerId:source.ownerId||null,conversationKind:source.conversationKind||source.type,identityId:source.identityId||null,sessionId:source.sessionId||conversationId,messageId:source.messageId,groupId:source.groupId||null,threadId:source.threadId||null};
        let sourceRecord,systemRelations;
        if(source.type==='ai-conversation'){
          sourceRecord={type:'ai-conversation-copy',label:'从我的 AI 保存',ownerId:source.ownerId,conversationId,identityId:source.identityId||null,identityName:source.identityName||'AI'};
          systemRelations=[{...relation('ai-conversation',conversationId,source.conversationTitle||'AI 会话',(source.identityName||'AI')+' · 我的 AI'),target,navigable:true}];
        }else if(source.type==='chat'){
          sourceRecord={type:'chat-copy',label:'从私聊保存',conversationId,senderId:source.senderId||null,senderName:source.senderName||null};
          systemRelations=[{...relation('chat',conversationId,source.conversationTitle||'来源私聊',(source.senderName||'会话成员')+' · 来源文件'),target,navigable:true}];
        }else{
          const groupId=source.groupId||conversationId;
          sourceRecord={type:'group-copy',label:'从群聊保存',groupId,groupName:source.groupName||source.conversationTitle||'来源群',conversationId,threadId:source.threadId||null,threadName:source.threadName||null,taskId:source.taskId||sourceFile.taskId||null};
          systemRelations=[{...relation('group',groupId,source.groupName||source.conversationTitle||'来源群','群聊 · 来源文件'),target,navigable:true}];
          if(sourceRecord.taskId)systemRelations.push(relation('task',sourceRecord.taskId,'任务 · '+sourceRecord.taskId,'来源任务'));
        }
        const id='saved-'+Date.now().toString(36)+'-'+Math.random().toString(36).slice(2,6),item={id,identity,spaceId:targetSpaceId,projectId:projectForSpace(targetSpaceId),area,parent_id:parentId,name,type:'blob',size:Number(sourceFile.size||0),extension:sourceFile.extension||ext(name),sourceVersion:sourceFile.version||1,sourceFileName:sourceFile.sourceFileName||sourceFile.name,previewUrl:sourceFile.previewUrl||null,url:sourceFile.url||null,source:sourceRecord,systemRelations,tags:normalizeTags(sourceFile.tags||[]),conversationArtifact:{sourceType:source.type,conversationId,messageId:source.messageId,fileIdentity},creator:actorName(actorId),editor:'未编辑过',createdBy:actorName(actorId),updatedBy:actorName(actorId),createdAt:now,updated_at:now,description:'从会话手动保存到文件库的独立文件'};
        records.unshift(item);notify();return id;
      },
      createShortcut(actorId,sourceId,targetSpaceId,targetParentId=0){
        const source=record(sourceId);if(source.type==='folder')fail('当前版本不支持文件夹快捷方式');if(source.type==='shortcut')fail('不能为快捷方式再次创建快捷方式');if(source.deletedAt)fail('源文件已进入回收站');
        requireAction('read',source.spaceId,actorId);requireAction('create-shortcut',targetSpaceId,actorId);if(source.spaceId===targetSpaceId)fail('请选择其他空间');
        const targetProbe={spaceId:targetSpaceId};ensureSameSpace(targetProbe,targetParentId);
        if(records.some(item=>item.type==='shortcut'&&!item.deletedAt&&item.sourceFileId===source.id&&item.spaceId===targetSpaceId&&item.parent_id===(targetParentId||0)))fail('目标文件夹中已存在该文件的快捷方式');
        const now=stamp(),area=areaForSpace(targetSpaceId),item={id:'shortcut-'+Date.now().toString(36)+'-'+Math.random().toString(36).slice(2,6),spaceId:targetSpaceId,projectId:projectForSpace(targetSpaceId),area,parent_id:targetParentId||0,name:source.name,type:'shortcut',sourceFileId:source.id,sourceSpaceId:source.spaceId,extension:source.extension||ext(source.name),size:0,customName:false,creator:actorName(actorId),createdBy:actorName(actorId),editor:'未编辑过',updatedBy:actorName(actorId),createdAt:now,updated_at:now,tags:[],systemRelations:[],source:{type:'shortcut',label:'跨空间快捷方式'},description:'指向其他空间源文件的快捷方式'};
        records.unshift(item);notify();return item.id;
      },
      copy(actorId,id,parentId){
        const source=record(id);if(source.type==='shortcut')fail('快捷方式不能创建副本');if(source.type==='external_link')fail('外部链接无需创建副本');requireAction('copy',source.spaceId,actorId);parentId=parentId===undefined?source.parent_id:parentId;ensureSameSpace(source,parentId);
        const ids=descendants(id),mapping=new Map(),now=stamp();for(const sourceId of ids)mapping.set(sourceId,'copy-'+Date.now().toString(36)+'-'+Math.random().toString(36).slice(2,7));
        for(const sourceId of ids){
          const original=record(sourceId),isRoot=sourceId===id,name=isRoot?original.name.replace(/(\.[^.]+)?$/,' 副本$1'):original.name;
          const inherited=(original.systemRelations||[]).map(itemRelation=>({...clone(itemRelation),inherited:true}));
          if(isRoot&&original.type!=='folder')inherited.push(relation('file',original.id,'副本来源 · '+original.name,'在当前空间创建的副本'));
          records.unshift({...clone(original),id:mapping.get(sourceId),name,parent_id:isRoot?(parentId||0):mapping.get(original.parent_id),creator:actorName(actorId),createdBy:actorName(actorId),editor:actorName(actorId),updatedBy:actorName(actorId),createdAt:now,updated_at:now,systemRelations:inherited,deletedAt:null,deletedBy:null,originalParentId:null});
        }
        notify();return mapping.get(id);
      },
      trash(actorId,id){
        const item=record(id);requireAction('trash',item.spaceId,actorId);if(item.deletedAt)fail('文件已在回收站');
        const when=stamp(),batchId='trash:'+id+':'+Date.now().toString(36)+'-'+Math.random().toString(36).slice(2,6),ids=activeDescendants(id,item.spaceId);
        for(const target of records){if(ids.has(target.id)){target.deletedAt=when;target.deletedBy=actorName(actorId);target.originalParentId=target.parent_id;target.deletionBatchId=batchId;target.trashRootId=id;target.directTrash=target.id===id;}}
        notify();
      },
      restore(actorId,id){
        const item=record(id);requireAction('restore',item.spaceId,actorId);requireTrashRoot(item,'请恢复整个文件夹');
        const unit=trashUnitRecords(item),originalParentId=item.originalParentId||0,parent=originalParentId?records.find(candidate=>candidate.id===originalParentId):null;
        const parentAvailable=Boolean(parent&&!parent.deletedAt&&parent.type==='folder'&&parent.spaceId===item.spaceId),restoreParent=parentAvailable?originalParentId:0,restoredToRoot=Boolean(originalParentId&&!parentAvailable);
        if(item.type==='external_link'&&records.some(candidate=>candidate.id!==item.id&&!candidate.deletedAt&&candidate.type==='external_link'&&candidate.spaceId===item.spaceId&&candidate.parent_id===restoreParent&&externalIdentity(candidate.external)===externalIdentity(item.external)))fail('恢复位置已存在该外部链接，请先整理现有入口');
        item.name=restoredName(item,restoreParent);
        for(const target of unit){delete target.deletedAt;delete target.deletedBy;delete target.originalParentId;delete target.deletionBatchId;delete target.trashRootId;delete target.directTrash;}
        item.parent_id=restoreParent;notify();return{restoredToRoot,parentId:restoreParent,restoredCount:unit.length};
      },
      removeForever(actorId,id){
        const item=record(id);requireAction('delete-forever',item.spaceId,actorId);requireTrashRoot(item);
        const unit=trashUnitRecords(item),ids=new Set(unit.map(target=>target.id));
        for(const target of records){if(target.spaceId===item.spaceId&&!target.deletedAt&&ids.has(target.parent_id))target.parent_id=0;}
        records=records.filter(target=>!(target.deletedAt&&ids.has(target.id)));pins=pins.filter(pin=>!ids.has(pin.fileId));notify();return{removedCount:unit.length};
      },
      resetProjectDemo(projectId){records=records.filter(r=>r.projectId!==projectId);records.push(...clone(resetSeed.filter(r=>r.projectId===projectId)).map(normalizeRecord));notify();},
      transfer(actorId,projectId,sourceFile,source){
        if(!membership.canRead(source.groupId,actorId))fail('你已不在来源群，无法转存此文件');
        if(!membership.canRead(projectId,actorId))fail('请先加入目标项目');
        if(!snapshot().projects[projectId])fail('请选择有效项目');
        if(!sourceFile?.name)fail('文件不存在');
        requireAction('save-group-file',projectId,actorId);
        const version=sourceFile.version||1,identity=JSON.stringify([projectId,source.groupId,source.threadId||null,sourceFile.id||sourceFile.name,version]);
        const old=records.find(r=>r.identity===identity);if(old)return old.id;
        const id='saved-'+Date.now().toString(36),name=sourceFile.name,now=stamp(),taskId=source.taskId||sourceFile.taskId||null;
        const systemRelations=[relation('group',source.groupId,source.groupName||'来源群','项目群 · 来源文件')];
        if(taskId)systemRelations.push(relation('task',taskId,'任务 · '+taskId,'来源任务'));
        const recordValue={id,identity,spaceId:projectId,projectId,area:'project',name,size:sourceFile.size||0,extension:sourceFile.extension||ext(name),sourceVersion:version,sharedVersion:true,source:{type:'group-copy',label:'项目群 · '+(source.groupName||'来源群'),groupId:source.groupId,groupName:source.groupName||'来源群',threadId:source.threadId||null,threadName:source.threadName||null,taskId},systemRelations,tags:clone(sourceFile.tags||[]),transferredBy:actorId,createdAt:now,updated_at:now,parent_id:0,type:'blob',creator:actorName(actorId),editor:'未编辑过',createdBy:actorName(actorId),updatedBy:actorName(actorId),description:'从项目群保存到项目文件管理的独立副本'};
        records.push(recordValue);notify();return id;
      }
    };
    return api;
  }

  function bootstrap(membership){
    const key='eva:file-store:v7',pinKey='eva:file-pins:v1';let saved,pinSeed=[],previewDemoInitialized=false,externalLinksDemoV1=false,externalFoldersDemoV1=false;
    try{const value=JSON.parse(root.localStorage.getItem(pinKey));if(value?.schema===1&&Array.isArray(value.pins))pinSeed=value.pins;}catch{}
    for(const version of [7,6,5,4,3]){
      if(saved)break;
      try{
        const value=JSON.parse(root.localStorage.getItem('eva:file-store:v'+version));
        if(value?.schema===version&&Array.isArray(value.records)){
          saved=value.records;
          previewDemoInitialized=version>=6;
          externalLinksDemoV1=value.externalLinksDemoV1===true;
          externalFoldersDemoV1=value.externalFoldersDemoV1===true;
        }
      }catch{}
    }
    if(!saved){
      saved=clone(DEFAULT_RECORDS);
      try{
        const legacy=JSON.parse(root.localStorage.getItem('eva:file-store:v2'));
        if(legacy?.schema===2&&Array.isArray(legacy.records)){
          const retained=legacy.records.filter(item=>item.area!=='shared'&&item.area!=='conversation');
          const byId=new Map(saved.map(item=>[item.id,item]));retained.forEach(item=>byId.set(item.id,item));saved=Array.from(byId.values());
        }
      }catch{}
      try{const legacy=JSON.parse(root.localStorage.getItem('eva:shared-files:v1'));if(Array.isArray(legacy))saved.push(...legacy.map(item=>({...item,spaceId:item.projectId,area:'project'})));}catch{}
    }
    saved=saved.filter(item=>item.area!=='shared'&&!String(item.spaceId||'').startsWith('shared:'));
    const savedIds=new Set(saved.map(item=>String(item.id)));pinSeed=normalizePins(pinSeed).filter(pin=>savedIds.has(pin.fileId));
    DEFAULT_RECORDS.filter(item=>!externalLinksDemoV1&&item.type==='external_link').forEach(item=>{if(!saved.some(savedItem=>savedItem.id===item.id))saved.push(clone(item));});
    DEFAULT_RECORDS.filter(item=>!externalFoldersDemoV1&&item.type==='external_link'&&item.external?.kind==='folder').forEach(item=>{if(!saved.some(savedItem=>savedItem.id===item.id))saved.push(clone(item));});
    const previewDemoIds=new Set(['personal-word-demo','personal-sheet-demo','personal-slides-demo']);
    const existingIds=new Set(saved.map(item=>item.id));
    DEFAULT_RECORDS.filter(item=>!previewDemoInitialized&&previewDemoIds.has(item.id)&&!existingIds.has(item.id)).forEach(item=>saved.push(clone(item)));
    const persistRecords=records=>{try{root.localStorage.setItem(key,JSON.stringify({schema:7,records,externalLinksDemoV1:true,externalFoldersDemoV1:true}));}catch{}};
    persistRecords(saved);
    const persistPins=pins=>{try{root.localStorage.setItem(pinKey,JSON.stringify({schema:1,pins}));}catch{}};
    persistPins(pinSeed);
    return create(membership,saved,persistRecords,DEFAULT_RECORDS,pinSeed,persistPins);
  }

  root.EvaFileSharing=Object.freeze({create,bootstrap,DEFAULT_RECORDS:clone(DEFAULT_RECORDS)});
})(window);
