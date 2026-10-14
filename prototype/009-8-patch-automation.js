(function (root) {
  'use strict';
  root.__evaPatch('automation', function (source) {
        var sharedAutomationSource = String.raw`
function EvaExpertCenterPage({initialTab:rt="experts"}){
  const[ct,ut]=reactExports.useState(rt);
  return React.createElement("div",{className:"eva-expert-center"},
    React.createElement("div",{className:"eva-expert-center__tabs"},
      React.createElement(Tabs,{type:"line",activeTab:ct,onChange:ut},
        React.createElement(TabPane,{tab:"专家",itemKey:"experts"}),
        React.createElement(TabPane,{tab:"专家团",itemKey:"squads"})
      )
    ),
    React.createElement("div",{className:"eva-expert-center__body"},ct==="squads"?React.createElement(SquadPage,null):React.createElement(AgentPage,null))
  );
}
const EVA_PERSONAL_AUTOMATION_DEMO=window.__EVA_PERSONAL_AUTOMATION_DEMO||[];
function EvaAutomationRunDetail({run,onOpenTask}){
  const h=React.createElement,failed=["failed","error"].includes(run.lastStatus),status=failed?"失败":["completed","succeeded"].includes(run.lastStatus)?"成功":run.lastStatus==="running"?"运行中":"待运行";
  const date=new Date(run.lastRun),time=Number.isNaN(date.getTime())?run.lastRun:new Intl.DateTimeFormat("zh-CN",{timeZone:"Asia/Shanghai",year:"numeric",month:"2-digit",day:"2-digit",hour:"2-digit",minute:"2-digit",hour12:false}).format(date);
  const task=(ISSUES_BY_SPACE[currentSpaceId()]||[]).find(item=>item.id===run.runTargetId);
  return h("div",{className:"eva-auto-run-detail"},
    h("div",{className:"eva-auto-run-heading"},h("h3",null,run.name),h("span",{className:"eva-auto-run-status"+(failed?" is-failed":"")},status)),
    h("p",{className:"eva-auto-run-time"},time," · 北京时间"),
    h("section",{className:"eva-auto-run-result"},h("h4",null,failed?"失败原因":"执行结果"),h("p",null,run.runContent||"本次运行暂无结果摘要。")),
    task&&h("section",{className:"eva-auto-run-related"},h("h4",null,"关联任务"),h("button",{type:"button",onClick:onOpenTask},h("span",{className:"eva-auto-run-task-id"},task.identifier),h("span",{className:"eva-auto-run-task-name"},task.title),h(ChevronRight,{size:16}))),
    h("span",{className:"eva-auto-run-demo",title:"预置演示记录；关联任务用于呈现场景，不代表真实自动执行。",tabIndex:0},"演示记录")
  );
}
function EvaAutomationSettingsModal({item:rt,visible:ct,onClose:ut,onSave:pt}){
  const[mt,gt]=reactExports.useState(""),[St,Ct]=reactExports.useState(""),[xt,Pt]=reactExports.useState("");
  reactExports.useEffect(()=>{gt(rt?.name||"");Ct(rt?.instruction||rt?.description||"");Pt(rt?.schedule||"")},[rt]);
  return React.createElement(Modal,{width:640,title:"定时任务设置",visible:ct,onCancel:ut,closeOnEsc:true,maskClosable:true,footer:React.createElement(React.Fragment,null,React.createElement(ButtonComponent$1,{onClick:ut},"取消"),React.createElement(ButtonComponent$1,{type:"primary",disabled:!mt.trim(),onClick:()=>{pt&&pt({...rt,name:mt.trim(),instruction:St.trim(),description:St.trim(),schedule:xt.trim()});ut&&ut()}},"保存"))},rt&&React.createElement("div",{className:"eva-auto-settings"},
    React.createElement("label",null,React.createElement("span",null,"名称"),React.createElement(ForwardInput,{value:mt,onChange:gt,placeholder:"例如 每日晨报"})),
    React.createElement("label",null,React.createElement("span",null,"执行方"),React.createElement("div",{className:"eva-auto-settings__static"},rt.executor||"未指定执行方")),
    React.createElement("label",null,React.createElement("span",null,"触发时间"),React.createElement(ForwardInput,{value:xt,onChange:Pt,placeholder:"例如 工作日 09:00"})),
    React.createElement("label",null,React.createElement("span",null,"任务说明"),React.createElement("textarea",{value:St,onChange:Nt=>Ct(Nt.target.value),rows:7,placeholder:"写清楚目标、上下文和步骤"})),
    React.createElement("p",{className:"eva-auto-settings__hint"},"每次触发都会留下可追踪的运行记录。个人自动化沿用同一任务会话，团队项目中生成 Loop 任务。")
  ));
}
function EvaSharedAutomationPage({scope:rt,items:ct,loading:ut,onCreate:pt,onOpenRun:mt,notice:gt}){
  const[St,Ct]=reactExports.useState("tasks"),[Nt,Mt]=reactExports.useState(ct||[]),[Dt,Ft]=reactExports.useState(null);
  reactExports.useEffect(()=>Mt(ct||[]),[ct]);
  const Qt=St==="tasks"?Nt:Nt.flatMap(item=>item.runs?.length?item.runs.map(run=>({...item,id:run.id,lastRun:run.at,lastStatus:run.status,runContent:run.summary,runTargetId:run.taskId})):item.lastRun?[item]:[]).sort((a,b)=>new Date(b.lastRun)-new Date(a.lastRun));
  const Vt=Ht=>Ht==="completed"||Ht==="succeeded"?"成功":Ht==="running"?"运行中":Ht==="failed"||Ht==="error"?"失败":Ht==="missed"?"已错过":"待运行";
  const Ht=Lt=>{if(Lt.key==="Enter"||Lt.key===" "){Lt.preventDefault();Lt.currentTarget.click()}};
  const Lt=Kt=>Mt(Yt=>Yt.map(Xt=>Xt.id===Kt.id?Kt:Xt));
  const $t=Kt=>{const Xt=String(Kt||"");const Zt=Xt.match(/(\d{1,2})月(\d{1,2})日/);if(Zt)return Number(Zt[1])+"月"+Number(Zt[2])+"日";const en=Xt.match(/(?:\d{4}[\/.-])?(\d{1,2})[\/.-](\d{1,2})/);if(en)return Number(en[1])+"月"+Number(en[2])+"日";const tn=new Date(Kt);return Number.isNaN(tn.getTime())?Xt.replace(/\s+\d{1,2}:\d{2}.*$/,""):(tn.getMonth()+1)+"月"+tn.getDate()+"日"};
  const Kt=Yt=>React.createElement("div",{key:Yt.id,className:"eva-auto-unified-row",role:"button",tabIndex:0,onKeyDown:Ht,onClick:()=>St==="tasks"?Ft(Yt):mt&&mt(Yt)},
    React.createElement("div",{className:"eva-auto-unified-row__main"},React.createElement("strong",null,Yt.name),React.createElement("span",null,St==="tasks"?(Yt.description||Yt.executor||"自动化任务"):Vt(Yt.lastStatus)+(Yt.runContent?" · "+Yt.runContent:"")),St==="tasks"&&React.createElement("span",null,(Yt.enabled===false?"已暂停 · ":"已启用 · ")+(Yt.schedule||"未设置计划"))),
    React.createElement("div",{className:"eva-auto-unified-row__aside"},St==="tasks"?(Yt.enabled===false?"暂无后续执行":Yt.nextRun||"暂无后续执行"):$t(Yt.lastRun))
  );
  return React.createElement("div",{className:"eva-shared-auto","data-scope":rt},
    React.createElement("header",{className:"eva-shared-auto__head"},React.createElement(GroupComponent,{className:"eva-auto-segmented",role:"tablist","aria-label":"自动化任务视图","data-active":St},React.createElement(ButtonComponent$1,{type:"text",role:"tab","aria-selected":St==="tasks",className:St==="tasks"?"is-active":"",onClick:()=>Ct("tasks"),icon:React.createElement(Clock3,{size:18})},"定时任务"),React.createElement(ButtonComponent$1,{type:"text",role:"tab","aria-selected":St==="runs",className:St==="runs"?"is-active":"",onClick:()=>Ct("runs"),icon:React.createElement(ListChecks,{size:18})},"运行记录")),St==="tasks"&&React.createElement(ButtonComponent$1,{type:"primary",className:"eva-auto-create-button",icon:React.createElement(Plus$c,{size:16}),onClick:pt},"添加自动化")),
    gt&&React.createElement("p",{className:"eva-members-muted"},gt),
    ut?React.createElement("div",{className:"eva-shared-auto__loading"},React.createElement(SpinComponent,null)):React.createElement("div",{className:"eva-auto-unified-list",role:"list"},Qt.length?Qt.map(Kt):React.createElement("div",{className:"eva-shared-auto__empty"},React.createElement(St==="tasks"?Clock3:ListChecks,{size:20,"aria-hidden":!0}),React.createElement("span",null,St==="tasks"?"暂无定时任务":"暂无运行记录"))),
    React.createElement(EvaAutomationSettingsModal,{item:Dt,visible:!!Dt,onClose:()=>Ft(null),onSave:Lt})
  );
}
`;

        var personalAutomationStart = source.indexOf('ScheduledTasksPage=()=>{');
        var personalAutomationEnd = source.indexOf(',index$6=Object.freeze(', personalAutomationStart);
        if (personalAutomationStart < 0 || personalAutomationEnd < 0) throw new Error('个人自动化组件注入点不存在');
        var sharedAutomationInsert = source.lastIndexOf('const Attention$1=', personalAutomationStart);
        if (sharedAutomationInsert < 0) throw new Error('共用自动化组件注入点不存在');
        source = source.slice(0, sharedAutomationInsert) + sharedAutomationSource + source.slice(sharedAutomationInsert);
        personalAutomationStart = source.indexOf('ScheduledTasksPage=()=>{', sharedAutomationInsert + sharedAutomationSource.length);
        personalAutomationEnd = source.indexOf(',index$6=Object.freeze(', personalAutomationStart);
        source = source.slice(0, personalAutomationStart) + String.raw`ScheduledTasksPage=()=>{
  const{t:rt,i18n:ct}=useTranslation(),{jobs:ut,loading:pt}=useAllCronJobs(),{presetAssistants:mt}=useConversationAssistants(),gt=useAgentLogos(),[St,Ct]=reactExports.useState(false),[xt,Pt]=reactExports.useState(null);
  const Nt=reactExports.useMemo(()=>ut.length?ut.map(Mt=>{const Dt=getJobAgentMeta(Mt,mt,gt);return{id:Mt.id,name:Mt.name,description:Mt.description||Mt.target.payload.text,instruction:Mt.target.payload.text,schedule:formatSchedule(Mt,rt),nextRun:Mt.state.next_run_at_ms?formatNextRun(Mt.state.next_run_at_ms,ct.language):"-",executor:Dt.name,enabled:Mt.enabled,lastStatus:Mt.state.last_status,lastRun:Mt.state.last_run_at_ms?formatNextRun(Mt.state.last_run_at_ms,ct.language):null,output:"Session",runTargetName:Mt.metadata.conversation_title||Mt.name,runContent:Mt.state.last_error||"自动化任务已执行完成，结果已写入本次 Session。",raw:Mt}}):EVA_PERSONAL_AUTOMATION_DEMO,[ut,mt,gt,rt,ct.language]);
  return React.createElement(React.Fragment,null,React.createElement("div",{className:"eva-automation-page"},React.createElement("header",{className:"eva-page-header"},React.createElement("h1",null,"自动化任务")),React.createElement(EvaSharedAutomationPage,{scope:"personal",items:Nt,loading:pt,onCreate:()=>Ct(true),onOpenRun:Pt,notice:"同一自动化的多次执行归入 Eva 同学的一条任务会话；以下运行记录为演示数据。"}),React.createElement(CreateTaskDialog,{visible:St,onClose:()=>Ct(false)})),React.createElement(Modal,{visible:!!xt,title:"运行详情",width:640,onCancel:()=>Pt(null),footer:null,closeOnEsc:true,maskClosable:true},xt&&React.createElement(EvaAutomationRunDetail,{run:xt})));
}` + source.slice(personalAutomationEnd);

        var projectAutomationStart = source.indexOf('function AutomationPage(){');
        var projectAutomationEnd = source.indexOf('const{Text}=Typography;function ProjectDetailPage', projectAutomationStart);
        if (projectAutomationStart < 0 || projectAutomationEnd < 0) throw new Error('项目自动化组件注入点不存在');
        source = source.slice(0, projectAutomationStart) + String.raw`function AutomationPage(){
  const{t:rt}=useI18n$1(),[ct,ut]=reactExports.useState([]),[pt,mt]=reactExports.useState(true),[gt,St]=reactExports.useState(false),Ct=reactExports.useRef(0);
  const xt=reactExports.useCallback(()=>{const Dt=++Ct.current;mt(true),listAutopilots().then(Ft=>{Dt===Ct.current&&ut(Ft)}).finally(()=>{Dt===Ct.current&&mt(false)})},[]);reactExports.useEffect(xt,[xt]);
  const Pt=Dt=>WKApp$1.routeRight.push(React.createElement(AutopilotDetailPage,{autopilotId:Dt.id,onChanged:xt}));
  const Qt=Vt=>{const Ht=Vt.status==="paused",Kt=Vt.assignee_name??Vt.assignee_id,Yt=Vt.assignee_id?.startsWith("project-agent:")||evaMembers().store.clone(Vt.assignee_id)||evaMembers().store.employee(Vt.assignee_id);return React.createElement("div",{key:Vt.id,className:"loop-automation-card",role:"listitem",tabIndex:0,onClick:()=>Pt(Vt),onKeyDown:Xt=>{if(Xt.target===Xt.currentTarget&&(Xt.key==="Enter"||Xt.key===" ")){Xt.preventDefault();Pt(Vt)}}},
    React.createElement("div",{className:"loop-automation-card__head"},React.createElement("strong",{className:"loop-automation-card__title"},Vt.title),React.createElement("span",{className:"eva-project-automation__state"},Ht?"已暂停":"已启用")),
    Vt.description&&React.createElement("div",{className:"loop-automation-card__desc"},Vt.description),
    React.createElement("div",{className:"loop-automation-card__meta"},React.createElement("span",null,"执行计划：",Ht?"已暂停":Vt.schedule_label||"未设置计划")),
    React.createElement("div",{className:"loop-automation-card__foot"},React.createElement("span",{className:"loop-automation-card__assignee"},React.createElement(EvaLoopIdentityAvatar,{person:{id:Vt.assignee_id,name:Kt},size:24}),React.createElement("span",{className:"eva-identity-name-row"},React.createElement("span",{className:"loop-automation-card__assignee-name"},Kt),Yt&&window.EvaAIIdentity.badge(React.createElement)))));};
  const Vt=ct.filter(Ht=>Ht.status!=="paused").length;
  return React.createElement("div",{className:"loop-page eva-project-automation"},React.createElement("div",{className:"loop-page__head"},React.createElement("div",{className:"eva-project-automation__summary","aria-live":"polite"},React.createElement("span",{className:"eva-project-automation__total"},ct.length," 个自动化"),ct.length>0&&React.createElement("span",{className:"eva-project-automation__running"},Vt," 个已启用")),React.createElement(LoopButton,{icon:React.createElement(Plus$c,{size:14}),onClick:()=>St(true)},rt("loop.automation.create"))),React.createElement("div",{className:"loop-page__body"},pt?React.createElement("div",{className:"loop-page__center"},React.createElement(Spin,null)):ct.length===0?React.createElement("div",{className:"loop-empty"},React.createElement(Zap,{size:40,className:"loop-empty__icon"}),React.createElement("div",{className:"loop-empty__title"},rt("loop.automation.emptyTitle")),React.createElement("div",{className:"loop-empty__desc"},rt("loop.automation.emptyDesc")),React.createElement(LoopButton,{icon:React.createElement(Plus$c,{size:14}),onClick:()=>St(true),style:{marginTop:12}},rt("loop.automation.create"))):React.createElement("div",{className:"loop-automation-cards",role:"list"},ct.map(Qt))),React.createElement(CreateAutomationModal,{visible:gt,onClose:()=>St(false),onSaved:xt}));
}` + source.slice(projectAutomationEnd);
    source = root.__evaCut(source, 'className:"w-[min(560px,calc(100vw-32px))] max-w-560px",unmountOnExit:!0', 'className:"eva-auto-create-modal w-[min(560px,calc(100vw-32px))] max-w-560px",unmountOnExit:!0', '自动化创建样式宿主');
    // Adapt only the existing project automation detail component.
    var detailStart = source.indexOf("function AutopilotDetailPage");
    var detailEnd = source.indexOf("function AutomationPage", detailStart);
    if (detailStart < 0 || detailEnd < 0) throw new Error("项目自动化详情注入点不存在");
    var detail = source.slice(detailStart, detailEnd);
    detail = root.__evaCut(detail, "React.createElement(Switch,{checked:!oa,size:\"small\",onChange:ra=>Ir({status:ra?\"active\":\"paused\"}),disabled:mt.status===\"archived\"})", "React.createElement(Button,{theme:\"borderless\",size:\"small\",onClick:()=>Ir({status:oa?\"active\":\"paused\"}),disabled:mt.status===\"archived\"},oa?\"启用自动化\":\"暂停自动化\")", "项目自动化详情文字操作0");
    detail = root.__evaCut(detail, "React.createElement(Switch,{size:\"small\",checked:ra.enabled,onChange:aa=>Jr(ra,aa)})", "React.createElement(Button,{theme:\"borderless\",size:\"small\",onClick:()=>Jr(ra,!ra.enabled)},ra.enabled?\"暂停触发器\":\"启用触发器\")", "项目自动化详情文字操作1");
    detail = root.__evaCut(detail, "React.createElement(\"i\",{className:\"loop-apd__run-dot\",style:{background:la}}),", "", "项目自动化详情文字操作2");
    detail = root.__evaCut(detail, "React.createElement(\"i\",{className:\"loop-apd__status-dot\",\"data-status\":mt.status}),", "", "项目自动化详情文字操作3");
    detail = root.__evaCut(detail, "React.createElement(LoopTag,{tone:STATUS_TAG[mt.status]},ut(`loop.automation.statusLabel.${mt.status}`))", "React.createElement(\"span\",{className:\"eva-project-automation__state\"},mt.status===\"active\"?\"已启用\":ut(`loop.automation.statusLabel.${mt.status}`))", "项目自动化详情文字操作4");
    detail = detail.replaceAll("ut(`loop.automation.statusLabel.${mt.status}`)", "(mt.status===\"active\"?\"已启用\":mt.status===\"paused\"?\"已暂停\":ut(`loop.automation.statusLabel.${mt.status}`))");
    source = source.slice(0, detailStart) + detail + source.slice(detailEnd);
    source=root.__evaCut(source,'[Dt,Ft]=reactExports.useState(void 0),[Qt,Vt]=reactExports.useState("")','[Qt,Vt]=reactExports.useState("")','删除自动化旧项目字段及副作用／公共计划选择');
    source=root.__evaCut(source,'[tn,Kt]=reactExports.useState([]),[nn,rn]=reactExports.useState(!1)','[nn,rn]=reactExports.useState(!1)','删除自动化旧项目字段及副作用／公共计划选择');
    source=root.__evaCut(source,'listProjectOptions().then(Kt).catch(()=>Kt([])),','','删除自动化旧项目字段及副作用／公共计划选择');
    source=root.__evaCut(source,'Mt(null),Ft(void 0),Vt("")','Mt(null),Vt("")','删除自动化旧项目字段及副作用／公共计划选择');
    source=root.__evaCut(source,'description:Qt.trim()||void 0,project_id:Dt??null,assignee_type:xt','description:Qt.trim()||void 0,assignee_type:xt','删除自动化旧项目字段及副作用／公共计划选择');
    source=root.__evaCut(source,'[Ht,jt]=reactExports.useState([]),[tn,Kt]=reactExports.useState("")','[tn,Kt]=reactExports.useState("")','删除自动化旧项目字段及副作用／公共计划选择');
    source=root.__evaCut(source,',reactExports.useEffect(()=>{listProjectOptions().then(jt).catch(()=>jt([]))},[rt])','','删除自动化旧项目字段及副作用／公共计划选择');
    source=root.__evaCut(source,'React.createElement(Select,{value:rt.dayOfWeek','React.createElement(EvaSelect,{value:rt.dayOfWeek','删除自动化旧项目字段及副作用／公共计划选择');
    source=root.__evaCut(source,'React.createElement("div",{className:"loop-fields__row"},React.createElement("div",{className:"loop-fields__label"},pt("loop.automation.sendTo")),React.createElement(Select,{value:Dt,onChange:cn=>Ft(cn),placeholder:pt("loop.automation.sendToPlaceholder"),dropdownClassName:"loop-fields__dropdown",showClear:!0,filter:!0,style:{width:"100%"}},tn.map(cn=>React.createElement(Select.Option,{key:cn.id,value:cn.id},cn.title)))),','','删除自动化旧项目字段及副作用／公共计划选择');
    source=root.__evaCut(source,'React.createElement("div",{className:"loop-apd__prop"},React.createElement("div",{className:"loop-apd__prop-label"},ut("loop.automation.sendTo")),React.createElement(Select,{value:mt.project_id??void 0,onChange:ra=>Ir({project_id:ra??null}),placeholder:ut("loop.automation.sendToPlaceholder"),dropdownClassName:"loop-fields__dropdown",showClear:!0,filter:!0,style:{width:"100%"}},Ht.map(ra=>React.createElement(Select.Option,{key:ra.id,value:ra.id},ra.title)))),','','删除自动化旧项目字段及副作用／公共计划选择');
    source=root.__evaCut(source,'listProjectOptions=()=>Promise.resolve(PROJECTS.map(rt=>({id:rt.id,name:rt.title,icon:rt.icon}))),','','删除无调用方的旧项目候选接口');
    source=root.__evaCut(source,'WEEKDAYS=[0,1,2,3,4,5,6];function ScheduleFields','WEEKDAYS=[1,2,3,4,5,6,0];function ScheduleFields','每周从周一开始，保留 cron 星期值');
    source=root.__evaCut(source,'autopilotsOf=()=>scoped(BY_SPACE.autopilots)','autopilotsOf=()=>scoped(BY_SPACE.autopilots).map(item=>({...item,status:evaMembers().store.projectAutomationStatus(currentSpaceId(),item.id,item.status)}))','项目自动化应用归档停止状态');
    source=root.__evaCut(source,'createAutopilot=rt=>{const ct={...AUTOPILOTS[0],...rt,id:`ap-${Date.now().toString(36)}`,title:rt.title??"新自动化"};return AUTOPILOTS.push(ct),Promise.resolve(ct)}','createAutopilot=rt=>{const store=evaMembers().store,pid=currentSpaceId();if(store.isProjectArchived(pid))return Promise.reject(new Error("所属项目已归档"));const ct={...AUTOPILOTS[0],...rt,id:`ap-${Date.now().toString(36)}`,title:rt.title??"新自动化"};store.setProjectAutomationStatus(pid,store.actorId(),ct.id,ct.status||"active");scoped(BY_SPACE.autopilots).push(ct);return Promise.resolve(ct)}','归档禁止创建自动化且创建归入当前项目');
    source=root.__evaCut(source,'updateAutopilot=(rt,ct)=>{const ut=autopilotsOf().find(pt=>pt.id===rt)??AUTOPILOTS[0];return Object.assign(ut,ct),Promise.resolve(ut)}','updateAutopilot=(rt,ct)=>{const store=evaMembers().store,pid=currentSpaceId();if(store.isProjectArchived(pid))return Promise.reject(new Error("所属项目已归档"));const ut=scoped(BY_SPACE.autopilots).find(pt=>pt.id===rt);if(!ut)return Promise.reject(new Error("自动化不存在"));if(ct.status)store.setProjectAutomationStatus(pid,store.actorId(),rt,ct.status);return Object.assign(ut,ct),Promise.resolve(ut)}','归档禁止编辑及重启自动化');
    source=root.__evaCut(source,'deleteAutopilot=rt=>{const ct=AUTOPILOTS.findIndex(ut=>ut.id===rt);return ct>=0&&AUTOPILOTS.splice(ct,1),Promise.resolve()}','deleteAutopilot=rt=>{if(evaMembers().store.isProjectArchived(currentSpaceId()))return Promise.reject(new Error("所属项目已归档"));const list=scoped(BY_SPACE.autopilots),ct=list.findIndex(ut=>ut.id===rt);return ct>=0&&list.splice(ct,1),Promise.resolve()}','归档禁止删除自动化');
    for(const name of ['triggerAutopilot','createAutopilotTrigger','updateAutopilotTrigger','deleteAutopilotTrigger'])source=root.__evaCut(source,name+'=()=>Promise.resolve()',name+'=()=>evaMembers().store.isProjectArchived(currentSpaceId())?Promise.reject(new Error("所属项目已归档")):Promise.resolve()','归档禁止自动化操作：'+name);
    source=root.__evaCut(source,'onClick:()=>St(true)},rt("loop.automation.create")','onClick:()=>St(true),disabled:evaMembers().store.isProjectArchived(currentSpaceId())},rt("loop.automation.create")','归档禁用自动化创建入口');
    source=root.__evaCut(source,'onClick:()=>St(true),style:{marginTop:12}},rt("loop.automation.create")','onClick:()=>St(true),disabled:evaMembers().store.isProjectArchived(currentSpaceId()),style:{marginTop:12}},rt("loop.automation.create")','归档禁用自动化空态创建');
    const taskRunStart=source.indexOf('listAutopilotRuns='),taskRunEnd=source.indexOf(',createAutopilotTrigger=',taskRunStart);
    if(taskRunStart<0||taskRunEnd<0)throw new Error('自动化关联任务记录边界缺失');
    source=root.__evaCut(source,source.slice(taskRunStart,taskRunEnd),String.raw`listAutopilotRuns=(id)=>{const automation=autopilotsOf().find(item=>item.id===id),runs=(automation?.runs||[]).map(run=>{const task=evaTaskRecord(run.taskId);return{id:run.id,autopilot_id:id,source:"schedule",status:run.status==="failed"?"failed":"completed",issue_id:task?.workspace_id===automation.workspace_id?task.id:null,triggered_at:run.at,completed_at:run.completedAt||null,failure_reason:run.status==="failed"?run.summary:null,created_at:run.at}});return Promise.resolve({runs,total:runs.length})}`,'自动化历史引用既有演示记录的真实任务，不再打开失效 mock 任务');
    return source;
  });
})(window);
