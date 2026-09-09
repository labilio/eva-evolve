/* Eva My AI team: local demo data only; adapters never contact a live service. */
(function (window) {
  'use strict';
  // Octo Thread DTO adapter (octo-web c2e2aeed, datasource.threadCreate/threadUpdate).
  // Stable identity -> private two-member group; each conversation is a topic (type 5).
  // `sessions` remains the persisted legacy collection name, never an OpenClaw session.
  const privateGroup = identityId => ({
    id: 'ai-pair:u-wangyilin:' + identityId, chatType: 'group', channel_type: 2,
    identityId, ownerId: 'u-wangyilin', memberIds: ['u-wangyilin', identityId],
    members: 2, presentation: 'ai-direct', replyPolicy: 'direct-only'
  });
  const threadRecord = (identityId, record) => {
    const group = privateGroup(identityId);
    return {...record, group_no: group.id, short_id: record.id,
      channel_id: group.id + '____' + record.id, channel_type: 5};
  };
  const threadSource = ({identityId, name, appearance, records, selectedId, messages}) => {
    const group = privateGroup(identityId);
    const rows = records.length ? records : [{id: 'draft:' + identityId, title: '新对话', messages: []}];
    const threads = rows.map(record => {
      const dto = threadRecord(identityId, record);
      return {...dto, id: dto.channel_id, name: record.title, status: 1,
        member_count: 2, creator_uid: group.ownerId, created_at: record.updatedAt,
        updated_at: record.updatedAt};
    });
    const selected = threads.find(t => t.short_id === selectedId) || threads[0];
    return {sidebarVariant: 'ai-sessions', conversationOnly: true, presentation: 'ai-direct',
      selectedThreadId: selected.id, channels: [{...group, name, threads, unread: 0,
        sessionTitle: selected.name, identityName: name, identityAppearance: appearance,
        identityAvatarUrl: appearance.avatar || appearance.logo, conversationKind: 'ai-private-group'}],
      cats: [], messages: {}, threadMessages: Object.fromEntries(threads.map(t => [t.id, messages(t.short_id)])),
      scopeNameOf: {}};
  };
  window.EvaAIPrivateConversations = Object.freeze({group: privateGroup, threadRecord, source: threadSource});
  const STORAGE_KEY = 'eva:ai-team:v2';
  const copy = value => JSON.parse(JSON.stringify(value));
  function freeze(value) {
    if (value && typeof value === 'object' && !Object.isFrozen(value)) {
      Object.values(value).forEach(freeze);
      Object.freeze(value);
    }
    return value;
  }
  const configuration = value => ({
    creationCenter: value?.creationCenter || null,
    description: typeof value?.description === 'string' ? value.description : '',
    about: typeof value?.about === 'string' ? value.about : '',
    collaboration: typeof value?.collaboration === 'string' ? value.collaboration : '',
    model: typeof value?.model === 'string' ? value.model : 'Qwen3.7 Plus',
    toolset: typeof value?.toolset === 'string' ? value.toolset : '四两的产品脑袋',
    identity: typeof value?.identity === 'string' ? value.identity : '通用助理',
    personality: typeof value?.personality === 'string' ? value.personality : '清晰、友善',
    skills: Array.isArray(value?.skills) ? value.skills.filter(x => typeof x === 'string') : [],
    avatar: typeof value?.avatar === 'string' && /^(?:https:\/\/\S+|data:image\/(?:png|jpeg|webp|gif);base64,[A-Za-z0-9+/=]+)$/.test(value.avatar.trim()) ? value.avatar.trim() : ''
  });
  const makeIdentity = (id, role, name, local, time) => ({
    id, role, name, sourceAssistantId: local.id,
    status: role === 'persona' || local.online ? 'ready' : 'offline',
    configVersion: local.version, syncStatus: 'synced', lastSyncedAt: time,
    configuration: configuration(local.configuration)
  });
  function seed(time, options = {}) {
    const ownerName=options.ownerName||window.__EVA_MY_ASSISTANT_IDENTITY?.ownerName||'王宜林';
    const defaultName=options.profile==='review'?'通用助理':ownerName+'的通用助理';
    const defaultPersonaName=ownerName+'的 AI 分身';
    const localAssistants = [
      { id: 'assistant-general', name: defaultName, isDefault:true, version: 1, online: true, configuration: configuration({ identity: defaultName, skills: ['沟通', '文档整理'] }) },
      { id: 'assistant-rd', name: 'Eva研发助理', version: 1, online: true, configuration: configuration({ identity: 'Eva研发助理', skills: ['研发资料整理'] }) }
    ];
    const identities = [makeIdentity('ai-general', 'assistant', defaultName, localAssistants[0], time), makeIdentity('persona-initial', 'persona', defaultPersonaName, localAssistants[0], time)];
    const sessions = identities.map((identity, i) => ({
      id: i ? 'team-persona-welcome' : 'team-assistant-welcome', identityId: identity.id,
      title: i ? '团队沟通接待' : '整理工作安排', updatedAt: time,
      messages: [{ id: 'team-seed-' + i, kind: 'text', sender: { uid: identity.id, name: identity.name, color: '#1563EB', ai: true }, time,
        text: i ? '你好，我可以替你接收协作请求并跟进进展。' : '把需要整理的事项发给我，我们一起安排。' }]
    }));
    if(options.profile==='review') {
      identities.push(makeIdentity('ai-rd','assistant',localAssistants[1].name,localAssistants[1],time));
    } else {localAssistants.splice(1);identities.splice(1);sessions.splice(1);}
    return { schemaVersion: 1, localAssistants, identities, sessions, drafts: {}, storageWarning: null };
  }
  function valid(state) {
    const str = value => typeof value === 'string';
    const record = value => !!value && typeof value === 'object' && !Array.isArray(value);
    const config = value => record(value) && str(value.identity) && str(value.personality) && Array.isArray(value.skills) && value.skills.every(str);
    const sender = value => record(value) && str(value.uid) && str(value.name) && str(value.color) && typeof value.ai === 'boolean';
    const message = value => record(value) && str(value.time) && sender(value.sender) && (
      (value.kind === 'text' && str(value.text)) ||
      (value.kind === 'file' && record(value.file) && str(value.file.id) && str(value.file.name) && typeof value.file.size === 'number' && str(value.file.extension))
    );
    const unique = rows => new Set(rows.map(x => x.id)).size === rows.length;
    if (!record(state) || state.schemaVersion !== 1 || !Array.isArray(state.localAssistants) || !Array.isArray(state.identities) || !Array.isArray(state.sessions) || !record(state.drafts)) return false;
    if (!state.localAssistants.every(x => record(x) && str(x.id) && str(x.name) && Number.isInteger(x.version) && x.version > 0 && typeof x.online === 'boolean' && config(x.configuration))) return false;
    if (!state.identities.every(x => record(x) && str(x.id) && str(x.name) && ['assistant', 'persona'].includes(x.role) && ['ready', 'offline'].includes(x.status) && ['synced', 'syncing', 'waiting', 'error'].includes(x.syncStatus) && str(x.lastSyncedAt) && Number.isInteger(x.configVersion) && x.configVersion > 0 && config(x.configuration) && ((x.role === 'persona' && x.sourceAssistantId === null && x.syncStatus === 'synced') || state.localAssistants.some(l => l.id === x.sourceAssistantId && x.configVersion <= l.version)))) return false;
    if (!state.sessions.every(x => record(x) && str(x.id) && str(x.title) && str(x.updatedAt) && (x.pinned === undefined || typeof x.pinned === 'boolean') && state.identities.some(i => i.id === x.identityId) && Array.isArray(x.messages) && x.messages.every(message))) return false;
    return unique(state.localAssistants) && unique(state.identities) && unique(state.sessions) && Object.entries(state.drafts).every(([key, value]) => str(value) && (state.sessions.some(s => s.id === key) || state.identities.some(i => 'draft:' + i.id === key))) && new Set(state.identities.filter(i => i.role === 'assistant').map(i => i.sourceAssistantId)).size === state.identities.filter(i => i.role === 'assistant').length;
  }
  // Migrate only known generated copy; never rewrite user-authored messages.
  function normalizeProductCopy(state) {
    const replacements = new Map([
      ['【演示】这是独立的团队会话，不包含个人会话历史。', '把需要整理的事项发给我，我们一起安排。'],
      ['【演示】我负责团队沟通与请求转交；专业推理由关联的本地助理完成。', '你好，我可以替你接收协作请求并跟进进展。'],
      ['【演示回执】消息已保存在本机。本原型未连接 OpenClaw，也未执行真实任务。', '收到，我会协助你整理。'],
      ['【演示回执】已记录沟通请求，待关联本地助理处理。本原型未执行专业推理或真实转发。', '收到，我会跟进这项请求。'],
    ]);
    state.sessions.forEach(session => {
      if (session.id === 'team-assistant-welcome' && session.title === '团队协作演示') session.title = '整理工作安排';
      session.messages.forEach(message => {
        if (message.sender.ai && replacements.has(message.text)) message.text = replacements.get(message.text);
      });
    });
  }
  function createStore(options = {}) {
    const now = () => { const value = options.now ? options.now() : new Date(); return value instanceof Date ? value.toISOString() : String(value); };
    let storage, warning = null;
    try { storage = Object.prototype.hasOwnProperty.call(options, 'storage') ? options.storage : window.localStorage; } catch (_) { warning = '本地存储不可用，刷新后数据可能丢失。'; }
    let state = seed(now(), options);
    try {
      const saved = storage?.getItem(STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        // Older demo follow-ups omitted this presentation-only field.
        // Repair it before validation without replacing conversations or drafts.
        if (parsed?.schemaVersion === 1 && Array.isArray(parsed.sessions)) {
          parsed.sessions.forEach(session => {
            if (!Array.isArray(session?.messages)) return;
            session.messages.forEach(message => {
              if (message?.sender && typeof message.sender === 'object' && message.sender.color === undefined) message.sender.color = '#1563EB';
            });
          });
        }
        if (!valid(parsed)) throw new Error('Invalid demo state');
        state = parsed;
        normalizeProductCopy(state);
        state.sessions.forEach(session => { delete session.archived; });
        state.localAssistants.forEach(l => { l.configuration = configuration(l.configuration); });
        state.identities.forEach(i => {
          i.configuration = configuration(i.configuration);
          if (i.syncStatus === 'syncing') i.syncStatus = state.localAssistants.find(l => l.id === i.sourceAssistantId).online ? 'error' : 'waiting';
        });
      }
    } catch (_) { warning = '无法读取已保存的数据，已恢复初始内容。'; }
    // Keep one identity per owner, preserving every historical topic and draft.
    const personaName = () => (options.ownerName || window.__EVA_MY_ASSISTANT_IDENTITY?.ownerName || '王宜林') + '的 AI 分身';
    const personas = state.identities.filter(identity => identity.role === 'persona');
    const primary = personas.find(identity => identity.id === 'persona-initial') || personas[0];
    state.identityAliases ||= {};
    if (primary) {
      const ids = new Set(personas.map(identity => identity.id));
      const retired = personas.filter(identity => identity !== primary);
      if (retired.length) {
        state.legacyPersonaConfigurations ||= [];
        state.legacyPersonaConfigurations.push(...copy(retired));
      }
      for (const previous of retired) {
        state.identityAliases[previous.id] = primary.id;
        const key = 'draft:' + previous.id;
        if (state.drafts[key]) {
          let topicId = 'migrated-draft:' + previous.id;
          while (state.sessions.some(session => session.id === topicId)) topicId += ':saved';
          state.sessions.push({id:topicId,identityId:primary.id,title:'未发送草稿',updatedAt:now(),messages:[]});
          state.drafts[topicId] = state.drafts[key];
        }
        delete state.drafts[key];
      }
      state.sessions.forEach(session => {
        if (ids.has(session.identityId)) session.identityId = primary.id;
        session.messages.forEach(message => {
          if (ids.has(message.sender?.uid)) message.sender = {...message.sender,uid:primary.id,name:personaName()};
        });
      });
      primary.name = personaName();
      primary.configuration.avatar = '';
      state.identities = state.identities.filter(identity => identity.role !== 'persona' || identity === primary);
    }
    state.singleDefaultPersonaV1 = true;
    // 早期“我的 AI”页面隐藏了本地助理入口，导致已经保存的演示状态
    // 可能保留来源助理却没有可选的 AI 身份。恢复缺失身份与其首个会话，
    // 但绝不改写仍存在的身份、会话或草稿。
    if (!state.restoredLocalAssistantIdentitiesV1) {
      state.localAssistants.forEach(local => {
        if (state.identities.some(identity => identity.role === 'assistant' && identity.sourceAssistantId === local.id)) return;
        const preferredId = local.id === 'assistant-general' ? 'ai-general' : local.id === 'assistant-rd' ? 'ai-rd' : 'ai-local-' + local.id;
        let identityId = preferredId, suffix = 2;
        while (state.identities.some(identity => identity.id === identityId)) identityId = preferredId + '-' + suffix++;
        const identity = makeIdentity(identityId, 'assistant', local.name, local, now());
        state.identities.push(identity);
        state.sessions.push({
          id: identityId === 'ai-general' ? 'team-assistant-welcome' : 'team-assistant-' + local.id + '-welcome',
          identityId: identity.id,
          title: identityId === 'ai-general' ? '整理工作安排' : '开始新对话',
          updatedAt: now(),
          messages: [{id: 'restored-' + identity.id, kind: 'text', sender: {uid: identity.id, name: identity.name, color: '#1563EB', ai: true}, time: now(), text: identityId === 'ai-general' ? '把需要整理的事项发给我，我们一起安排。' : '你好，我可以协助你整理研发资料和评审要点。'}]
        });
      });
      state.restoredLocalAssistantIdentitiesV1 = true;
      try { storage?.setItem(STORAGE_KEY, JSON.stringify(state)); } catch (_) { warning = '本地存储不可用，刷新后数据可能丢失。'; }
    }
    // Add review stories once; preserve edited conversations, drafts and later deletions.
    if (options.profile === 'review' && !state.reviewStoriesVersion && window.__EVA_IM_DEMO?.aiTeamSessions) {
      const base = new Date(window.__EVA_DEMO_TIME.AI_REVIEW_START).getTime();
      window.__EVA_IM_DEMO.aiTeamSessions.forEach(story => {
        const identity = state.identities.find(i => i.id === story.identityId);
        if (!identity) return;
        const old = state.sessions.find(s => s.id === story.id);
        const placeholder = old && old.messages.length === 1 && ['team-seed-0','team-seed-1'].includes(old.messages[0].id);
        const messages = story.messages.map((message, index) => ({id: story.id + '-story-' + index, kind: 'text', text: message.text, time: new Date(base + message.minute * 60000).toISOString(), sender: {uid: message.ai ? identity.id : 'self', name: message.ai ? identity.name : '我', color: '#1563EB', ai: message.ai}}));
        const session = {id: old && !placeholder ? story.id + '-example' : story.id, identityId: identity.id, title: story.title, updatedAt: messages.at(-1).time, messages};
        if (placeholder) Object.assign(old, session); else if (!state.sessions.some(s => s.id === session.id)) state.sessions.push(session);
      });
      state.reviewStoriesVersion = 1;
      try { storage?.setItem(STORAGE_KEY, JSON.stringify(state)); } catch (_) { warning = '本地存储不可用，刷新后数据可能丢失。'; }
    }
    // Upgrade only exact shipped demo copy; preserve user edits, drafts and deleted sessions.
    if (options.profile === 'review' && !state.markdownDemoV1) {
      const upgrades = window.__EVA_IM_MARKDOWN_UPGRADES || {};
      state.sessions.forEach(session => session.messages.forEach(message => {
        if (message.sender?.ai && message.id?.includes('-story-') && Object.hasOwn(upgrades, message.text)) message.text = upgrades[message.text];
      }));
      state.markdownDemoV1 = true;
      try { storage?.setItem(STORAGE_KEY, JSON.stringify(state)); } catch (_) { warning = '本地存储不可用，刷新后数据可能丢失。'; }
    }
    if (options.profile === 'review' && !state.richFollowupsIMV4) {
      state.sessions.forEach(session => { const identity=state.identities.find(i=>i.id===session.identityId); if(identity?.role!=='persona') session.messages=session.messages.filter(m=>!/^rich-v2-/.test(m.id||'')); });
      (window.__EVA_IM_RICH_FOLLOWUPS || []).forEach(item => {
        const session = state.sessions.find(s => s.id === item.sessionId + '-example') || state.sessions.find(s => s.id === item.sessionId);
        if (!session || session.messages.some(m => m.id === item.id + '-ai')) return;
        const identity = state.identities.find(i => i.id === session.identityId);
        if (!identity || identity.role !== 'persona') return;
        const time = session.updatedAt;
        session.messages.push({id:item.id+'-self',kind:'text',time,text:item.question,sender:{uid:'self',name:'我',color:'#1563EB',ai:false}}, {id:item.id+'-ai',kind:'text',time,text:item.answer,sender:{uid:identity.id,name:identity.name,color:'#1563EB',ai:true}});
      });
      state.richFollowupsIMV4 = true;
      try { storage?.setItem(STORAGE_KEY, JSON.stringify(state)); } catch (_) { warning = '本地存储不可用，刷新后数据可能丢失。'; }
    }
    if(options.profile==='review'&&!state.compactPresentationV1){
      state.sessions.forEach(session=>{
        session.messages=session.messages.filter(m=>!/^rich-v2-|^rich-supply-private-/.test(m.id||''));
        session.messages.forEach(m=>{const map=window.__EVA_IM_COMPACT_COPY||{};if(m.sender?.ai&&m.id?.includes('-story-')&&Object.hasOwn(map,m.text))m.text=map[m.text];});
      });
      state.compactPresentationV1=true;
      try{storage?.setItem(STORAGE_KEY,JSON.stringify(state));}catch(_){}
    }
    if(options.profile==='review'&&!state.personaShortDemoV1){
      Object.entries(window.__EVA_PERSONA_SHORT_DEMO||{}).forEach(([id,texts])=>{
        const session=state.sessions.find(s=>s.id===id+'-example')||state.sessions.find(s=>s.id===id);
        if(!session)return;
        const identity=state.identities.find(i=>i.id===session.identityId);
        if(identity?.role!=='persona')return;
        const retained=session.messages.filter(m=>!String(m.id||'').startsWith(id+'-story-')&&!/^rich-v2-|^rich-supply-private-/.test(m.id||''));
        const base=new Date(window.__EVA_DEMO_TIME.AI_REVIEW_START).getTime();
        session.messages=texts.map((text,index)=>({id:id+'-story-'+index,kind:'text',text,time:new Date(base+(480+index)*60000).toISOString(),sender:{uid:index%2?identity.id:'self',name:index%2?identity.name:'我',color:'#1563EB',ai:!!(index%2)}})).concat(retained);
      });
      state.personaShortDemoV1=true;
      try{storage?.setItem(STORAGE_KEY,JSON.stringify(state));}catch(_){}
    }
    if(options.profile==='review'&&!state.personaVarietyV2){
      Object.entries(window.__EVA_PERSONA_VARIETY_DEMO||{}).forEach(([id,copy])=>{
        const session=state.sessions.find(s=>s.id===id+'-example')||state.sessions.find(s=>s.id===id);
        if(!session)return;
        const identity=state.identities.find(i=>i.id===session.identityId);
        if(identity?.role!=='persona')return;
        const old=window.__EVA_PERSONA_SHORT_DEMO?.[id];
        session.messages.forEach(m=>{const index=Number(String(m.id||'').replace(id+'-story-',''));if(old&&Number.isInteger(index)&&index>=0&&index<4&&m.id===id+'-story-'+index&&m.text===old[index])m.text=copy.texts[index];});
        if(session.title==='电脑关机后，供应风险继续跟进'||session.title==='夜间巡检，早上只看需要处理的事')session.title=copy.title;
      });
      state.personaVarietyV2=true;
      try{storage?.setItem(STORAGE_KEY,JSON.stringify(state));}catch(_){}
    }
    if(options.profile==='review'&&!state.fileArtifactDemoV1){
      const session=state.sessions.find(item=>item.id==='team-assistant-welcome-example')||state.sessions.find(item=>item.id==='team-assistant-welcome');
      const identity=state.identities.find(item=>item.id===session?.identityId);
      if(session&&identity&&!session.messages.some(message=>message.id==='ai-file-artifact-v1')){
        session.messages.push({
          id:'ai-file-artifact-v1',kind:'file',time:session.updatedAt,
          sender:{uid:identity.id,name:identity.name,color:'#1563EB',ai:true},
          file:{id:'artifact:ai-general:morning-brief-v1',name:'十分钟晨会提纲.docx',size:32768,extension:'docx',version:1}
        });
      }
      state.fileArtifactDemoV1=true;
      try{storage?.setItem(STORAGE_KEY,JSON.stringify(state));}catch(_){}
    }
    // Personal assistants automatically have an IM identity, separate from local chats.
    if (options.profile === 'review') {
      const general = state.localAssistants.find(item => item.id === 'assistant-general');
      if (general?.name === '王宜林的通用助理') general.name = '通用助理';
    }
    state.localAssistants.forEach(local => {
      let identity = state.identities.find(item => item.role === 'assistant' && item.sourceAssistantId === local.id);
      if (!identity) {
        identity = makeIdentity('ai-local:' + local.id, 'assistant', local.name, local, now());
        state.identities.push(identity);
      }
      identity.name = local.name;
    });
    // Add the Octo parent/topic relationship without changing local IDs or user content.
    state.sessions = state.sessions.map(record => ['persona', 'assistant'].includes(state.identities.find(i => i.id === record.identityId)?.role)
      ? threadRecord(record.identityId, record) : record);
    try { storage?.setItem(STORAGE_KEY, JSON.stringify(state)); } catch (_) { warning = '本地存储不可用，刷新后数据可能丢失。'; }
    state.storageWarning = warning;
    let snapshot = freeze(copy(state));
    const listeners = new Set(), connections = new Map(), syncTokens = new Map();
    let serial = 0;
    const id = prefix => { let value; do { value = prefix + '-' + (++serial); } while ([...state.localAssistants, ...state.identities, ...state.sessions].some(x => x.id === value)); return value; };
    function publish() {
      try { storage?.setItem(STORAGE_KEY, JSON.stringify(state)); } catch (_) { state.storageWarning = '本地存储不可用，刷新后数据可能丢失。'; }
      snapshot = freeze(copy(state));
      [...listeners].forEach(listener => listener());
    }
    const localById = key => { const local = state.localAssistants.find(l => l.id === key); if (!local) throw new Error('找不到本地助理'); return local; };
    const identityById = key => { const identity = state.identities.find(i => i.id === key); if (!identity) throw new Error('找不到 AI 身份'); return identity; };
    const simulate = (method, data) => Promise.resolve().then(() => options.adapter?.[method] ? options.adapter[method](freeze(copy(data))) : new Promise(resolve => setTimeout(resolve, options.delay ?? 350)));
    function connectAssistant(sourceId) {
      const existing = state.identities.find(i => i.role === 'assistant' && i.sourceAssistantId === sourceId);
      if (existing) return Promise.resolve(freeze(copy(existing)));
      if (connections.has(sourceId)) return connections.get(sourceId);
      let local;
      try { local = localById(sourceId); if (!local.online) throw new Error('本地助理离线'); } catch (error) { return Promise.reject(error); }
      const work = simulate('connect', local).then(() => {
        const current = localById(sourceId);
        if (!current.online) throw new Error('本地助理离线');
        const identity = makeIdentity(id('ai'), 'assistant', current.name, current, now());
        state.identities.push(identity); publish(); return freeze(copy(identity));
      }).finally(() => connections.delete(sourceId));
      connections.set(sourceId, work); return work;
    }
    async function createPersona(sourceId, input = {}) {
      if(state.identities.some(i=>i.role==='persona'))throw new Error('每人最多创建一个 AI 分身');
      if(input.name!==undefined&&input.name!==personaName())throw new Error('分身名称不可修改');
      if(input.configuration?.avatar)throw new Error('分身头像不可修改');
      const independent = sourceId == null;
      const local = independent ? {id:null,name:'独立',online:true,version:1,configuration:{}} : localById(sourceId);
      if (!local.online) throw new Error('本地助理离线');
      await simulate('createPersona', local);
      const current = independent ? local : localById(sourceId);
      if (!current.online) throw new Error('本地助理离线');
      if(state.identities.some(i=>i.role==='persona'))throw new Error('每人最多创建一个 AI 分身');
      const name = personaName();
      const identity = makeIdentity(id('persona'), 'persona', name, current, now());
      if(independent)identity.lastSyncedAt='';
      if(input.configuration)identity.configuration=configuration(input.configuration);
      identity.configuration.avatar='';
      state.identities.push(identity); publish(); return freeze(copy(identity));
    }
    function savePersona(input) {
      const identity=identityById(input.id);
      if(identity.role!=='persona')throw new Error('只能编辑分身');
      if(input.name!==undefined&&input.name!==personaName())throw new Error('分身名称不可修改');
      if(input.configuration?.avatar)throw new Error('分身头像不可修改');
      const nextSource=Object.prototype.hasOwnProperty.call(input,'sourceAssistantId')?input.sourceAssistantId:identity.sourceAssistantId;
      const changed=nextSource!==identity.sourceAssistantId;
      const local=nextSource===null?null:localById(nextSource);
      if(changed&&local&&!local.online)throw new Error('本地助理离线');
      identity.name=personaName();identity.configuration=configuration(input.configuration||identity.configuration);
      if(changed){identity.sourceAssistantId=nextSource;identity.configVersion=local?.version||1;identity.lastSyncedAt=local?now():'';if(local)identity.configuration=configuration(local.configuration);}

      identity.configuration.avatar='';
      syncTokens.set(identity.id,(syncTokens.get(identity.id)||0)+1);
      identity.syncStatus='synced';publish();return freeze(copy(identity));
    }
    async function syncPersona(identityId) {
      const identity = identityById(identityId);
      if (identity.role !== 'persona') throw new Error('只有分身需要同步');
      if(identity.sourceAssistantId===null)return freeze(copy(identity));
      const local = localById(identity.sourceAssistantId);
      const token = (syncTokens.get(identityId) || 0) + 1;
      syncTokens.set(identityId, token);
      if (!local.online) { identity.syncStatus = 'waiting'; publish(); return freeze(copy(identity)); }
      const version = local.version, config = configuration(local.configuration);
      identity.syncStatus = 'syncing'; publish();
      try {
        await simulate('sync', { identityId, sourceAssistantId: local.id, version, configuration: config });
        if (syncTokens.get(identityId) !== token) return freeze(copy(identity));
        if (!localById(local.id).online) { identity.syncStatus = 'waiting'; publish(); return freeze(copy(identity)); }
        identity.configVersion = version;
        // Clone appearance is fixed; source configuration never replaces the Eva logo.
        identity.configuration = configuration({...config, avatar: ''});
        identity.syncStatus = 'synced'; identity.lastSyncedAt = now(); publish();
      } catch (error) {
        if (syncTokens.get(identityId) === token) { identity.syncStatus = localById(local.id).online ? 'error' : 'waiting'; publish(); }
        throw error;
      }
      return freeze(copy(identity));
    }
    function saveLocalAssistant(input) {
      if (!input || !['edit', 'create'].includes(input.mode) || !input.name?.trim()) throw new Error('请填写助理名称');
      let local;
      if (input.mode === 'create') {
        local = { id: id('assistant-local'), name: input.name.trim(), version: 1, online: true, configuration: configuration(input.configuration || { identity: input.name.trim() }) };
        state.localAssistants.push(local);
        state.identities.push(makeIdentity('ai-local:' + local.id, 'assistant', local.name, local, now()));
      } else {
        local = localById(input.id);
        if(local.id==='assistant-general'&&input.name.trim()!==local.name)throw new Error('通用助理不可改名');
        local.name = input.name.trim(); local.version++;
        local.configuration = configuration({...local.configuration,...input.configuration});
        state.identities.filter(i => i.role === 'assistant' && i.sourceAssistantId === local.id).forEach(i => {
          i.name = local.name; i.configuration = configuration(local.configuration); i.configVersion = local.version; i.lastSyncedAt = now();
        });
      }
      publish();
      state.identities.filter(i => i.role === 'persona' && i.sourceAssistantId === local.id).forEach(i => { syncPersona(i.id).catch(() => {}); });
      return freeze(copy(local));
    }
    function setLocalOnline(sourceId, online) {
      if (typeof online !== 'boolean') throw new Error('无效在线状态');
      const local = localById(sourceId); local.online = online;
      state.identities.filter(i => i.sourceAssistantId === sourceId).forEach(i => {
        if (i.role === 'assistant') i.status = online ? 'ready' : 'offline';
        else if (!online && (i.syncStatus === 'syncing' || i.configVersion !== local.version)) {
          syncTokens.set(i.id, (syncTokens.get(i.id) || 0) + 1); i.syncStatus = 'waiting';
        }
      });
      publish();
      if (online) state.identities.filter(i => i.sourceAssistantId === sourceId && i.role === 'persona' && i.syncStatus === 'waiting').forEach(i => { syncPersona(i.id).catch(() => {}); });
    }
    function setDraft(key, text) {
      if (typeof key !== 'string' || typeof text !== 'string' || ['__proto__', 'constructor', 'prototype'].includes(key)) throw new Error('无效草稿');
      if (!state.sessions.some(s => s.id === key) && !state.identities.some(i => 'draft:' + i.id === key)) throw new Error('找不到草稿所属会话');
      if ((state.drafts[key] || '') === text) return;
      if (text) state.drafts[key] = text; else delete state.drafts[key];
      publish();
    }
    function setSessionFlag(sessionId, flag, value) {
      const session = state.sessions.find(s => s.id === sessionId);
      if (!session) throw new Error('找不到会话');
      if (flag !== 'pinned' || typeof value !== 'boolean') throw new Error('无效会话状态');
      session[flag] = value;
      publish();
    }
    function deleteSession(sessionId) {
      if (!state.sessions.some(s => s.id === sessionId)) throw new Error('找不到会话');
      state.sessions = state.sessions.filter(s => s.id !== sessionId);
      delete state.drafts[sessionId];
      publish();
    }
    function createThread(identityId) {
      const identity = identityById(identityId);
      if (!['persona', 'assistant'].includes(identity.role)) throw new Error('请选择云端分身或个人助理');
      const records = state.sessions.filter(s => s.identityId === identityId);
      let title = '新对话', number = 2;
      while (records.some(s => s.title === title)) title = '新对话 ' + number++;
      const base = {id: id((identity.role === 'persona' ? 'team-thread-' : 'team-session-') + (window.crypto?.randomUUID?.() || Date.now())), identityId, title,
        autoTitle: true, messages: [], updatedAt: now()};
      // 云端分身使用团队私聊中的 topic 记录；本地助理保留自己的本地会话记录。
      const record = identity.role === 'persona' ? threadRecord(identityId, base) : base;
      state.sessions.push(record);
      publish();
      return record.id;
    }
    function renameThread(identityId, threadId, name) {
      const record = state.sessions.find(s => s.id === threadId && s.identityId === identityId);
      if (!record) throw new Error('会话已删除或不属于当前 AI');
      const title = String(name || '').trim();
      if (!title || Array.from(title).length > 50) throw new Error('请输入 1–100 个字符的会话名称');
      record.title = title; record.autoTitle = false; publish();
    }
    function sendMessage(identityId, sessionId, text) {
      if (typeof text !== 'string' || !text.trim()) return null;
      const identity = identityById(identityId);
      if (identity.status === 'offline') throw new Error('本地助理离线，请连接后重试');
      let session = sessionId ? state.sessions.find(s => s.id === sessionId && s.identityId === identityId) : null;
      if (sessionId && !session) throw new Error('会话不属于当前 AI 身份');
      const time = now(), body = text.trim();
      if (!session) {
        session = {id: id(identity.role === 'persona' ? 'team-thread' : 'team-session'), identityId,
          title: Array.from(body).slice(0, 20).join(''), messages: [], updatedAt: time};
        session = threadRecord(identityId, session);
        state.sessions.push(session);
      }
      if (session.autoTitle) {session.title = Array.from(body).slice(0, 20).join(''); session.autoTitle = false;}
      const base = session.id + '-' + session.messages.length;
      session.messages.push({ id: base + '-self', kind: 'text', sender: { uid: 'self', name: '我', color: '#1563EB', ai: false }, time, text: body });
      session.messages.push({ id: base + '-receipt', kind: 'text', sender: { uid: identity.id, name: identity.name, color: '#1563EB', ai: true }, time, text: identity.role === 'persona' ? '收到，我会跟进这项请求。' : '收到，我会协助你整理。' });
      session.updatedAt = time;
      delete state.drafts[sessionId || 'draft:' + identityId]; publish(); return session.id;
    }
    return Object.freeze({ getSnapshot: () => snapshot, subscribe: listener => { listeners.add(listener); return () => listeners.delete(listener); }, connectAssistant, createPersona, personaName, syncPersona, savePersona, saveLocalAssistant, setLocalOnline, setDraft, createThread, renameThread, sendMessage, setSessionFlag, deleteSession });
  }
  // “我的 AI”中的默认群“我的 OPT”动态包含所有 AI；自定义团队保存创建时的成员快照。
  function createTeamGroupStore(options = {}) {
    const id = 'my-ai-team:u-wangyilin', key = 'eva:my-ai-groups:v2';
    const blankGroup = (record = {}) => ({id:record.id || id, name:record.system === false ? record.name || 'AI 团队' : '我的 OPT', avatar:record.avatar || '', system:record.system !== false,
      memberIds:record.system === false ? [...new Set((record.memberIds || []).filter(Boolean))] : null,
      messages:Array.isArray(record.messages) ? record.messages : [], draft:typeof record.draft === 'string' ? record.draft : '',
      threads:Array.isArray(record.threads) ? record.threads : [], collaborationStoriesV1:!!record.collaborationStoriesV1,
      createdAt:record.createdAt || new Date().toISOString(), updatedAt:record.updatedAt || record.createdAt || new Date().toISOString()});
    let storage, state = {schemaVersion:2, groups:[blankGroup()]}, revision = 0, serial = 0;
    const listeners = new Set();
    try {
      storage = Object.hasOwn(options, 'storage') ? options.storage : window.localStorage;
      const saved = JSON.parse(storage?.getItem(key) || storage?.getItem('eva:my-ai-team-group:v1') || 'null');
      if (saved?.schemaVersion === 2 && Array.isArray(saved.groups) && saved.groups.length) {
        const groups=saved.groups.filter(group=>group&&typeof group.id==='string'&&typeof group.name==='string').map(blankGroup);
        if(groups.length)state={schemaVersion:2,groups};
      } else if (saved && Array.isArray(saved.messages) && typeof saved.draft === 'string') {
        state={schemaVersion:2,groups:[blankGroup(saved)]};
      }
    } catch (_) {}
    if(!state.groups.some(group=>group.id===id))state.groups.unshift(blankGroup());
    const groupById = groupId => {
      const group=state.groups.find(item=>item.id===(groupId||id));
      if(!group)throw new Error('AI 团队不存在');
      return group;
    };
    const target = (groupId, channelId) => {
      const group=groupById(groupId);
      if (!channelId || channelId === group.id) return group;
      const thread = group.threads.find(item => item.id === channelId && !item.deleted);
      if (!thread) throw new Error('子区不存在');
      return thread;
    };
    function publish() {
      try { storage?.setItem(key, JSON.stringify(state)); } catch (_) {}
      revision++; listeners.forEach(fn => fn());
    }
    const canonicalIdentity=id=>window.EvaAITeam?.getSnapshot().identityAliases?.[id]||id;
    const memberIds=group=>group.memberIds&&[...new Set(group.memberIds.map(canonicalIdentity))];
    const publicGroup=group=>freeze(copy({id:group.id,name:group.name,avatar:group.avatar,system:group.system,memberIds:memberIds(group),createdAt:group.createdAt,updatedAt:group.updatedAt}));
    const normalizeMembers=members=>[...new Map((members||[]).filter(member=>member?.id).map(member=>[member.id,member])).values()];
    const argsForSource=(groupOrMembers,membersOrThread,threadMaybe)=>Array.isArray(groupOrMembers)
      ? {groupId:id,members:groupOrMembers,selectedThreadId:membersOrThread}
      : {groupId:groupOrMembers||id,members:membersOrThread||[],selectedThreadId:threadMaybe};
    const argsForThread=(groupOrRecord,recordMaybe)=>recordMaybe===undefined?{groupId:id,record:groupOrRecord}:{groupId:groupOrRecord||id,record:recordMaybe};
    return Object.freeze({
      id, getSnapshot: () => revision,
      subscribe(fn) { listeners.add(fn); return () => listeners.delete(fn); },
      groups() { return state.groups.map(publicGroup); },
      get(groupId) { return publicGroup(groupById(groupId)); },
      createGroup(record) {
        const name=String(record?.name||'').trim(),memberIds=[...new Set((record?.memberIds||[]).filter(Boolean))];
        if(!name||name.length>50)throw new Error('请输入 1–50 个字符的团队名称');
        if(!memberIds.length)throw new Error('至少选择 1 个 AI 成员');
        let groupId;do{groupId='my-ai-group:'+Date.now().toString(36)+'-'+(++serial);}while(state.groups.some(group=>group.id===groupId));
        const group=blankGroup({id:groupId,name,avatar:String(record?.avatar||'').trim(),system:false,memberIds});
        state.groups.push(group);publish();return groupId;
      },
      updateGroup(groupId, patch) {
        const group=groupById(groupId);if(group.system)throw new Error('默认团队不可编辑');
        if(patch.name!==undefined){const name=String(patch.name||'').trim();if(!name||name.length>50)throw new Error('请输入 1–50 个字符的团队名称');group.name=name;}
        if(patch.avatar!==undefined)group.avatar=String(patch.avatar||'').trim();
        if(patch.memberIds!==undefined){const ids=[...new Set((patch.memberIds||[]).filter(Boolean))];if(!ids.length)throw new Error('至少选择 1 个 AI 成员');group.memberIds=ids;}
        group.updatedAt=new Date().toISOString();publish();
      },
      removeGroup(groupId) { const group=groupById(groupId);if(group.system)throw new Error('默认团队不可删除');state.groups=state.groups.filter(item=>item.id!==groupId);publish(); },
      createThread(groupOrRecord, recordMaybe) {
        const {groupId,record}=argsForThread(groupOrRecord,recordMaybe),group=groupById(groupId);
        const name = String(record.name || '').trim();
        if (!name || name.length > 100) throw new Error('请输入 1–100 个字符的子区名称');
        const shortId = record.short_id || record.id || 'thread-' + Date.now().toString(36);
        const channelId = group.id + '____' + shortId;
        if (group.threads.some(item => item.id === channelId)) throw new Error('子区已存在');
        group.threads.push({...record, id:channelId, short_id:shortId, group_no:group.id, channel_id:channelId,
          channel_type:5, name, status:1, created_at:new Date().toISOString(), updated_at:new Date().toISOString(), messages:[], draft:''});
        group.updatedAt=new Date().toISOString();publish(); return channelId;
      },
      updateThread(groupOrChannelId, channelOrPatch, patchMaybe) {
        const groupId=patchMaybe===undefined?id:groupOrChannelId,channelId=patchMaybe===undefined?groupOrChannelId:channelOrPatch,patch=patchMaybe===undefined?channelOrPatch:patchMaybe;
        const group=groupById(groupId),thread=target(group.id,channelId);
        if (thread === group) throw new Error('请选择子区');
        if (patch.name !== undefined) {
          const name = String(patch.name).trim();
          if (!name || name.length > 100) throw new Error('请输入 1–100 个字符的子区名称');
          thread.name = name;
        }
        for (const field of ['status','deleted','joined','is_joined','member_count']) if (patch[field] !== undefined) thread[field] = patch[field];
        thread.updated_at = new Date().toISOString();group.updatedAt=thread.updated_at;publish();
      },
      source(groupOrMembers, membersOrThread, threadMaybe) {
        const {groupId,members,selectedThreadId}=argsForSource(groupOrMembers,membersOrThread,threadMaybe),group=groupById(groupId),all=normalizeMembers(members);
        const owner=all.find(member=>member.kind==='human'||member.id==='u-wangyilin');
        const ai=all.filter(member=>member.kind!=='human'&&member.id!=='u-wangyilin');
        const unique=group.system?[...(owner?[owner]:[]),...ai]:[...(owner?[owner]:[]),...memberIds(group).map(memberId=>ai.find(member=>member.id===memberId)).filter(Boolean)];
        if(group.system&&!group.collaborationStoriesV1&&ai.length&&window.__EVA_MY_AI_GROUP_STORIES){
          const human={uid:'u-wangyilin',name:'王宜林',avatar:window.__EVA_CURRENT_USER_PORTRAIT};
          window.__EVA_MY_AI_GROUP_STORIES.forEach((story,index)=>{
            const member=ai[index%ai.length],sender={uid:member.id,name:member.name,ai:true,identityAppearance:member.identityAppearance},channelId=group.id+'____demo-'+story.id;
            const messages=[{id:channelId+':1',kind:'text',sender:human,time:'09:00',text:'@'+member.name+' '+story.request},{id:channelId+':2',kind:'text',sender,time:'09:01',text:story.reply},{id:channelId+':3',kind:'text',sender:human,time:'09:03',text:'@'+member.name+' '+story.follow},{id:channelId+':4',kind:'text',sender,time:'09:04',text:'已整理为 **'+story.file+'**，请下载补充并确认。'},{id:channelId+':5',kind:'file',sender,time:'09:04',file:{name:story.file,size:new TextEncoder().encode(story.content).length,extension:story.file.split('.').pop()}}];
            if(!group.threads.some(t=>t.id===channelId))group.threads.push({id:channelId,short_id:'demo-'+story.id,group_no:group.id,channel_id:channelId,channel_type:5,name:story.name,status:1,created_at:window.__EVA_DEMO_TIME.AI_REVIEW_START,updated_at:window.__EVA_DEMO_TIME.AI_REVIEW_START,messages,draft:''});
          });
          const member=ai[0];group.messages.unshift({id:group.id+':demo-start',kind:'text',sender:human,time:'08:55',text:'今天围绕供应链运营协同推进三件事：保供晨会、供应商整改、合同评审。各项材料放到对应子区。\n@'+member.name+' 请帮我整理协作安排。'},{id:group.id+':demo-plan',kind:'text',sender:{uid:member.id,name:member.name,ai:true,identityAppearance:member.identityAppearance},time:'08:56',text:'## 今日协作安排\n\n- **保供晨会**：风险排序和行动清单。\n- **供应商整改**：核对证据，保留待确认项。\n- **合同评审**：整理条款差异与人工决策事项。\n\n各子区已准备讨论材料和文件示例，业务结论由你确认。'});
          group.collaborationStoriesV1=true;try{storage?.setItem(key,JSON.stringify(state));}catch(_){}
        }
        // Convert text mentions to the shared IM identity contract, including saved demo history.
        const mentionCandidates=[{uid:'all',name:'@所有人'},{uid:'all',name:'@全体成员'},...unique.map(member=>({uid:member.id,name:'@'+member.name}))];
        const historicalNames=new Map();
        for(const message of [group,...group.threads].flatMap(item=>item.messages||[])){
          const sender=message.sender,current=sender&&all.find(m=>m.id===canonicalIdentity(sender.uid));
          if(current&&sender.name!==current.name)historicalNames.set('@'+sender.name,'@'+current.name);
        }
        const renderMessages=messages=>copy(messages).map(message=>{
          const sender=message.sender,current=sender&&all.find(m=>m.id===canonicalIdentity(sender.uid));
          if(current)message.sender={...sender,uid:current.id,name:current.name,identityAppearance:current.identityAppearance};
          for(const [old,name] of historicalNames)if(message.text)message.text=message.text.split(old).join(name);
          if(message.mentions)message.mentions=message.mentions.map(mention=>{const current=all.find(m=>m.id===canonicalIdentity(mention.uid));return current?{...mention,uid:current.id,name:'@'+current.name}:mention;});
          return message;
        }).map(message=>({...message,mentions:[...(message.mentions||[]),...mentionCandidates.filter(candidate=>message.text?.includes(candidate.name)&&!message.mentions?.some(item=>item.uid===candidate.uid&&item.name===candidate.name))]}));
        const channel = {id:group.id, name:group.name, identityAvatarUrl:group.avatar||undefined, chatType:'group', channel_type:2,
          ownerId:'u-wangyilin', memberIds:unique.map(member=>member.id), members:unique.length, fixedMembers:unique,
          threads:group.threads.filter(item=>!item.deleted).map(({messages,draft,...thread})=>({...thread,created_at:thread.created_at||window.__EVA_DEMO_TIME.AI_REVIEW_START,updated_at:thread.updated_at||thread.created_at||window.__EVA_DEMO_TIME.AI_REVIEW_START,member_count:unique.length,message_count:messages.length,last_message_content:messages.at(-1)?.text,last_message_sender_name:messages.at(-1)?.sender?.name})), unread:0, replyPolicy:'mention-only'};
        return {conversationOnly:true, sidebarVariant:'ai-team-group', selectedThreadId, channels:[channel], cats:[],
          messages:{[group.id]:renderMessages(group.messages)},threadMessages:Object.fromEntries(group.threads.filter(item=>!item.deleted).map(item=>[item.id,renderMessages(item.messages)])),scopeNameOf:{},
          initialDraft:target(group.id,selectedThreadId).draft,
          getDraft:channelId=>target(group.id,channelId).draft,
          onDraftChange(text,channelId){const current=target(group.id,channelId||selectedThreadId);if(current.draft!==text){current.draft=text;publish();}},
          onSend(text,channelId){const current=target(group.id,channelId||selectedThreadId);if(!text.trim())return false;
            const time=new Date().toLocaleTimeString('zh-CN',{hour:'2-digit',minute:'2-digit'}),messageId='team-group:'+Date.now()+':'+current.messages.length;
            current.messages.push({id:messageId,kind:'text',sender:{uid:'u-wangyilin',name:'王宜林',avatar:window.__EVA_CURRENT_USER_PORTRAIT},time,text});
            unique.filter(member=>member.kind!=='human'&&(text.includes('@'+member.name+' ')||text.endsWith('@'+member.name))).forEach(member=>current.messages.push({id:messageId+':'+member.id,kind:'text',sender:{uid:member.id,name:member.name,ai:true,identityAppearance:member.identityAppearance},time,text:'【原型】已收到你的请求，当前未调用真实服务。'}));
            current.draft='';current.updated_at=new Date().toISOString();group.updatedAt=current.updated_at;publish();return true;}
        };
      }
    });
  }
  window.EvaMyAITeamGroup = Object.freeze({...createTeamGroupStore(), createStore:createTeamGroupStore});
  window.EvaAITeam = Object.freeze({ ...createStore({profile:'review'}), createStore });
})(window);
