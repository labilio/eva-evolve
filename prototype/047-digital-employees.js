(function(root){
'use strict';
let Component;
root.EvaDigitalEmployeesUI={render(props,deps){Component||=create(deps);return deps.React.createElement(Component,props);}};
function create({React:R,Button,Input,TextArea,Select,Checkbox,Switch,Modal,Table,Tag,Toast,ChannelsView,icons,members,navigatePersonal}){
const h=R.createElement, data=root.__EVA_DIGITAL_EMPLOYEES_DATA,store=root.EvaDigitalEmployeesStore;
const tabs={basic:'基本信息',persona:'人设与提示词',skills:'技能',conn:'连接与 MCP',mem:'记忆',perm:'权限与可见性',pub:'发布去处',dify:'Dify 连接',domain:'网关接入'};
const difyModes={'advanced-chat':['Chatflow','POST /chat-messages','对话型工作流，多轮'],agent:['Agent','POST /chat-messages','自主规划 + 工具调用'],chat:['Chatbot','POST /chat-messages','基础对话应用'],'agent-chat':['Legacy Agent','POST /chat-messages','旧版 Agent'],workflow:['Workflow','POST /workflows/run','一次性执行，无会话'],completion:['Text Generator','POST /completion-messages','单轮补全']};
const btn=(label,onClick,extra={})=>h(Button,{onClick,...extra},label);
const identity=(a,showNo=true)=>h('span',{className:'eva-digital-center__identity'},root.EvaAIIdentity.avatar(store.appearance(a),32,h),h('span',null,h('span',{className:'eva-identity-name-row'},h('strong',{className:'eva-identity-name-text',title:a.name},a.name),root.EvaAIIdentity.badge(h)),showNo&&a.no&&h('small',null,a.no)));
function Field({label,content,hint}){
  const id=R.useId(),labelId=id+'-label',hintId=hint?id+'-hint':undefined;
  const control=R.isValidElement(content)&&[Input,TextArea,Select,Switch].includes(content.type);
  return h('div',{className:'eva-digital-center__field'},h('label',{id:labelId,htmlFor:control?id:undefined},label),control?R.cloneElement(content,{id,'aria-label':label,'aria-labelledby':labelId,'aria-describedby':hintId}):h('div',{role:'group','aria-labelledby':labelId,'aria-describedby':hintId},content),hint&&h('small',{id:hintId,className:'eva-digital-center__muted'},hint));
}
const field=(label,content,hint)=>h(Field,{label,content,hint});
const defaults=()=>({name:'',one:'',description:'',target:'prod',role:'记录员',skills:data.skills.slice(0,3).map(a=>a.name),conn:data.connections.slice(0,2).map(a=>a.id),formats:['卡片化','表格优先','中文'],memory:'项目记忆',memoryParts:['我负责的项目进展','我发过的结论'],retention:'永久保留',visibility:'只有我',permissions:['读取资料','起草内容'],audit:'记录全部调用与产出（推荐）',publisher:'吉利团队',creatorName:'王宜林',department:'数智化中心 / AI 中台 / Agent 应用组',version:'v1.0.0',releaseNote:'首次创建并发布数字员工。',publication:'mine',directory:'是，作为 AI 同事出现在所属部门下',difyEndpoint:'https://dify.geely.internal/v1',response:'streaming',timeout:'30 秒超时，失败重试 1 次',auth:'appKey + JWT Key（GBOP 标准）',capabilities:['缺陷归因分析','质量数据查询'],egress:'仅本项目数据（推荐）',tier:'small'});
return function DigitalCenter({view='market',navigate,employeeId,initialType,returnTo}){
R.useSyncExternalStore(store.subscribe,store.getSnapshot);R.useSyncExternalStore(members.subscribe,members.getSnapshot);
const ms=members.snapshot(),actor=ms.actorId;
const [query,setQuery]=R.useState(''),[domain,setDomain]=R.useState(null),[type,setType]=R.useState(null),[tab,setTab]=R.useState('basic'),[draft,setDraft]=R.useState(defaults),[picker,setPicker]=R.useState({}),[dialog,setDialog]=R.useState(null),[chosen,setChosen]=R.useState([]),[projectQuery,setProjectQuery]=R.useState(''),[error,setError]=R.useState('');
const host=R.useRef(null);const popup=()=>host.current;
R.useEffect(()=>{setDialog(null);setChosen([]);setProjectQuery('');setError('');},[view,actor,employeeId]);
const update=(key,value)=>{setDraft(d=>({...d,[key]:value}));setError('');};
const run=fn=>{try{fn();setError('');}catch(e){setError(e.message);}};
const open=(kind,a)=>{setDialog({kind,a});setChosen([]);setProjectQuery('');setError('');};
const allProjects=Object.values(ms.projects).filter(p=>members.canRead(p.id,actor));
const projectName=p=>p.name|| (p.id==='prod'?'供应链运营协同':p.id);
const select=(key,options,extra={})=>h(Select,{...extra,value:draft[key]||undefined,onChange:v=>update(key,v),optionList:options.map(o=>typeof o==='string'?{value:o,label:o}:o),getPopupContainer:popup});
const input=(key,placeholder,more={})=>h(Input,{value:draft[key]||'',onChange:v=>update(key,v),placeholder,...more});
const textarea=(key,placeholder)=>h(TextArea,{value:draft[key]||'',onChange:v=>update(key,v),placeholder,autosize:{minRows:3,maxRows:12}});
const checks=(key,items)=>h('div',{className:'eva-digital-center__filters'},items.map(value=>h(Checkbox,{key:value,checked:(draft[key]||[]).includes(value),onChange:e=>update(key,e.target.checked?[...(draft[key]||[]),value]:(draft[key]||[]).filter(x=>x!==value))},value)));
function start(rt){setType(rt.key);setTab(rt.cfg[0]);setDraft({...defaults(),...store.draft(rt.key)});setPicker({});setError('');}
// “我的 Agent”入口直接打开既有个人助理创建表单。
R.useEffect(()=>{
  if(view==='create'&&initialType==='mine') start(data.runtimes.find(item=>item.key==='mine'));
  else if(view==='create') setType(null);
},[view,initialType]);
function save(){run(()=>{
  if(!draft.name.trim())throw new Error('请填写名称');
  if(type==='dify'&&!draft.difyApp)throw new Error('请先识别 Dify 应用');
  if(type==='cloud'&&!draft.serviceId?.trim())throw new Error('请填写云端服务标识 / 应用编码');
  if(type==='team'&&!members.canRead(draft.target,actor))throw new Error('请选择已加入的项目');
  if(type==='persona'){
    store.submitPersonaRequest(actor,draft);setType(null);Toast.success('申请已提交，等待 IT 审核（原型模拟）');return;
  }
  if(type==='mine'){
    const a=root.EvaAITeam.saveLocalAssistant({mode:'create',name:draft.name,configuration:{...draft,creationCenter:structuredClone(draft),identity:draft.identity||'',personality:draft.personality||'',about:draft.about||'',description:'',skills:draft.skills}});
    store.saveDraft(type,defaults());setType(null);returnTo?navigate(returnTo):navigatePersonal(a.id,navigate);Toast.success(returnTo?'已创建，可在我的 Agent 中发起私聊':'已创建，已放入个人 Eva 同学');return;
  }
  const a=store.create(type,draft);
  if(type==='team'){try{members.addEmployee(draft.target,actor,a.id);}catch(e){store.discardCreated(a.id);throw e;}}
  setType(null);setDomain(null);setQuery('');
  if(type==='team'){navigate('/collab');Toast.success('已放进「'+projectName(ms.projects[draft.target])+'」，角色是'+a.role);}else{navigate('/eva-stub/数字员工');Toast.success('已接入，可在数字员工市场查看');}
});}
function resourcePicker(key){
  const pool=key==='skills'?data.skills:data.connections, idOf=a=>key==='skills'?a.name:a.id,p=picker[key]||{},ids=draft[key]||[],q=(p.q||'').toLowerCase();
  const patch=value=>setPicker(prev=>({...prev,[key]:{...prev[key],...value}}));
  const domains=[...new Set(pool.map(a=>a.domain).filter(Boolean))].sort((a,b)=>pool.filter(x=>x.domain===b).length-pool.filter(x=>x.domain===a).length);
  const list=pool.filter(a=>(!p.domain||a.domain===p.domain)&&(!p.only||ids.includes(idOf(a)))&&(!q||[a.name,a.desc,...a.tags||[]].some(v=>String(v||'').toLowerCase().includes(q))));
  return h(R.Fragment,null,h('h3',null,tabs[key]+' · 已选 '+ids.length+' / '+pool.length),h('p',null,key==='skills'?'从技能库存中挑选，装上它才会用。':'选择它能访问的系统，用谁的账号就由谁授权。'),h(Input,{value:p.q||'',placeholder:key==='skills'?'搜技能名、标签':'搜系统名',onChange:q=>patch({q}),prefix:h(icons.Search,{size:16})}),h('div',{className:'eva-digital-center__filters'},btn('只看已选 '+ids.length,()=>patch({only:!p.only}),{theme:p.only?'light':'borderless'}),btn('全部 '+pool.length,()=>patch({domain:null}),{theme:!p.domain?'light':'borderless'}),domains.map(d=>btn(d+' '+pool.filter(a=>a.domain===d).length,()=>patch({domain:d}),{key:d,theme:p.domain===d?'light':'borderless'}))),h('div',{className:'eva-digital-center__cards'},list.map(a=>h('article',{key:idOf(a),className:'eva-digital-center__card'+(ids.includes(idOf(a))?' is-selected':'')},h(Checkbox,{checked:ids.includes(idOf(a)),onChange:e=>update(key,e.target.checked?[...ids,idOf(a)]:ids.filter(v=>v!==idOf(a)))},a.name),h('small',null,key==='skills'?[a.grade,a.ver,a.pts&&a.pts+' 分'].filter(Boolean).join(' · '):[a.auth,a.kind==='personal'?'我的账号':a.kind==='org'?'组织账号':'MCP'].join(' · ')),h('p',null,a.desc),h('small',null,key==='skills'?(a.tags||[]).join(' · '):(a.mcp||'')+' · '+(a.tools||[]).length+' 个工具'),btn('看内容',()=>open(key,a),{theme:'borderless'})))),!list.length&&h('p',null,p.only?'还没选任何一个':'没找到'),key==='conn'&&field('额外的 MCP Server',input('extraMcp','https://… 或 stdio 命令'),'按 MCP 协议接入的工具'));
}
function configPane(){
  if(type==='persona'&&tab==='basic')return h(R.Fragment,null,
    h('p',null,'填写分身信息并配置能力，提交后由 IT 审核与开通云端资源。'),
    field('分身名称',input('name','例如：采购协作分身')),
    field('业务域',select('domain',data.businessDomains,{placeholder:'请选择业务域',filter:true,showClear:true,'aria-label':'业务域'})),
    field('一句话定位',input('one','说明分身负责的沟通与工作交接')),
    field('详细介绍',textarea('description','它能处理什么、不能处理什么、需要什么输入')),
    h('p',null,'审核通过并完成资源开通后可使用；业务决定与结果确认由本人负责。'));

  if(type==='mine'&&tab==='basic')return h(R.Fragment,null,
    field('名字',input('name','例如：合规审查助理')),
    field('头像',h('div',{className:'eva-digital-center__actions'},root.EvaAIIdentity.avatar(store.appearance({name:draft.name,ownership:'personal'}),40,h),h('span',null,'Eva 默认机器人头像'))));
  if(type==='mine'&&tab==='persona')return h(R.Fragment,null,
    field('助理身份',textarea('identity','定义助理是谁，包括角色定位和能力范围。')),
    field('助理性格',textarea('personality','描述表达方式、判断风格和协作习惯。')),
    field('关于你',textarea('about','补充需要了解的个人背景与偏好。')));
  if(tab==='skills'||tab==='conn')return resourcePicker(tab);
  if(tab==='basic')return h(R.Fragment,null,field('名字',input('name','例如：合规审查助理')),field('头像',h('div',{className:'eva-digital-center__actions'},root.EvaAIIdentity.avatar(store.appearance({name:draft.name,ownership:type==='mine'?'personal':'organization'}),40,h),h('span',null,'Eva 默认机器人头像'))),field('一句话定位',input('one','合同条款风险识别与合规意见'),'会显示在身份列表和 @ 列表里，写清楚它是干嘛的'),field('详细介绍',textarea('description','它能处理什么、不能处理什么、需要什么输入')),field('归属',select('owner',[{value:'self',label:'我本人'},...allProjects.map(p=>({value:p.id,label:projectName(p)}))])),field('业务域',input('domain','数智化')),field('类型',select('tier',Object.entries(data.tiers).map(([value,v])=>({value,label:v.n})))));
  if(tab==='persona')return h(R.Fragment,null,field('系统提示词',textarea('prompt','你是……\n工作方式：……\n输出要求：表格化、说中文、给出处'),'这段决定它的说话方式和判断标准'),field('输出格式偏好',checks('formats',['卡片化','表格优先','中文','给出处','先结论后过程'])),field('不许做的事',textarea('prohibitions','不许编造数据；拿不准要说不知道；不许把内部数据发到项目外')));
  if(tab==='mem')return h(R.Fragment,null,field('记忆范围',select('memory',['项目记忆','个人记忆','不留记忆'])),field('从我这儿切多少给它',checks('memoryParts',['我负责的项目进展','我发过的结论','我的日程','我的邮件','我的本机文件']),'没勾的它看不到'),field('遗忘策略',select('retention',['永久保留','90 天后归档','项目结束即清空'])));
  if(tab==='perm')return h(R.Fragment,null,field('谁能 @ 它',select('visibility',['只有我','项目成员','全公司'])),field('它能替我做什么',checks('permissions',['读取资料','起草内容','建任务派活','发消息到群','发邮件','调用外部系统写入']),'涉及对外发送的动作，默认需要本人确认'),field('审计',select('audit',['记录全部调用与产出（推荐）','只记录写操作'])));
  if(tab==='pub')return h(R.Fragment,null,
    h('p',null,'发布信息会显示在数字员工资料卡中，并作为后续版本与追溯记录的起点。'),
    field('发布主体',input('publisher','例如：吉利团队')),
    field('业务负责人',input('creatorName','例如：王宜林')),
    field('负责部门',input('department','例如：数智化中心 / AI 中台 / Agent 应用组')),
    field('版本号',input('version','例如：v1.0.0')),
    field('版本说明',textarea('releaseNote','说明这次发布包含的身份、提示词、技能或工具配置')),
    type==='team'?h(R.Fragment,null,field('挂到哪个项目',select('target',allProjects.map(p=>({value:p.id,label:projectName(p)}))),'选了哪个，它就归哪个；项目归档时跟着归档'),field('担什么角色',select('role',['记录员','质量员','对外联络','数据分析','值班答疑']),'统筹排期、催办、出日报由项目自动配置的项目管家负责')):field('放到哪里',select('publication',[{value:'mine',label:'数字员工市场 · 我创建的'},{value:'org',label:'数字员工市场 · 全公司'}])),
    field('进通讯录吗',select('directory',['是，作为 AI 同事出现在所属部门下','否，只在列表里'])),
    field('上线前先试跑',textarea('trial','给它一个真实的活试试，比如：把这份合同里的风险条款列出来')));
  if(tab==='domain')return h(R.Fragment,null,h('p',null,'业务域自己建的 Agent，走 GBOP 内部网关接进来。人设和能力由建设方维护。'),field('网关地址',h(Input,{value:'https://gbop.geely.com/consumer/market',readOnly:true})),field('服务标识 / 应用编码',input('serviceId','例如：QUALITY-DEFECT-AGENT')),field('鉴权方式',select('auth',['appKey + JWT Key（GBOP 标准）','OAuth Client','网关白名单（IP）']),'凭证在服务端配置，不写进前端代码'),field('它开放了哪些能力',checks('capabilities',['缺陷归因分析','质量数据查询','改判缺陷等级','下发整改单'])),field('数据出域范围',select('egress',['仅本项目数据（推荐）','本业务域数据','全公司数据（需审批）'])),btn('测试连通性',()=>Toast.info('原型：网关可达；凭证未配置，暂时调不通')));
  if(tab==='dify'){
    const app=data.dify[draft.difyApp],mode=app&&difyModes[app.mode];
    return h(R.Fragment,null,h('p',null,'人设、提示词和记忆在 Dify 中配置，这里负责接入。自动识别应用类型、接口、入参及名称。'),field('Dify 实例地址',input('difyEndpoint','https://…/v1')),field('API Key（演示应用）',select('difyKey',[{value:'',label:'选择一个演示应用'},...Object.keys(data.dify).map(value=>({value,label:value}))]),'演示选择，不填写真实密钥；真实凭证存放在服务端'),h('div',{className:'eva-digital-center__actions'},btn('识别并接入',()=>{if(!data.dify[draft.difyKey]){setError('先选择一个演示应用');return;}setDraft(d=>({...d,difyApp:d.difyKey,name:data.dify[d.difyKey].name,mapping:[data.dify[d.difyKey].form[0][0]]}));setError('');},{theme:'solid'}),btn('只测连通',()=>Toast.info(app?'原型：连通正常 · '+mode[1]:'先识别一下'))),app&&h(R.Fragment,null,h('h3',null,'识别结果'),h('p',null,mode[0]+' · '+app.mode+' · '+mode[1]+' · '+mode[2]),h('p',null,'应用名：'+app.name+' · '+app.ver+' · 头像从 Dify 同步'),h('h3',null,'入参映射'),...app.form.map(([name,type,note])=>field(name+' · '+type,h(Switch,{checked:(draft.mapping||[]).includes(name),onChange:on=>update('mapping',on?[...draft.mapping||[],name]:(draft.mapping||[]).filter(n=>n!==name))}),note)),field('响应模式',select('response',['streaming','blocking'])),field('超时与重试',select('timeout',['30 秒超时，失败重试 1 次','60 秒超时，不重试','120 秒超时，失败重试 2 次'])),h('p',null,'Workflow 使用 inputs 单次执行；Chatflow / Agent / Chatbot 使用 query 和 conversation_id 多轮交互。')));
  }
}
function market(){
  const staff=store.agents().filter(a=>a.kind==='staff').map(a=>({...a,domain:a.domain?.trim()||(a.scope==='org'?'全公司':'未设置')})),q=query.trim().toLowerCase();
  const base=staff.filter(a=>!q||[a.name,a.one,a.tagline,a.domain,a.no].some(v=>String(v||'').toLowerCase().includes(q))),list=base.filter(a=>!domain||a.domain===domain);
  const domains=[...new Set(base.map(a=>a.domain).filter(Boolean))].sort((a,b)=>base.filter(x=>x.domain===b).length-base.filter(x=>x.domain===a).length);
  const columns=[{title:'名称',dataIndex:'name',className:'eva-digital-center__name-cell',render:(_,a)=>identity(a,false)},{title:'工号',dataIndex:'no',width:'14%'},{title:'业务域',dataIndex:'domain',width:'18%'},{title:'操作',width:224,align:'right',className:'eva-digital-center__action-cell',render:(_,a)=>{const joined=store.hasInTeam(a.id);return h('div',{className:'eva-digital-center__actions'},h('span',{className:'eva-digital-center__team-action'},joined?h('span',{className:'eva-digital-center__joined-status',onClick:e=>e.stopPropagation()},'已加入'):btn('加入我的 Agent',e=>{e.stopPropagation();run(()=>{store.addToTeam(a.id);Toast.success('已加入我的 Agent');});},{size:'small',theme:'borderless',type:'primary',className:'eva-digital-center__market-action eva-digital-center__join-action'})),btn('加入项目',e=>{e.stopPropagation();open('project',a);},{size:'small',theme:'borderless',type:'primary',className:'eva-digital-center__market-action eva-digital-center__project-action'}));}}];
  return h('main',{className:'eva-digital-center__main'},
    h('header',{className:'eva-digital-center__head'},h('h1',null,'数字员工市场'),
      h('div',{className:'eva-digital-center__actions'},h(Input,{className:'eva-digital-center__market-search',prefix:h(icons.Search,{size:16}),showClear:true,value:query,onChange:setQuery,placeholder:'搜索数字员工'}))),
    h('div',{className:'eva-digital-center__filters eva-digital-center__domain-filters','aria-label':'按业务域筛选'},
      btn('全部业务域 '+base.length,()=>setDomain(null),{'aria-pressed':!domain,theme:!domain?'light':'borderless'}),
      domains.map(d=>btn(d+' '+base.filter(a=>a.domain===d).length,()=>setDomain(d),{key:d,'aria-pressed':domain===d,theme:domain===d?'light':'borderless'}))),
    h('div',{className:'eva-digital-center__table',tabIndex:0,'aria-label':'数字员工列表'},
      h(Table,{key:JSON.stringify([domain,query]),rowKey:'id',pagination:{pageSize:20,showSizeChanger:false},columns,dataSource:list,
        empty:query?'未找到匹配的数字员工':'暂无数字员工',
        onRow:a=>({tabIndex:0,'aria-label':'查看'+a.name+'的详情',onClick:()=>open('detail',a),onKeyDown:e=>{if(e.target===e.currentTarget&&(e.key==='Enter'||e.key===' ')){e.preventDefault();open('detail',a);}}})})));
}

function creator(){const rt=data.runtimes.find(r=>r.key===type);
  if(!rt)return h('main',{className:'eva-digital-center__main eva-creator-catalog'},
    h('header',{className:'eva-digital-center__head'},h('div',null,h('h1',null,'创建数字员工'),h('p',null,'选择一种建设方式，再配置身份、能力和发布信息。'))),
    h('div',{className:'eva-digital-center__cards eva-creator-grid eva-creator-grid--public'},
      data.runtimes.filter(rt=>['cloud'].includes(rt.key)).map(rt=>h('article',{key:rt.key,className:'eva-digital-center__card eva-creator-card'},
        h('div',{className:'eva-creator-card__heading'},h(icons[rt.key==='mine'?'Sparkles':'Users'],{size:22}),h('h3',null,rt.name)),
        h('p',{className:'eva-creator-card__tag'},rt.tag),
        h('p',null,rt.d),
        h('ul',null,rt.can.map(v=>h('li',{key:v},v))),
        h('p',{className:'eva-creator-card__boundary'},rt.cant.join('；')),
        btn('开始创建',rt.key==='persona'?undefined:()=>start(rt),{theme:'solid',disabled:rt.key==='persona'})))));


  return h(R.Fragment,null,h('aside',{className:'eva-digital-center__rail'},btn(returnTo?'返回我的 Agent':'返回数字员工市场',()=>returnTo?navigate(returnTo):navigate('/eva-stub/数字员工?evaMode=collaboration'),{icon:h(icons.ArrowLeft,{size:16}),theme:'borderless'}),h('h2',null,rt.name),rt.cfg.map(k=>btn(tabs[k],()=>setTab(k),{key:k,'aria-current':tab===k?'step':undefined,theme:tab===k?'light':'borderless',type:'tertiary'})),type!=='mine'&&h('p',null,type==='persona'?'配置完成后提交 IT 审核':['persona','skills','conn','mem','perm'].filter(k=>!rt.cfg.includes(k)).map(k=>tabs[k]).join('、')),['dify','domain'].includes(type)&&h('p',null,'由'+(type==='dify'?'Dify':'建设方')+'维护，这里不配')),h('main',{className:'eva-digital-center__main'},h('header',{className:'eva-digital-center__head'},h('div',null,h('h1',null,rt.name),h('p',null,rt.tag)),h('div',{className:'eva-digital-center__actions'},btn('放弃',()=>{navigate('/eva-stub/数字员工?evaMode=collaboration');setError('');},{}),btn('存草稿',()=>{store.saveDraft(type,draft);Toast.success('已存草稿');}),btn('创建并发布',save,{theme:'solid'}))),error&&h('p',{role:'alert'},error),h('div',{className:'eva-digital-center__form'},h('h3',null,tabs[tab]),configPane())));
}
function modalContent(){const a=dialog?.a;if(!a)return null;

  if(dialog.kind==='project'){
    const eligible=allProjects.filter(p=>members.manager(p.id,actor)&&(!(a.ownership==='personal'||a.scope==='self')||a.by===actor)&&(a.ownership!=='project'||a.projectId===p.id));
    const items=eligible.map(p=>({id:p.id,name:projectName(p),kind:'project',project:p,disabled:(p.employeeIds||[]).includes(a.id),selectionHint:(p.employeeIds||[]).includes(a.id)?'已加入':''}));
    const PickerUI=(window.__evaGetFileContext&&window.__evaGetFileContext().ui&&window.__evaGetFileContext().ui.MemberPicker)||null;
    return h('div',{className:'eva-project-picker-launch'},PickerUI?h(PickerUI,{visible:true,title:'加入项目',items,groups:[{kind:'project',label:'项目'}],emptyTitle:'暂无可加入的项目',emptyDescription:'仅你负责或管理的项目可添加；已加入的项目不会重复计入。',searchPlaceholder:'搜索项目',searchLabel:'搜索项目',noResultsText:'没有匹配的项目',submit:chosen=>'加入项目'+(chosen.length?'（'+chosen.length+'）':''),onCancel:()=>setDialog(null),onSubmit:chosen=>{try{members.transaction(staged=>chosen.forEach(p=>staged.addEmployee(p.id,actor,a.id)));setDialog(null);Toast.success('已加入所选项目');}catch(e){Toast.error(e.message);}}}):h('p',{role:'alert','className':'eva-project-picker__fallback'},'项目选择组件暂不可用，请刷新后重试。'));
  }


  if(dialog.kind==='detail'){
    const joined=store.hasInTeam(a.id);
    const publisher=a.publisher||'官方发布',creator=a.creatorName||a.byName||'官方维护',department=a.dept||a.deptFull?.split('/').slice(-1)[0]||'Eva 平台组',version=a.version||'v1.0.0',publishedAt=a.publishedAt||'2026-09-18',scope=a.scope==='org'?'全公司':a.scope==='project'?'项目内':'仅创建者';
    const versions=a.versions||[{version,at:publishedAt,by:creator,note:'完善身份说明、工具权限和输出格式。'},{version:'v1.2.0',at:'2026-08-28',by:publisher,note:'增加业务域知识和失败重试策略。'},{version:'v1.1.0',at:'2026-08-12',by:publisher,note:'首次发布并上线。'}];
    const audit=a.audit||[{at:publishedAt+' 16:20',actor:creator,action:'发布 '+version,note:'发布到'+scope},{at:publishedAt+' 15:42',actor:publisher,action:'审核通过',note:'完成上线前试跑和责任确认。'},{at:publishedAt+' 10:05',actor:creator,action:'创建数字员工',note:'完成身份、提示词、技能和工具配置。'}];
    const governance={publisher,creator,department,version,publishedAt,scope,uses:a.uses||128,users:a.users||46,versions,audit};
    const attributes=[['发布主体',publisher],['负责部门',department],['业务负责人',creator],['可见范围',scope],['版本',version+' · '+publishedAt+' 发布']];
    const statCards=[['近30天使用',governance.uses+' 次'],['服务人数',governance.users+' 人']];
    return h(R.Fragment,null,
      h('header',{className:'eva-detail-head'},
        h('div',{className:'eva-detail-head__identity'},identity(a,true)),
        a.presence!=='online'&&h('span',{className:'eva-digital-governance-presence is-'+a.presence},h('i',{className:'eva-digital-governance-presence__dot','aria-hidden':true}),a.presence==='offline'?'离线':'忙碌中')),
      h('div',{className:'eva-detail-body'},
        h('div',{className:'eva-detail-main'},
          h('section',{className:'eva-detail-block'},h('h3',null,'职责'),h('p',null,a.desc||'—')),
          h('section',{className:'eva-detail-block'},h('h3',null,'能力'),h('div',{className:'eva-detail-tags'},(a.skills||[]).map(s=>h(Tag,{key:s},s)))),
          h('section',{className:'eva-detail-block'},h('h3',null,'运营概览'),h('div',{className:'eva-detail-stats'},statCards.map(([label,value])=>h('div',{key:label},h('strong',null,value),h('span',null,label)))))),
        h('aside',{className:'eva-detail-side'},
          h('section',{className:'eva-detail-block'},h('h3',null,'属性'),h('dl',{className:'eva-detail-attrs'},attributes.map(([label,value])=>h('div',{key:label},h('dt',null,label),h('dd',null,value))))),
          h('div',{className:'eva-detail-records'},btn('版本记录',()=>setDialog({kind:'versions',a,governance}),{theme:'borderless'}),btn('追溯记录',()=>setDialog({kind:'audit',a,governance}),{theme:'borderless'})))),
      a.presence==='offline'&&h('p',{className:'eva-detail-offline'},'当前离线 · 最后在线 '+(a.lastSeen||'—')+' · 预计恢复 '+(a.backAt||'—')+'。消息会排队，上线后执行。'),
      h('div',{className:'eva-digital-governance-footer'},joined&&h('span',{className:'eva-digital-center__joined-status eva-detail-joined'},'已加入我的 Agent'),btn('加入项目',()=>open('project',a),{className:'eva-detail-join-project'}),!joined&&btn('加入我的 Agent',()=>run(()=>{store.addToTeam(a.id);Toast.success('已加入我的 Agent');}),{theme:'solid'})));
  }
  if(dialog.kind==='versions'){const g=dialog.governance;return h(R.Fragment,null,h('p',{className:'eva-digital-governance-intro'},'每个版本对应一组身份、提示词、工具和记忆配置。'),h('div',{className:'eva-digital-governance-timeline'},g.versions.map(v=>h('article',{key:v.version,className:'eva-digital-governance-event'},h('div',{className:'eva-digital-governance-event__head'},h('strong',null,v.version),h('span',null,v.at)),h('p',null,v.note),h('small',null,'发布/维护：'+v.by))),),btn('返回信息卡',()=>setDialog({kind:'detail',a}),{theme:'borderless'}));}
  if(dialog.kind==='audit'){const g=dialog.governance;return h(R.Fragment,null,h('p',{className:'eva-digital-governance-intro'},'记录创建、审核、发布和版本变更，便于确认责任与定位问题。'),h('div',{className:'eva-digital-governance-timeline'},g.audit.map((event,index)=>h('article',{key:event.at+index,className:'eva-digital-governance-event'},h('div',{className:'eva-digital-governance-event__head'},h('strong',null,event.action),h('span',null,event.at)),h('p',null,event.note),h('small',null,'操作主体：'+event.actor))),),btn('返回信息卡',()=>setDialog({kind:'detail',a}),{theme:'borderless'}));}
  if(dialog.kind==='skills'){
    const tab=dialog.tab||'md',files=a.files||[],accept=f=>tab==='ref'?f[0].startsWith('references/'):tab==='scr'?f[0].startsWith('scripts/'):!f[0].startsWith('references/')&&!f[0].startsWith('scripts/');
    return h(R.Fragment,null,h('p',null,[a.cat,a.ver,a.by,a.at].filter(Boolean).join(' · ')),h('p',null,a.desc),h(Tag,null,a.installed?'已安装':'未安装'),h('div',{className:'eva-digital-center__filters'},[['md','SKILL.md'],['ref','references'],['scr','scripts'],['oth','其他']].map(([value,label])=>btn(label,()=>setDialog(d=>({...d,tab:value})),{key:value,theme:tab===value?'light':'borderless'}))),tab==='md'?h('pre',{className:'eva-digital-center__document'},a.md||'这个技能还没写说明'):h(R.Fragment,null,...files.filter(accept).map(([path,kind,size])=>btn(path+' · '+kind+' · '+size,()=>Toast.info('原型：打开 '+path),{key:path,theme:'borderless',icon:h(icons.File,{size:16})})),!files.filter(accept).length&&h('p',null,'这一类没有文件')),h('div',{className:'eva-digital-center__filters'},btn(a.installed?'装到别的 Agent':'安装',()=>{if(!(draft.skills||[]).includes(a.name))update('skills',[...draft.skills||[],a.name]);setDialog(null);Toast.success('已选入当前 Agent 的技能');},{theme:'solid'}),btn('查看更新记录',()=>Toast.info('原型：'+a.ver+' 的变更说明'))));
  }
  if(dialog.kind==='conn'){
    const tab=dialog.tab||'overview',seed=a.id.split('').reduce((n,c)=>n+c.charCodeAt(0),0),linked=a.status==='已连接';
    const intro=h(R.Fragment,null,h('p',null,a.desc),h('p',null,[a.status,a.auth,a.mcp,a.domain,a.at].filter(Boolean).join(' · ')),h('div',{className:'eva-digital-center__actions'},linked?h(R.Fragment,null,btn('重新授权',()=>Toast.info('原型：重新走一次授权')),btn('测试',()=>Toast.info('原型：连通正常 · 延迟 '+(60+seed%140)+'ms')),btn('断开',()=>Toast.info('原型：断开 '+a.name))):btn('连接',()=>Toast.info(a.auth?.includes('申请')?'需要先申请凭证；凭证只存服务端环境变量':'原型：跳转授权页'))),h('div',{className:'eva-digital-center__filters'},[['overview','概览'],['tools','工具 '+(a.tools||[]).length],['perm','权限与凭证'],['log','调用记录']].map(([value,label])=>btn(label,()=>setDialog(d=>({...d,tab:value})),{key:value,theme:tab===value?'light':'borderless'}))));
    let pane;
    if(tab==='overview')pane=h(R.Fragment,null,h('h3',null,'装进来时自动拉的说明'),h('p',null,a.instr||'—'),h('h3',null,'谁在用'),h('div',{className:'eva-digital-center__cards'},[['本月调用',(800+seed*13%9000)+' 次'],['在用的 Agent',(3+seed%14)+' 个'],['平均延迟',(60+seed%140)+' ms'],['近 7 天失败率',((seed%9)/10).toFixed(1)+'%']].map(([key,value])=>h('div',{key,className:'eva-digital-center__card'},h('strong',null,value),key))),h('h3',null,'装了它的 Agent'),h('div',{className:'eva-digital-center__filters'},store.agents().slice(seed%5,seed%5+4).map(agent=>btn(identity(agent),()=>open('detail',agent),{key:agent.id,theme:'borderless'}))));
    if(tab==='tools')pane=h(R.Fragment,null,h('p',null,'装上这个连接器，Agent 就自动多出这些工具。'),...(a.tools||[]).map((tool,i)=>h('div',{key:tool,className:'eva-digital-center__field'},h('strong',null,tool),h('p',null,a.scopes?.[i]||a.desc),h(Tag,null,i%3===2?'只读':'可用'))),!(a.tools||[]).length&&h('p',null,'这个连接器还没开放工具'));
    if(tab==='perm')pane=h(R.Fragment,null,h('h3',null,'这个连接允许它做什么'),...(a.scopes||[]).map((scope,i)=>field(scope,h(Switch,{checked:dialog.scopes?.[scope]!==false,onChange:checked=>setDialog(d=>({...d,scopes:{...d.scopes,[scope]:checked}}))}),i===0?'必需，关掉这个连接器就没用了':'可以单独关掉')),h('h3',null,'凭证'),h('p',null,'鉴权方式：'+a.auth),h('p',null,'凭证存放：服务端环境变量，不进前端、仓库或日志'),h('p',null,'谁能改：'+(a.kind==='personal'?'只有我本人':'组织管理员')),h('p',null,'数据出域：仅内网，不出域'));
    if(tab==='log')pane=h(Table,{pagination:false,rowKey:'tool',columns:[{title:'工具',dataIndex:'tool'},{title:'状态',dataIndex:'status'},{title:'耗时',dataIndex:'duration'},{title:'时间',dataIndex:'time'}],dataSource:(a.tools||[]).slice(0,5).map((tool,i)=>({tool,status:(seed+i)%7!==3?'成功':'失败 · 超时 30 秒，已重试 1 次',duration:(60+(seed+i*17)%400)+' ms',time:'今天 '+(9+i)+':'+String((seed+i*7)%60).padStart(2,'0')}))});
    return h(R.Fragment,null,intro,pane);
  }
  return null;
}
function conversation(){const a=store.get(employeeId);if(!a)return h('p',null,'数字员工不存在');const id='digital-chat:'+a.id,source=store.conversationSource(a.id);
return h('div',{className:'eva-digital-center__chat'},h('header',{className:'eva-digital-center__head'},btn('数字员工市场',()=>navigate('/eva-stub/数字员工'),{theme:'borderless',icon:h(icons.ArrowLeft,{size:16})}),h('div',{className:'eva-digital-center__actions'},btn('资料',()=>open('detail',a)),store.hasInTeam(a.id)?h('span',{className:'eva-digital-center__joined-status'},'已加入我的 Agent'):btn('加入我的 Agent',()=>run(()=>{store.addToTeam(a.id);Toast.success('已加入我的 Agent');})),btn('加入项目',()=>open('project',a)))),h('div',{className:'eva-msg eva-channel-surface'},h(ChannelsView,{key:id,source,onOpenTask:()=>{}})));
}
const isPick=dialog?.kind==='project';
return h('section',{className:'eva-digital-center'+(view==='create'?' eva-creator-workspace':view==='market'?' eva-market-workspace':'')},view==='create'?creator():view==='chat'?conversation():market(),h('div',{className:'eva-digital-center__modal',ref:host}),h(Modal,{visible:!!dialog,getPopupContainer:popup,className:'eva-digital-dialog'+(isPick?' eva-picker-modal':'')+(dialog?.kind==='detail'?' eva-detail-modal':''),width:dialog?.kind==='project'?680:720,title:dialog?.kind==='project'?'加入项目':dialog?.kind==='detail'?undefined:dialog?.a?.name||'',onCancel:()=>setDialog(null),footer:isPick?h('div',{className:'eva-picker-footer'},btn('取消',()=>setDialog(null)),btn('加入项目'+(chosen.length?'（'+chosen.length+'）':''),()=>run(()=>{members.transaction(staged=>chosen.forEach(id=>{if(!staged.manager(id,actor))throw new Error('仅项目负责人或管理员可添加');staged.addEmployee(id,actor,dialog.a.id);}));setDialog(null);Toast.success('已加入所选项目');}),{theme:'solid',disabled:!chosen.length})):null,okText:'加入项目'+(chosen.length?'（'+chosen.length+'）':''),cancelText:'取消',okButtonProps:{disabled:!chosen.length},onOk:()=>run(()=>{members.transaction(staged=>chosen.forEach(id=>{if(!staged.manager(id,actor))throw new Error('仅项目负责人或管理员可添加');staged.addEmployee(id,actor,dialog.a.id);}));setDialog(null);Toast.success('已加入');})},modalContent()));
};
}
})(window);
