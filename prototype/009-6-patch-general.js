(function (root) {
  'use strict';
  root.__evaPatch('general', function (source) {
    // Eva 统一 Tooltip：全站唯一实现。
    // 合规依据：W3C WCAG 2.1 SC 1.4.13（可关闭 / 可悬停 / 持续）与 WAI-ARIA APG Tooltip Pattern、
    // SC 2.1.1 键盘可达。气泡本体由项目设计系统 Semi 的 Tooltip 渲染，全站共用同一实例与同一组
    // 鼠标/焦点时机；触发方式只有 DOM 声明式 data-eva-tooltip（见 062-tooltip.js），
    // React 触发器同样写该属性，不再各自挂载独立气泡造成切换时交叉淡入与位置残留。
    // 不再沿用脚手架 AionUI 自带的 Arco TooltipComponent：AionUI 只是当年的壳，不是 Eva 的设计系统。
    var evaTooltipPrimitive = String.raw`var TooltipComponent=reactExports.forwardRef(Tooltip$2);TooltipComponent.displayName="Tooltip";
    var EvaTooltipBridge=(function(){
      var evaState={visible:!1,content:null,position:"top",target:null,rect:null,revision:0};
      var evaListeners=new Set();
      var evaSubscribe=function(evaFn){evaListeners.add(evaFn);return function(){evaListeners.delete(evaFn)}};
      var evaGet=function(){return evaState};
      var evaEmit=function(){evaListeners.forEach(function(evaFn){try{evaFn()}catch(evaError){}})};
      var evaRoot=null;
      var evaEnsure=function(){
        if(evaRoot||!document.body)return;
        var evaHost=document.createElement("div");
        evaHost.className="eva-tooltip-bridge";
        evaHost.setAttribute("data-eva-tooltip-bridge","");
        document.body.appendChild(evaHost);
        evaRoot=clientExports.createRoot(evaHost);
        evaRoot.render(reactExports.createElement(function(){
          var evaNow=reactExports.useSyncExternalStore(evaSubscribe,evaGet,evaGet);
          var evaRect=evaNow.rect;
          // 锚点几何在 show() 时固化到 state，用 Semi Tooltip 的 rePosKey 触发重定位：
          // 同一实例保持挂载，相邻目标之间移动时气泡不会整棵卸载/重挂，入场退场交给
          // Semi 自己的 motion（semi-tooltip-zoomIn/zoomOut），不再出现硬切与闪烁。
          var evaAnchorStyle=evaRect?{left:evaRect.left+"px",top:evaRect.top+"px",width:evaRect.width+"px",height:evaRect.height+"px"}:void 0;
          return reactExports.createElement(Tooltip,{trigger:"custom",visible:evaNow.visible,content:evaNow.content,position:evaNow.position,rePosKey:evaNow.revision,className:"eva-tooltip-surface",mouseEnterDelay:0,mouseLeaveDelay:0,getPopupContainer:function(){return document.body}},reactExports.createElement("span",{id:"eva-tooltip-virtual-anchor",className:"eva-tooltip-virtual-anchor","aria-hidden":"true",style:evaAnchorStyle}));
        }));
      };
      var evaSet=function(evaNext){evaState=Object.assign({},evaState,evaNext);evaEmit()};
      return{
        show:function(evaTarget,evaContent,evaPosition){
          if(!evaTarget||evaContent==null||evaContent==="")return;
          evaEnsure();
          var evaRect=evaTarget.getBoundingClientRect();
          evaSet({visible:!0,content:evaContent,position:evaPosition||"top",target:evaTarget,rect:{left:evaRect.left,top:evaRect.top,width:evaRect.width,height:evaRect.height},revision:evaState.revision+1});
        },
        hide:function(){evaSet({visible:!1})},
        isVisible:function(){return!!evaState.visible}
      };
    })();
    window.EvaTooltip=Object.freeze({show:EvaTooltipBridge.show,hide:EvaTooltipBridge.hide,isVisible:EvaTooltipBridge.isVisible});
`;
    source = root.__evaCut(source,
      'var TooltipComponent=reactExports.forwardRef(Tooltip$2);TooltipComponent.displayName="Tooltip";',
      evaTooltipPrimitive, '统一 Tooltip 原语与 DOM 桥');
    // Project-scoped task list: stable columns, without repeating its project name.
    source = root.__evaCut(source,
      'React.createElement("span",{className:"loop-list__spacer"}),rn.project_name&&React.createElement("span",{className:"loop-list__project"},rn.project_name),React.createElement("span",{className:"loop-list__id"},rn.identifier)',
      'null', '任务列表移除重复项目与原编号位置');
    source = root.__evaCut(source,
      'React.createElement("button",{className:"loop-list__title",onClick:()=>ct(rn.id)},rn.title',
      'React.createElement("span",{className:"loop-list__id"},rn.identifier),React.createElement("button",{className:"loop-list__title",onClick:()=>ct(rn.id)},rn.title',
      '任务列表编号独立列');
    source = root.__evaCut(source,
      'React.createElement("label",{className:"loop-list__check",onClick:cn=>cn.stopPropagation()},React.createElement("input",{type:"checkbox",checked:sn,onChange:()=>jt(rn.id)}))',
      'React.createElement("span",{className:"loop-list__check",onClick:cn=>cn.stopPropagation()},React.createElement(Checkbox,{"aria-label":"选择任务 "+rn.identifier,checked:sn,onChange:()=>jt(rn.id)}))',
      '任务多选复用 Semi Checkbox');
    // Replace the compatibility fixture at one verified boundary; humans live in 009-2.
    const orgPeople = source.match(/ORG_PEOPLE=\[[\s\S]*?\];new Map\(ORG_PEOPLE/);
    if (!orgPeople) throw new Error('ORG_PEOPLE 数据边界不匹配');
    source = root.__evaCut(source, orgPeople[0], 'ORG_PEOPLE=[...window.__EVA_PEOPLE,{uid:"b-wangyilin",name:"王宜林的分身",color:c$2(0),dept:"AI 产品共创",ai:true,online:true},{uid:"x-feedback",name:"用户反馈分析师",color:c$2(5),dept:"AI 产品共创",ai:true,online:true}];new Map(ORG_PEOPLE', '人员单一数据源');
    // Repository edition marker belongs to the shared client titlebar.
    source = root.__evaCut(source,
      'React.createElement("img",{className:"eva-tb-portrait",src:window.__EVA_COLLEAGUE_PORTRAIT,alt:""}),"Eva 同学")',
      'React.createElement("img",{className:"eva-tb-portrait",src:window.__EVA_COLLEAGUE_PORTRAIT,alt:""}),"Eva智能办公系统",React.createElement("span",{className:"eva-edition-badge eva-t-caption"},"原型 Evolve 版"))',
      'shared titlebar edition badge');
    // Settings > About shows the product name; the assistant identity keeps "Eva 同学".
    source = root.__evaCut(source,
      'React.createElement(Row,{label:"Eva 同学"},React.createElement(TagComponent,{size:"small"},"1.4.0"))',
      'React.createElement(Row,{label:"Eva智能办公系统"},React.createElement(TagComponent,{size:"small"},"1.4.0"))',
      'settings about product name');
    // Semi imperative Modal/Toast roots use the same React 19 client entry as Eva.
    source = root.__evaCut(source, 'if(typeof fullClone.createRoot=="function")return fullClone.createRoot}', 'if(typeof fullClone.createRoot=="function")return fullClone.createRoot;return clientExports.createRoot}', 'Semi React 19 root adapter');
    // No login: the web runtime behaves like desktop and starts authenticated,
    // so the /login route always redirects to /guid and LoginPage is unreachable.
    source = root.__evaCut(source,
      'if(isDesktopRuntime){mt("authenticated"),ut(null),St(!0);return}',
      '{mt("authenticated"),ut(null),St(!0);return}',
      'web starts authenticated, no login');
    source = source.split('AionUi - ').join('');
    if (source.includes('AionUi - ')) throw new Error('AionUi 登录页品牌残留未清除');
    // A queued textarea resize may run after a configuration pane unmounts.
    source = root.__evaCut(source, 'getSizingData=rt=>{const ct=window.getComputedStyle(rt);', 'getSizingData=rt=>{if(!rt||!rt.isConnected)return null;const ct=window.getComputedStyle(rt);', 'ignore detached textarea resize');
        var evaRelease = root.__EVA_RELEASE;
        if (!evaRelease || !/^\d{2}-\d{2} v\d+$/.test(evaRelease.version || '') || !/^\d{4}-\d{2}-\d{2} \d{2}:\d{2}$/.test(evaRelease.updatedAt || '')) {
          throw new Error('release.json 缺失或格式错误');
        }
        var evaReleaseRevision = evaRelease.version.split(' ')[1];
        var evaReleaseDate = evaRelease.updatedAt.slice(0, 10);
        var projectDirectoryComponentSource = String.raw`EvaProjectHomeIcon=createLucideIcon("house",[["path",{d:"M15 21v-8a1 1 0 0 0-1-1h-4a1 1 0 0 0-1 1v8",key:"house-door"}],["path",{d:"M3 10a2 2 0 0 1 .709-1.528l7-6a2 2 0 0 1 2.582 0l7 6A2 2 0 0 1 21 10v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z",key:"house-body"}]]),EvaStarIcon=createLucideIcon("star",[["path",{d:"M11.525 2.295a.53.53 0 0 1 .95 0l2.31 4.679a2.123 2.123 0 0 0 1.595 1.16l5.166.756a.53.53 0 0 1 .294.904l-3.736 3.638a2.123 2.123 0 0 0-.611 1.878l.882 5.14a.53.53 0 0 1-.771.56l-4.618-2.428a2.122 2.122 0 0 0-1.973 0L6.396 21.01a.53.53 0 0 1-.77-.56l.881-5.139a2.122 2.122 0 0 0-.611-1.879L2.16 9.795a.53.53 0 0 1 .294-.906l5.165-.755a2.122 2.122 0 0 0 1.597-1.16z",key:"star"}]]),EvaProjectList=Object.assign(({dataSource:evaDataSource=[],renderItem:evaRenderItem,emptyContent:evaEmptyContent,className:evaClassName=""})=>React.createElement("div",{className:evaClassName,role:"list"},evaDataSource.length?evaDataSource.map(evaRenderItem):evaEmptyContent),{Item:({header:evaHeader,main:evaMain,extra:evaExtra,className:evaClassName="",...evaProps})=>React.createElement("div",{...evaProps,className:evaClassName},evaHeader,evaMain,evaExtra)}),EvaProjectDirectory=({spaces:evaSpaces,onEnter:evaEnter,onCreate:evaCreate,onSeed:evaSeed})=>{
          const[evaCreateOpen,setEvaCreateOpen]=reactExports.useState(!1),[evaProjectQuery,setEvaProjectQuery]=reactExports.useState("");
          const evaPinStore=evaMembers().store,evaPinRevision=reactExports.useSyncExternalStore(evaPinStore.subscribe,evaPinStore.getSnapshot),evaPinActor=evaPinStore.snapshot().actorId,evaPinnedIds=evaPinStore.pinnedProjects(evaPinActor),setEvaPinnedIds=update=>evaPinStore.setPinnedProjects(evaPinActor,typeof update==="function"?update(evaPinStore.pinnedProjects(evaPinActor)):update);
          const evaAllProjects=evaSpaces,evaPinnedProjects=evaPinnedIds.map(evaId=>evaAllProjects.find(evaProject=>evaProject.id===evaId)).filter(Boolean),evaNormalizedQuery=evaProjectQuery.trim().toLowerCase(),evaMatchesProject=evaProject=>!evaNormalizedQuery||((evaProject.name??"")+" "+(evaProject.desc??"")).toLowerCase().includes(evaNormalizedQuery),evaFilteredProjects=evaAllProjects.filter(evaMatchesProject),evaFilteredPinnedProjects=evaPinnedProjects.filter(evaMatchesProject);
          reactExports.useEffect(()=>{setEvaPinnedIds(evaIds=>evaIds.filter(evaId=>evaAllProjects.some(evaProject=>evaProject.id===evaId)).slice(0,6))},[evaSpaces]);
          const evaSubmitProject=(evaChosen,evaName,evaValues)=>{evaCreate(evaName,(evaChosen||[]).map(evaItem=>({id:evaItem.id,kind:evaItem.kind})),(evaValues&&evaValues.goal)||""),setEvaCreateOpen(!1)},evaTogglePinned=(evaProject,evaEvent)=>{evaEvent.preventDefault(),evaEvent.stopPropagation();const evaIsPinned=evaPinnedIds.includes(evaProject.id);if(!evaIsPinned&&evaPinnedIds.length>=6){Toast.warning("最多关注 6 个项目");return}setEvaPinnedIds(evaIds=>evaIsPinned?evaIds.filter(evaId=>evaId!==evaProject.id):[...evaIds,evaProject.id])},evaOpenProject=evaProject=>{evaProject.organization||evaEnter(evaProject.id)},evaKeyboardOpen=(evaEvent,evaProject)=>{(evaEvent.key==="Enter"||evaEvent.key===" ")&&(evaEvent.preventDefault(),evaEvent.currentTarget.click())},evaProjectIcon=(evaProject,evaSize)=>React.createElement("span",{className:"eva-project-directory-icon",style:{backgroundColor:window.EvaProjectAppearance.css(evaProject).surface,color:window.EvaProjectAppearance.css(evaProject).accent}},React.createElement(AllApplication,{theme:"outline",size:String(evaSize),fill:"currentColor"})),evaPinButton=evaProject=>{const evaIsPinned=evaPinnedIds.includes(evaProject.id);return React.createElement(Button,{theme:"borderless",type:"tertiary",size:"small",className:"eva-project-follow-button"+(evaIsPinned?" is-followed":""),icon:React.createElement(EvaStarIcon,{size:16,strokeWidth:1.8,fill:evaIsPinned?"currentColor":"none"}),"aria-pressed":evaIsPinned,"aria-label":(evaIsPinned?"取消关注 ":"关注 ")+evaProject.name,title:evaIsPinned?"取消关注":"关注",onClick:evaEvent=>evaTogglePinned(evaProject,evaEvent)})},evaCreateModal=(()=>{const evaCandidates=evaMembers().ui.projectCreateCandidates(evaMembers().store.snapshot().actorId);return React.createElement(evaMembers().ui.MemberPicker,{visible:evaCreateOpen,title:"新建项目",fields:[{key:"name",id:"eva-project-name",label:"项目名称",placeholder:"例如：供应链运营协同",maxLength:50,required:!0,autoFocus:!0},{key:"goal",id:"eva-project-goal",label:"共同目标",placeholder:"例如：让产品、研发和业务共同推进 AI 能力",maxLength:2000}],items:evaCandidates.items,groups:evaCandidates.groups,memberLabel:"项目成员",submit:"创建并进入项目",minimumSelection:1,onCancel:()=>setEvaCreateOpen(!1),onSubmit:evaSubmitProject})})();
          return React.createElement("div",{className:"collab-list-page eva-project-directory"},React.createElement("header",{className:"eva-page-header"},React.createElement("h1",null,"我的项目")),React.createElement("div",{className:"eva-project-directory-actions"},React.createElement(Button,{className:"collab-btn-primary",theme:"solid",type:"primary",icon:React.createElement(Plus$c,{size:16}),onClick:()=>setEvaCreateOpen(!0)},"新建项目")),React.createElement("section",{className:"eva-project-pinned-section","aria-labelledby":"eva-project-pinned-title"},React.createElement("div",{className:"eva-project-directory-heading"},React.createElement("div",{className:"eva-project-directory-heading__title"},React.createElement("h2",{id:"eva-project-pinned-title"},"关注项目"),React.createElement("span",null,evaFilteredPinnedProjects.length," / 6"))),evaFilteredPinnedProjects.length?React.createElement("div",{className:"eva-project-pinned-grid"},evaFilteredPinnedProjects.map(evaProject=>React.createElement(Card,{key:evaProject.id,className:"eva-project-pinned-card"+(evaProject.organization?" eva-organization-project-card":""),bordered:!0,headerLine:!1,shadows:"hover",role:"button",tabIndex:0,onClick:()=>evaOpenProject(evaProject),onKeyDown:evaEvent=>evaKeyboardOpen(evaEvent,evaProject),title:React.createElement("div",{className:"eva-project-card-title"},evaProjectIcon(evaProject,18),React.createElement("div",{className:"name"},React.createElement("span",null,evaProject.name),evaProject.official&&React.createElement("span",{className:"eva-official-badge"},"官方"))),headerExtraContent:evaPinButton(evaProject)},React.createElement("p",{className:"eva-project-card-description"},evaProject.desc||"暂无项目简介")))):React.createElement("div",{className:"eva-project-pinned-empty"},evaNormalizedQuery?"没有匹配的关注项目":"还没有关注项目，在下方关注后会自动同步到「我的消息」")),React.createElement("section",{className:"eva-project-all-section","aria-labelledby":"eva-project-all-title"},React.createElement("div",{className:"eva-project-directory-heading eva-project-directory-heading--all"},React.createElement("div",{className:"eva-project-directory-heading__title"},React.createElement("h2",{id:"eva-project-all-title"},"全部项目"),React.createElement("span",null,evaFilteredProjects.length," 个")),React.createElement(ForwardInput,{className:"eva-project-directory-search",prefix:React.createElement(Search$1,{size:14}),showClear:!0,placeholder:"搜索项目",value:evaProjectQuery,onChange:setEvaProjectQuery,"aria-label":"搜索项目"})),React.createElement(EvaProjectList,{className:"eva-project-directory-list",dataSource:evaFilteredProjects,emptyContent:React.createElement("div",{className:"eva-project-list-empty"},evaNormalizedQuery?"没有匹配「"+evaProjectQuery.trim()+"」的项目":"暂无项目"),renderItem:evaProject=>React.createElement(EvaProjectList.Item,{key:evaProject.id,className:"eva-project-list-item"+(evaProject.organization?" eva-organization-project-card":""),role:"button",tabIndex:0,onClick:()=>evaOpenProject(evaProject),onKeyDown:evaEvent=>evaKeyboardOpen(evaEvent,evaProject),header:evaProjectIcon(evaProject,18),main:React.createElement("div",{className:"eva-project-list-main"},React.createElement("div",{className:"eva-project-list-title name"},React.createElement("span",null,evaProject.name),evaProject.official&&React.createElement("span",{className:"eva-official-badge"},"官方")),React.createElement("div",{className:"eva-project-list-description"},evaProject.desc||"暂无项目简介")),extra:evaPinButton(evaProject)})})),evaCreateModal)
        }`;
        var projectInfoComponentSource = String.raw`EvaProjectInfoPage=({workspace:evaWorkspace})=>{
          const evaMeta=evaWorkspace.overview||(evaWorkspace.id==="prod"?window.__EVA_SUPPLY_CHAIN_DEMO.overview:{}),evaPeriod=typeof evaMeta.period==="object"?[evaMeta.period.start,evaMeta.period.end].filter(Boolean).join(" 至 "):evaMeta.period||"尚未设置",evaInfo={summary:evaWorkspace.desc||"尚未填写项目目标",background:evaMeta.background||"尚未填写",goals:Array.isArray(evaMeta.goals)?evaMeta.goals:evaWorkspace.desc?[evaWorkspace.desc]:[],period:evaPeriod,stage:evaMeta.stage||"尚未设置",milestones:Array.isArray(evaMeta.milestones)?evaMeta.milestones:[]};
          return React.createElement("div",{className:"eva-project-info"},React.createElement("header",{className:"eva-project-info__hero"},React.createElement("div",{className:"eva-project-info__hero-main"},React.createElement("div",{className:"eva-project-info__eyebrow"},React.createElement("span",{className:"eva-project-info__status"},evaMeta.status||"项目"),React.createElement("span",null,"项目编号 · ",evaWorkspace.id)),React.createElement("h1",null,evaWorkspace.name),React.createElement("p",null,evaInfo.summary),React.createElement("div",{className:"eva-project-info__background"},React.createElement("strong",null,"项目背景"),React.createElement("p",null,evaInfo.background))),React.createElement("dl",{className:"eva-project-info__facts"},React.createElement("div",null,React.createElement("dt",null,"项目周期"),React.createElement("dd",null,evaInfo.period)),React.createElement("div",null,React.createElement("dt",null,"当前阶段"),React.createElement("dd",null,evaInfo.stage)))),React.createElement("div",{className:"eva-project-info__grid"},React.createElement("section",{className:"eva-project-info__card"},React.createElement("h2",null,"项目目标"),React.createElement("ol",{className:"eva-project-info__goals"},evaInfo.goals.map((evaGoal,evaIndex)=>React.createElement("li",{key:evaGoal},React.createElement("span",null,String(evaIndex+1).padStart(2,"0")),React.createElement("p",null,evaGoal))))),React.createElement("section",{className:"eva-project-info__card eva-project-info__card--milestones"},React.createElement("h2",null,"关键里程碑"),React.createElement("div",{className:"eva-project-info__timeline"},evaInfo.milestones.map(evaMilestone=>React.createElement("div",{key:evaMilestone[0],className:"eva-project-info__milestone is-"+evaMilestone[2]},React.createElement("span",{className:"eva-project-info__milestone-dot","aria-hidden":!0}),React.createElement("time",null,evaMilestone[0]),React.createElement("strong",null,evaMilestone[1]),React.createElement("span",{className:"eva-project-info__milestone-state"},evaMilestone[2]==="done"?"已完成":evaMilestone[2]==="active"?"进行中":"待开始")))))))
        }`;
        projectDirectoryComponentSource = projectDirectoryComponentSource
          .replace('React.createElement(Card,{key:evaProject.id,className:', 'React.createElement(Card,{key:evaProject.id,"data-eva-project-id":evaProject.id,className:')
          .replace('React.createElement(EvaProjectList.Item,{key:evaProject.id,className:', 'React.createElement(EvaProjectList.Item,{key:evaProject.id,"data-eva-project-id":evaProject.id,className:');
        var replacements = [
          ['React.createElement(Avatar$2,{size:"extra-extra-small",color:"light-blue",src:xt.creator_avatar??void 0},[...xt.creator_name??"?"][0])', 'React.createElement(EvaLoopIdentityAvatar,{person:{id:xt.creator_id,name:xt.creator_name,type:"member",avatar:xt.creator_avatar}})'],
          ['React.createElement(Avatar$2,{size:"extra-extra-small",color:"light-blue",src:ki.author_avatar??void 0},[...ki.author_name??"?"][0])', 'React.createElement(EvaLoopIdentityAvatar,{person:{id:ki.author_id,name:ki.author_name,type:ki.author_type||"member",avatar:ki.author_avatar}})'],
          ['React.createElement(Avatar$2,{size:"extra-extra-small",color:"light-blue"},gt.name.slice(0,1).toUpperCase())', 'React.createElement(EvaLoopIdentityAvatar,{person:{...gt,type:"agent"}})'],
          ['React.createElement(Avatar$2,{size:"extra-extra-small",color:"light-blue"},gt.name.slice(0,1).toUpperCase())', 'React.createElement(EvaLoopIdentityAvatar,{person:{...gt,type:"agent"}})'],

          ['official:[{id:"c-official-announcements",name:"产品公告",color:"#6f3eb8",unread:1,members:2,lastAt:"2026-09-02T17:30:00+08:00",threads:[]},{id:"c-official-feedback",name:"意见反馈",color:"#5b7fc4",unread:0,members:2,lastAt:"2026-09-02T16:40:00+08:00",threads:[]},{id:"c-official-community",name:"使用交流",color:"#2f9e76",unread:0,members:2,lastAt:"2026-09-02T15:20:00+08:00",threads:[]}]', 'official:[]'],

          ['React.createElement(Avatar$2,{size:"extra-small",shape:"square",color:avatarColor(Qr.name)},Qr.name.slice(0,1).toUpperCase())', 'React.createElement(EvaLoopIdentityAvatar,{person:{...Qr,type:"agent"},size:24})'],
          ['React.createElement(Avatar$2,{size:"extra-extra-small",color:"grey"},Qr.owner_name.slice(0,1).toUpperCase())', 'React.createElement(EvaLoopIdentityAvatar,{person:{id:Qr.owner_id,name:Qr.owner_name,type:"member"}})'],
          ['React.createElement(Avatar$2,{size:"small",shape:"square",color:avatarColor(ha.name)},ha.name.slice(0,1).toUpperCase())', 'React.createElement(EvaLoopIdentityAvatar,{person:{...ha,type:"squad"},size:32})'],
          ['React.createElement(Avatar$2,{size:"extra-extra-small",color:"light-blue",src:ha.leader_avatar??void 0},(ha.leader_name??"?").slice(0,1))', 'React.createElement(EvaLoopIdentityAvatar,{person:{id:ha.leader_id,name:ha.leader_name,type:"agent",avatar:ha.leader_avatar}})'],
          ['React.createElement(Avatar$2,{key:`${wa.member_type}:${wa.member_id}`,size:"extra-extra-small",color:wa.member_type==="agent"?"violet":"light-blue",src:wa.member_avatar??void 0},(wa.member_name??"?").slice(0,1))', 'React.createElement(EvaLoopIdentityAvatar,{key:`${wa.member_type}:${wa.member_id}`,person:{id:wa.member_id,name:wa.member_name,type:wa.member_type,avatar:wa.member_avatar}})'],
          ['React.createElement(Avatar$2,{size:"extra-extra-small",color:"light-blue",src:mt.leader_avatar??void 0},(mt.leader_name??"?").slice(0,1))', 'React.createElement(EvaLoopIdentityAvatar,{person:{id:mt.leader_id,name:mt.leader_name,type:"agent",avatar:mt.leader_avatar}})'],
          ['React.createElement(Avatar$2,{size:"small",color:"light-blue",src:pa.member_avatar??void 0},(pa.member_name??"?").slice(0,1))', 'React.createElement(EvaLoopIdentityAvatar,{person:{id:pa.member_id,name:pa.member_name,type:pa.member_type,avatar:pa.member_avatar},size:24})'],

          ['function AssigneePicker(', 'function EvaLoopIdentityAvatar({person,size=20}){const h=React.createElement;if(!person?.id)return h(User,{size:20});const store=evaMembers().store,id=person.id,human=store.person(id);if(human||person.type==="member")return h("img",{src:window.EvaAvatar.personUri(id),width:size,height:size,alt:"",style:{borderRadius:"50%",flexShrink:0}});if(person.type==="squad")return h("img",{src:window.EvaAvatar.squadUri(id),width:size,height:size,alt:"",style:{borderRadius:"50%",flexShrink:0}});const clone=store.clone(id),employee=store.employee(id),agent=id.startsWith("project-agent:")?store.projectAgent(id.slice(14)):null,identity=agent||employee||clone||scoped(BY_SPACE.agents).find(p=>p.id===id)||person,appearance=identity.identityAppearance||{name:identity.name||person.name,avatar:identity.avatar||window.__EVA_COLLEAGUE_PORTRAIT,sourceName:"Eva"};return window.EvaAIIdentity.avatar(appearance,size,h);}\nfunction AssigneePicker('],
          ['function AssigneePicker(', 'function EvaLoopIdentityName({person}){const h=React.createElement,store=evaMembers().store,id=person?.id,human=id&&store.person(id),ai=!human&&person?.type!=="member"&&person?.type!=="squad"&&(person?.type==="agent"||!!store.clone(id)||!!store.employee(id)||String(id||"").startsWith("project-agent:")||scoped(BY_SPACE.agents).some(item=>item.id===id));return h("span",{className:"eva-loop-identity-name"},h("span",{className:"eva-loop-identity-name-text"},person?.name||""),ai&&window.EvaAIIdentity.badge(h));}function AssigneePicker('],
          ['onClick:()=>ut(jt.id,jt.type,jt.name)},jt.name)', 'onClick:()=>ut(jt.id,jt.type,jt.name)},React.createElement(EvaLoopIdentityName,{person:jt}))'],
          ['React.createElement("span",{className:"loop-assignee-name"},Nt?.name??ct)', 'React.createElement("span",{className:"loop-assignee-name"},React.createElement(EvaLoopIdentityName,{person:Nt||{id:rt,name:ct}}))'],
          ['jt.type==="member"&&jt.octo_uid?React.createElement(Avatar$2,{size:"extra-extra-small",color:"light-blue",src:WKApp$1.shared.avatarUser(jt.octo_uid)},jt.name.slice(0,1)):typeIcon(jt.type)', 'React.createElement(EvaLoopIdentityAvatar,{person:jt})'],
          ['React.createElement(Avatar$2,{size:"extra-extra-small",color:ASSIGNEE_TYPE_COLOR[Nt?.type??"member"],src:Nt?.octo_uid?WKApp$1.shared.avatarUser(Nt.octo_uid):void 0},(Nt?.name??ct??"?").slice(0,1))', 'React.createElement(EvaLoopIdentityAvatar,{person:Nt||{id:rt,name:ct}})'],

          ['projectTint=rt=>/^#[0-9a-f]{6}$/i.test(rt??"")?`${rt}18`:"#f2f3f5"', "projectTint=rt=>window.EvaProjectAppearance.get({color:rt}).surface"],
          ['const SPACE_PALETTE=[{color:"#4F6BED",colorBg:"#EEF2FF"},{color:"#12A38F",colorBg:"#E9F8F5"},{color:"#D98B18",colorBg:"#FFF6E5"},{color:"#E16B5A",colorBg:"#FFF0ED"},{color:"#8066C9",colorBg:"#F2EEFF"},{color:"#2F86C7",colorBg:"#EAF6FC"},{color:"#C6537A",colorBg:"#FCEEF3"},{color:"#718C42",colorBg:"#F2F6E9"}],', "const "],
          ['JSON.stringify(rt))}catch{}}function seedSpaces()', 'JSON.stringify(rt.map(window.EvaProjectAppearance.normalize)))}catch{}}function seedSpaces()'],
          ['const ct=SPACE_PALETTE[loadSpaces().length%SPACE_PALETTE.length];return{id:`sp-${Date.now().toString(36)}`,name:rt,short:rt.slice(0,1),color:ct.color,colorBg:ct.colorBg,', 'const id=`sp-${Date.now().toString(36)}`,ct=window.EvaProjectAppearance.view({id});return{id,name:rt,short:rt.slice(0,1),colorKey:ct.colorKey,color:ct.color,colorBg:ct.colorBg,'],

          [
            '最近更新：2026-09-04 20:28',
            '最近更新：' + evaRelease.updatedAt
          ],
          [
            'function isPwaRegistrationSupported(){if(typeof window>"u"||typeof navigator>"u"||isElectronDesktop()||!("serviceWorker"in navigator))return!1;',
            'function isPwaRegistrationSupported(){return!1;if(typeof window>"u"||typeof navigator>"u"||isElectronDesktop()||!("serviceWorker"in navigator))return!1;'
          ],
          [
            'function titleForPath(rt,ct){return rt.startsWith("/login")?ct("login.pageTitle"):"Eva 同学"}',
            'function titleForPath(rt,ct){return rt.startsWith("/login")?ct("login.pageTitle"):"Eva · ' + evaReleaseDate + ' · ' + evaReleaseRevision + '"}'
          ],
          [
            'BY_SPACE={agents:{[SPACE_DATA_KEY]:AGENTS},squads:{[SPACE_DATA_KEY]:SQUADS},skills:{[SPACE_DATA_KEY]:SKILLS},autopilots:{[SPACE_DATA_KEY]:AUTOPILOTS},projects:{[SPACE_DATA_KEY]:PROJECTS},members:{[SPACE_DATA_KEY]:MEMBERS}}',
            'BY_SPACE={agents:{prod:window.__EVA_SUPPLY_CHAIN_DEMO.agents,"drive-design":window.__EVA_DRIVE_DEMO.agents},squads:{prod:window.__EVA_SUPPLY_CHAIN_DEMO.squads,"drive-design":window.__EVA_DRIVE_DEMO.squads},skills:{prod:window.__EVA_SUPPLY_CHAIN_DEMO.skills,"drive-design":window.__EVA_DRIVE_DEMO.skills},autopilots:{prod:window.__EVA_SUPPLY_CHAIN_DEMO.autopilots,"drive-design":window.__EVA_DRIVE_DEMO.autopilots,official:window.__EVA_PROJECT_AUTOMATIONS.official,lab:window.__EVA_PROJECT_AUTOMATIONS.lab},projects:{prod:window.__EVA_SUPPLY_CHAIN_DEMO.projects,"drive-design":window.__EVA_DRIVE_DEMO.projects},members:{prod:MEMBERS,"drive-design":MEMBERS}}'
          ],
          [
            'ISSUES_BY_SPACE={[SPACE_DATA_KEY]:MOCK_ISSUES}',
            'ISSUES_BY_SPACE={prod:window.__EVA_SUPPLY_CHAIN_DEMO.issues,"drive-design":window.__EVA_DRIVE_DEMO.issues,official:window.__EVA_OFFICIAL_TASKS,lab:window.__EVA_CLIENT_TASKS}'
          ],
          [
            'CANDIDATES=[...AGENTS.map(rt=>({id:rt.id,type:"agent",name:rt.name})),...SQUADS.map(rt=>({id:rt.id,type:"squad",name:rt.name})),...MEMBERS.map(rt=>({id:rt.user_id,type:"member",name:rt.name??rt.user_id,octo_uid:rt.octo_uid}))]',
            'CANDIDATES=[...window.__EVA_SUPPLY_CHAIN_DEMO.agents.map(rt=>({id:rt.id,type:"agent",name:rt.name})),...window.__EVA_SUPPLY_CHAIN_DEMO.squads.map(rt=>({id:rt.id,type:"squad",name:rt.name})),...window.__EVA_DRIVE_DEMO.agents.map(rt=>({id:rt.id,type:"agent",name:rt.name})),...window.__EVA_DRIVE_DEMO.squads.map(rt=>({id:rt.id,type:"squad",name:rt.name})),...MEMBERS.map(rt=>({id:rt.user_id,type:"member",name:rt.name??rt.user_id,octo_uid:rt.octo_uid}))]'
          ],
          [
            'case"settings":return React.createElement(SettingsPage,{workspace:WORKSPACE})',
            'case"project-info":return React.createElement(EvaProjectInfoPage,{workspace:rt});case"settings":return React.createElement(SettingsPage,{workspace:{...WORKSPACE,id:rt.id,name:rt.name,slug:rt.id}})'
          ],
          [
            'listAgentTasks=rt=>{if(rt&&rt!=="ag-feedback")return Promise.resolve([]);',
            'listAgentTasks=rt=>{if(window.__EVA_SUPPLY_CHAIN_DEMO.agentTasks[rt])return Promise.resolve(window.__EVA_SUPPLY_CHAIN_DEMO.agentTasks[rt]);if(window.__EVA_DRIVE_DEMO.agentTasks[rt])return Promise.resolve(window.__EVA_DRIVE_DEMO.agentTasks[rt]);if(rt&&rt!=="ag-feedback")return Promise.resolve([]);'
          ],
          [
            'agentStatusMap=()=>Promise.resolve(Object.fromEntries(AGENTS.map(rt=>[rt.id,rt.status])))',
            'agentStatusMap=()=>Promise.resolve(Object.fromEntries(agentsOf().map(rt=>[rt.id,rt.status])))'
          ],
          [
            'TABS=[{key:"channels",label:"群聊"},{key:"tasks",label:"任务"},{key:"experts",label:"专家"},{key:"squads",label:"专家团"},{key:"skills",label:"技能"},{key:"automation",label:"自动化"},{key:"settings",label:"设置"}]',
            'TABS=[{key:"tasks",label:"任务"},{key:"channels",label:"群聊"},{key:"files",label:"文件"},{key:"automation",label:"自动化"},{key:"project-info",label:"项目信息"},{key:"settings",label:"项目设置"}]'
          ],
          [
            'SpaceFrame=({space:rt,spaces:ct,onSwitch:ut})=>{const[pt,mt]=reactExports.useState("channels")',
            'SpaceFrame=({space:rt,spaces:ct,onSwitch:ut})=>{const[pt,mt]=reactExports.useState("tasks")'
          ],
          [
            'TABS.map(Ft=>React.createElement("button"',
            '(rt.id==="prod"?TABS:TABS.filter(Ft=>Ft.key!=="experts"&&Ft.key!=="squads"&&Ft.key!=="skills")).map(Ft=>React.createElement("button"'
          ],
          [
            'Ft.key==="channels"&&gt>0&&React.createElement("span",{className:"badge"},gt)',
            'Ft.key==="channels"&&gt>0&&React.createElement("span",{className:"badge"},gt>99?"99+":gt)'
          ],
          [
            'React.createElement(Avatar,{name:rt.short,color:rt.color,size:20,square:!0}),React.createElement("span",{className:"nm",title:rt.name},rt.name)',
            'React.createElement("span",{className:"nm",title:rt.name},rt.name)'
          ],
          [
            'React.createElement(Avatar,{name:Ft.short,color:Ft.color,size:20,square:!0})," ",Ft.name',
            'Ft.name'
          ],
          [
            'Mt=React.createElement("span",{className:"collab-sp-chip",role:"button",tabIndex:0,"aria-haspopup":"menu","aria-expanded":St,onClick:()=>Ct(Ft=>!Ft),onKeyDown:Ft=>{Ft.key==="Enter"&&Ct(Qt=>!Qt)}},React.createElement("span",{className:"nm",title:rt.name},rt.name),React.createElement("span",{className:"caret"},"▾"),St&&React.createElement("div",{className:"sp-menu",onClick:Ft=>Ft.stopPropagation()},ct.map(Ft=>React.createElement("div",{key:Ft.id,className:"mi",onClick:()=>{Ct(!1),WKApp$1.routeRight.popAll(),ut(Ft.id)}},Ft.name)),React.createElement("div",{className:"divider"}),React.createElement("div",{className:"mi",onClick:()=>{Ct(!1),WKApp$1.routeRight.popAll(),ut(null)}},"⌂ 全部项目")))',
            'Mt=React.createElement(React.Fragment,null,React.createElement(Button,{size:"small",theme:"borderless",type:"tertiary",className:"eva-project-directory-button","aria-label":"全部项目",title:"全部项目",icon:React.createElement(EvaProjectHomeIcon,{size:16,"aria-hidden":!0}),onClick:()=>{WKApp$1.routeRight.popAll(),ut(null)}}),React.createElement(Dropdown,{trigger:"click",position:"bottomLeft",spacing:4,clickToHide:!0,render:React.createElement(Dropdown.Menu,{className:"eva-project-switcher-menu"},(()=>{const evaMemberStore=evaMembers().store;reactExports.useSyncExternalStore(evaMemberStore.subscribe,evaMemberStore.getSnapshot);const evaActor=evaMemberStore.snapshot().actorId,evaPinnedProjects=evaMemberStore.pinnedProjects(evaActor).map(evaId=>ct.find(Ft=>Ft.id===evaId)).filter(Boolean),evaPinnedIds=evaPinnedProjects.map(Ft=>Ft.id),evaRemainingProjects=ct.filter(Ft=>!evaPinnedIds.includes(Ft.id)),evaGrouped=evaPinnedProjects.length>0&&evaRemainingProjects.length>0,evaRenderProject=Ft=>React.createElement(Dropdown.Item,{key:Ft.id,"data-eva-project-id":Ft.id,onClick:()=>{WKApp$1.routeRight.popAll(),ut(Ft.id)}},React.createElement(LayoutGrid,{size:16,style:{color:window.EvaProjectAppearance.css(Ft).accent,marginInlineEnd:8,flexShrink:0},"aria-hidden":!0}),Ft.name);return React.createElement(React.Fragment,null,evaGrouped?React.createElement(React.Fragment,null,React.createElement(Dropdown.Title,null,"关注项目"),evaPinnedProjects.map(evaRenderProject),React.createElement(Dropdown.Divider,null),React.createElement(Dropdown.Title,null,"未关注项目"),evaRemainingProjects.map(evaRenderProject)):ct.map(evaRenderProject))})())},React.createElement("span",{className:"eva-project-switcher-anchor"},React.createElement(Button,{size:"small",theme:"borderless",type:"tertiary",className:"collab-sp-chip eva-project-switcher"},React.createElement(LayoutGrid,{size:16,style:{color:window.EvaProjectAppearance.css(rt).accent},className:"eva-project-switcher__icon","aria-hidden":!0}),React.createElement("span",{className:"nm",title:rt.name},rt.name),React.createElement(ChevronDown,{size:13,className:"eva-project-switcher__chevron","aria-hidden":!0})))))'
          ],
          [
            '),Ft)},SpaceFrame=',
            '),Ft)},' + projectDirectoryComponentSource + ',' + projectInfoComponentSource + ',SpaceFrame='
          ],
          [
            ':React.createElement(SpaceList,{spaces:rt,onEnter:',
            ':React.createElement(EvaProjectDirectory,{spaces:rt,onEnter:'
          ],
          [
            'function CollabPage(){const[rt,ct]=reactExports.useState(()=>loadSpaces()),[ut,pt]=reactExports.useState(null),mt=rt.find(gt=>gt.id===ut)??null;return',
            'function CollabPage(){const evaProjectLocation=useLocation(),evaProjectNavigate=useNavigate(),evaRouteMemberStore=evaMembers().store;reactExports.useSyncExternalStore(evaRouteMemberStore.subscribe,evaRouteMemberStore.getSnapshot);const[rt,ct]=reactExports.useState(()=>loadSpaces()),ut=new URLSearchParams(evaProjectLocation.search).get("evaProject"),pt=id=>evaProjectNavigate(id?"/collab?evaProject="+encodeURIComponent(id):"/collab"),mt=rt.find(gt=>gt.id===ut&&evaRouteMemberStore.canRead(gt.id,evaRouteMemberStore.snapshot().actorId))??null;reactExports.useEffect(()=>{const gt=()=>{WKApp$1.routeRight.popAll(),pt(null)},St=Ct=>{const xt=Ct.detail||{};xt.projectId&&evaRouteMemberStore.canRead(xt.projectId,evaRouteMemberStore.snapshot().actorId)&&(WKApp$1.routeRight.popAll(),pt(xt.projectId))};return window.addEventListener("eva:open-project-directory",gt),window.addEventListener("eva:open-project-view",St),()=>{window.removeEventListener("eva:open-project-directory",gt),window.removeEventListener("eva:open-project-view",St)}},[evaProjectNavigate]);return'
          ],
          [
            'if(Array.isArray(ct)&&ct.length){const ut=new Set(ct.map(pt=>pt.id));return[...ct,...DEFAULTS.filter(pt=>!ut.has(pt.id))]}',
            'if(Array.isArray(ct)&&ct.length){const ut=ct.map(pt=>{const mt=DEFAULTS.find(gt=>gt.id===pt.id),St=window.EvaProjectAppearance.view(pt.colorKey?pt:mt?{...pt,colorKey:mt.colorKey}:pt);return St.id==="drive-design"?{...St,name:"团队文件功能设计",short:"团",desc:(St.desc||"").replaceAll("云盘","团队文件")}:St}),mt=new Set(ut.map(pt=>pt.id));return[...ut,...DEFAULTS.filter(pt=>!mt.has(pt.id))]}'
          ],
          [
            'case"experts":return React.createElement(AgentPage,null);case"squads":return React.createElement(SquadPage,null);',
            'case"experts":return React.createElement(EvaExpertCenterPage,null);case"squads":return React.createElement(EvaExpertCenterPage,{initialTab:"squads"});'
          ],
          [
            'listAssigneeCandidates$1().then(ha=>{ur(ha.filter(Oa=>Oa.type!=="squad"));const ga=ha.find(Oa=>Oa.type==="agent");',
            'listAssigneeCandidates$1().then(ha=>{ur(ha.filter(Oa=>Oa.type==="agent"));const ga=ha.find(Oa=>Oa.type==="agent");'
          ],
          [
            'reactExports.useEffect(()=>{listAssigneeCandidates$1().then(pa=>sn(pa.filter(ha=>ha.type!=="squad"))).catch(()=>sn([]))},[])',
            'reactExports.useEffect(()=>{listAssigneeCandidates$1().then(pa=>sn(pa.filter(ha=>ha.type==="agent"))).catch(()=>sn([]))},[])'
          ],
          [
            'React.createElement(TabPane,{tab:ut("loop.settings.general"),itemKey:"general"},React.createElement(GeneralTab,{workspace:rt,onUpdated:ct})),React.createElement(TabPane,{tab:ut("loop.settings.members"),itemKey:"members"},React.createElement(MembersTab,{workspaceId:rt.id})),React.createElement(TabPane,{tab:ut("loop.settings.webhooks"),itemKey:"webhooks"},React.createElement(WebhooksTab,null))',
            'React.createElement(TabPane,{tab:"通用",itemKey:"general"},React.createElement(GeneralTab,{workspace:rt,onUpdated:ct})),React.createElement(TabPane,{tab:"成员管理",itemKey:"members"},React.createElement(MembersTab,{workspaceId:rt.id})),React.createElement(TabPane,{tab:"专家",itemKey:"experts"},React.createElement(AgentPage,null)),React.createElement(TabPane,{tab:"专家团",itemKey:"squads"},React.createElement(SquadPage,null)),React.createElement(TabPane,{tab:"技能",itemKey:"skills"},React.createElement(SkillPage,null))'
          ],
          [
            'React.createElement("div",{className:"loop-page__toolbar"},!mt&&React.createElement("div",{className:"loop-agent-scope"',
            'React.createElement("div",{className:"loop-page__toolbar"},ut==="collab-tasks"?React.createElement("div",{className:"loop-seg eva-task-view-switcher",role:"tablist","aria-label":pt("loop.action.show")},["board","list","hierarchy"].map($a=>React.createElement("button",{key:$a,type:"button",role:"tab","aria-selected":Kt===$a,className:`loop-seg__btn${Kt===$a?" is-active":""}`,onClick:()=>Da($a)},$a==="board"?React.createElement(Workbench,{theme:"outline",size:"14",fill:"currentColor"}):$a==="grouped"?React.createElement(Users,{size:14}):$a==="list"?React.createElement(List$1,{size:14}):React.createElement(EvaHierarchyIcon,{size:14}),$a==="hierarchy"?"层级":pt(`loop.view.${$a}`)))):!mt&&React.createElement("div",{className:"loop-agent-scope"'
          ],
          [
            'React.createElement("div",{className:"loop-page__spacer"}),React.createElement(Dropdown,{trigger:"click",visible:pr,onVisibleChange:mr,position:"bottomRight",render:Ta}',
            'ut!=="collab-tasks"&&React.createElement("div",{className:"loop-page__spacer"}),React.createElement(Dropdown,{trigger:"click",visible:pr,onVisibleChange:mr,position:"bottomRight",render:Ta}'
          ],
          [
            '!mt&&React.createElement(Dropdown,{trigger:"click",visible:dr,onVisibleChange:ur,position:"bottomRight",render:Na}',
            'ut!=="collab-tasks"&&!mt&&React.createElement(Dropdown,{trigger:"click",visible:dr,onVisibleChange:ur,position:"bottomRight",render:Na}'
          ],
          [
            'pt("loop.action.show"))),React.createElement(LoopButton,{icon:React.createElement(Plus$c,{size:14}),onClick:Ra}',
            'pt("loop.action.show"))),ut==="collab-tasks"&&React.createElement("div",{className:"loop-page__spacer"}),React.createElement(LoopButton,{icon:React.createElement(Plus$c,{size:14}),onClick:Ra}'
          ],
          [
            'React.createElement(SiderEvaStub,{label:"工作板",',
            'gt==="/collab"?null:React.createElement(SiderEvaStub,{label:"工作板",'
          ],
          [
            'React.createElement(SiderScheduledEntry,{isMobile:pt,isActive:gt==="/scheduled",',
            'gt==="/collab"?null:React.createElement(SiderScheduledEntry,{isMobile:pt,isActive:gt==="/scheduled",'
          ]
        ];


        var memberStart=source.indexOf('function MembersTab({workspaceId:rt}){');
        var memberEnd=source.indexOf('const listAutopilots=',memberStart);
        if(memberStart<0||memberEnd<memberStart||source.indexOf('function MembersTab({workspaceId:rt}){',memberStart+1)>=0)throw new Error('成员管理替换边界不匹配');
        source=root.__evaCut(source,source.slice(memberStart,memberEnd),String.raw`let evaMembershipStore,evaMembershipComponents,evaSharedFileStore;
        function evaMembers(){return evaMembershipStore||(evaMembershipStore=window.EvaMembership.bootstrap(ORG_PEOPLE,loadSpaces(),CHANNELS_BY_SPACE,ORG_CHANNELS,id=>loadSpaces().find(p=>p.id===id))),evaSharedFileStore||(evaSharedFileStore=window.EvaFileSharing.bootstrap(evaMembershipStore)),evaMembershipComponents||(evaMembershipComponents=window.EvaMembersUI.create({React:reactExports,Button,Select,Modal,Table,Input:ForwardInput,Tag,Checkbox,Radio,Switch,PlusIcon:Plus$c,CircleMinusIcon:createLucideIcon("circle-minus",[["circle",{cx:"12",cy:"12",r:"10",key:"circle"}],["path",{d:"M8 12h8",key:"minus"}]]),CameraIcon:createLucideIcon("camera",[["path",{d:"M14.5 4h-5L7 7H4a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2h-3l-2.5-3z",key:"1o9zid"}],["circle",{cx:"12",cy:"13",r:"3",key:"1jzowv"}]]),CloseIcon:X,BackIcon:ArrowLeft$3,SearchIcon:Search$1,ProjectIcon:LayoutGrid,MailIcon:Mail$1,useNavigate},evaMembershipStore,evaSharedFileStore)),{store:evaMembershipStore,ui:evaMembershipComponents,files:evaSharedFileStore}}
        window.__evaGetFileContext=evaMembers;
        function evaLoopMentionItems(options){const store=evaMembers().store,actorId=store.snapshot().actorId,projectId=currentWorkspaceId(),agents=scoped(BY_SPACE.agents)||[],squads=scoped(BY_SPACE.squads)||[];if(!window.EvaMentionCandidates)return[];return window.EvaMentionCandidates.flat({store:store,actorId:actorId,projectId:projectId,agents:agents,squads:squads,query:(options&&options.query)||""})}
        function evaLoopMentionSuggestion(){
          let host=null,root=null,outside=null,state=null;
          function order(){return window.EvaMentionCandidates?window.EvaMentionCandidates.ORDER:[]}
          function groupedItems(){if(!state)return[];const byKind=new Map();for(const item of (state.items||[])){const kind=item.kind||"human";if(!byKind.has(kind))byKind.set(kind,[]);byKind.get(kind).push(item)}return order().filter(group=>byKind.has(group.kind)).map(group=>({kind:group.kind,label:group.label,items:byKind.get(group.kind)}))}
          function place(){if(host&&state&&state.clientRect){const rect=state.clientRect();if(rect){host.style.left=rect.left+"px";host.style.top=rect.top+"px"}}}
          function draw(){if(!root||!state)return;root.render(React.createElement(evaMembers().ui.MentionPicker,{visible:true,broadcast:false,groups:groupedItems(),query:state.query,activeIndex:state.index,onActiveChange:index=>{state.index=index;draw()},onClose:close,onChoose:(name,id,item)=>commit(name,id,item)}));place()}
          function mount(){if(host)return;host=document.createElement("div");host.className="eva-loop-mention-host";document.body.appendChild(host);root=clientExports.createRoot(host);outside=event=>{if(host&&event.target instanceof Node&&!host.contains(event.target))close()};document.addEventListener("mousedown",outside,!0)}
          function commit(name,id,item){if(state&&state.command){const tokenId=item?(item.tokenId||item.id):id,tokenType=item?(item.tokenType||"member"):"all",label=item?item.name:name;state.command({id:tokenId,label:label,type:tokenType})}close()}
          function close(){if(outside){document.removeEventListener("mousedown",outside,!0);outside=null}detachComposition();if(root){const activeRoot=root;root=null;activeRoot.unmount()}if(host){host.remove();host=null}if(state)state.command=null}
          function apply(props){state.query=props.query||"";state.index=0;state.items=props.items||[];state.command=props.command;state.clientRect=props.clientRect;draw()}
          function detachComposition(){if(state&&state.dom&&state.compositionEnd){state.dom.removeEventListener("compositionend",state.compositionEnd);state.compositionEnd=null}}
          return{items:function(options){return evaLoopMentionItems(options||{})},render:function(){return{onStart:function(props){detachComposition();state={query:props.query||"",index:0,items:props.items||[],command:props.command,clientRect:props.clientRect,pending:null};state.dom=props.editor&&props.editor.view?props.editor.view.dom:null;state.compositionEnd=function(){const pending=state.pending;state.pending=null;if(pending)apply(pending)};if(state.dom)state.dom.addEventListener("compositionend",state.compositionEnd);mount();draw()},onUpdate:function(props){if(!state)return;if(props.editor&&props.editor.view&&props.editor.view.composing){state.pending=props;return}state.pending=null;apply(props)},onKeyDown:function(props){if(!state)return false;const event=props.event;if(event.isComposing||event.keyCode===229)return false;const panel=host&&host.querySelector(".eva-im-mention-options"),options=panel?Array.from(panel.querySelectorAll(":scope > button:not([data-eva-mention-more])")):[];if(event.key==="Escape"){close();return true}if(!options.length)return false;if(event.key==="ArrowDown"||event.key==="ArrowUp"){state.index=(state.index+(event.key==="ArrowDown"?1:-1)+options.length)%options.length;draw();return true}if(event.key==="Enter"){options[state.index]?.click();return true}return false},onExit:function(){close()}}}}
        }
        window.__evaLoopMention={items:evaLoopMentionItems,suggestion:evaLoopMentionSuggestion};
        function MembersTab({workspaceId:rt}){return React.createElement(evaMembers().ui.Members,{key:rt,scopeId:rt})}`, '项目成员组件');
        source = root.__evaCutAll(source, replacements, '通用补丁');
        source=root.__evaCut(source,'onCreate:gt=>{const St=newSpace(gt),Ct=[...rt,St];','onCreate:(gt,evaPicked,evaGoal)=>{const St={...newSpace(gt),desc:evaGoal||""},Ct=[...rt,St];const evaPickedList=Array.isArray(evaPicked)?evaPicked:[],evaCloneIds=evaPickedList.filter(evaItem=>evaItem&&evaItem.kind==="clone").map(evaItem=>evaItem.id),evaHumanIds=evaPickedList.filter(evaItem=>evaItem&&evaItem.kind==="human").map(evaItem=>evaItem.id);evaMembers().store.createProject(St.id,St.name,evaMembers().store.snapshot().actorId,evaCloneIds,evaGoal,evaHumanIds);window.setTimeout(()=>window.dispatchEvent(new CustomEvent("eva:open-project-view",{detail:{projectId:St.id}})),0);','项目创建成员事务');

    var evaLoopMentionStart=source.indexOf('function buildLoopMention(rt,ct){');
    var evaLoopMentionEnd=source.indexOf('function toMarkdown(',evaLoopMentionStart);
    if(evaLoopMentionStart<0||evaLoopMentionEnd<evaLoopMentionStart)throw new Error('Loop 提及边界不匹配');
    var evaLoopMentionBlock=source.slice(evaLoopMentionStart,evaLoopMentionEnd);
    var evaLoopSuggestionStart=evaLoopMentionBlock.indexOf('suggestion:{items:async');
    var evaLoopSuggestionMarker='recordMentionUsage(St,gt)})}';
    var evaLoopSuggestionEnd=evaLoopMentionBlock.indexOf(evaLoopSuggestionMarker,evaLoopSuggestionStart);
    if(evaLoopSuggestionStart<0||evaLoopSuggestionEnd<0)throw new Error('Loop 提及 suggestion 边界不匹配');
    evaLoopSuggestionEnd+=evaLoopSuggestionMarker.length;
    source=root.__evaCut(source,evaLoopMentionBlock,evaLoopMentionBlock.slice(0,evaLoopSuggestionStart)+'suggestion:window.__evaLoopMention.suggestion()'+evaLoopMentionBlock.slice(evaLoopSuggestionEnd),'任务评论提及复用统一选人');

    // 来源者、创建者必选，选择器不提供“未指派”清空项；调用方可传入项目身份候选。
    source=root.__evaCut(source,
      'function AssigneePicker({value:rt,valueName:ct,onChange:ut,size:pt="default",types:mt}){',
      'function AssigneePicker({value:rt,valueName:ct,onChange:ut,size:pt="default",types:mt,allowClear:Ot=!0,candidates:evaTaskCandidateOverride}){const evaQs=reactExports.useState(""),evaQ=evaQs[0],evaSetQ=evaQs[1],evaEx=reactExports.useState({}),evaExp=evaEx[0],evaSetExp=evaEx[1],evaAi=reactExports.useState(-1),evaActive=evaAi[0],evaSetActive=evaAi[1],evaLr=reactExports.useRef([]),evaInputRef=reactExports.useRef(null);',
      '任务身份选择器支持必选模式与面板内搜索');
    // 分组按身份类型由父容器统一定义：成员／AI 分身／数字员工／专家／专家团；候选可带 group 字段细分。
    source=root.__evaCut(source,
      'const Nt=St.find(Vt=>Vt.id===rt),Mt=[{type:"member",label:gt("loop.assignee.member")},{type:"agent",label:gt("loop.assignee.agent")},{type:"squad",label:gt("loop.assignee.squad")}],Dt=mt?Mt.filter(Vt=>mt.includes(Vt.type)):Mt,Ft=!mt||mt.includes("member"),',
      'const Nt=St.find(Vt=>Vt.id===rt),Ft=!mt||mt.includes("member"),',
      '分组标题改由候选身份类型推导');
    source=root.__evaCut(source,
      'Pt=(Vt=!1)=>{const Ht=++xt.current;(Vt?refreshAssigneeCandidates():listAssigneeCandidates$1()).then(jt=>{Ht===xt.current&&Ct(jt)}).catch(()=>{Ht===xt.current&&Ct([])})}',
      'Pt=(Vt=!1)=>{if(evaTaskCandidateOverride){Ct(evaTaskCandidateOverride);return}const Ht=++xt.current;(Vt?refreshAssigneeCandidates():listAssigneeCandidates$1()).then(jt=>{Ht===xt.current&&Ct(jt)}).catch(()=>{Ht===xt.current&&Ct([])})}',
      '项目身份候选优先于全局候选');
    source=root.__evaCut(source,
      'reactExports.useEffect(()=>(Pt(),()=>{xt.current++}),[])',
      'reactExports.useEffect(()=>(Pt(),()=>{xt.current++}),[evaTaskCandidateOverride])',
      '候选随项目身份刷新');
    source=root.__evaCut(source,
      'Ft=!mt||mt.includes("member")',
      'Ft=(!mt||mt.includes("member"))&&Ot',
      '必选模式隐藏未指派项');
    // 打开面板时重置搜索、展开与键盘焦点，避免上一次的选择状态残留。
    source=root.__evaCut(source,
      'onVisibleChange:Vt=>{Vt&&Pt(!0)}',
      'onVisibleChange:Vt=>{if(Vt){Pt(!0);evaSetQ("");evaInputRef.current&&(evaInputRef.current.value="");evaSetExp({});evaSetActive(-1);setTimeout(()=>{evaInputRef.current&&evaInputRef.current.focus()},0)}}',
      '面板打开时重置搜索与展开状态');
    // 面板结构对齐统一提及候选规范：顶部搜索、按「联系人／AI 分身／数字员工」分组、
    // 每组默认 5 条并可展开、检索态单列相关度排序、面板内容限高滚动、↑↓/Enter 键盘选择。
    source=root.__evaCut(source,
      'Qt=React.createElement(Dropdown.Menu,null,Ft&&React.createElement(Dropdown.Item,{onClick:()=>ut(null,null,null),icon:React.createElement(CircleSlash,{size:13})},gt("loop.assignee.unassigned")),Dt.map(Vt=>{const Ht=St.filter(jt=>jt.type===Vt.type);return Ht.length===0?null:React.createElement(React.Fragment,{key:Vt.type},React.createElement(Dropdown.Divider,null),React.createElement(Dropdown.Title,null,Vt.label),Ht.map(jt=>React.createElement(Dropdown.Item,{key:jt.id,icon:React.createElement(EvaLoopIdentityAvatar,{person:jt}),active:jt.id===rt,onClick:()=>ut(jt.id,jt.type,jt.name)},React.createElement(EvaLoopIdentityName,{person:jt}))))}))',
      String.raw`Qt=(()=>{const evaNorm=s=>String(s||"").normalize("NFKC").toLocaleLowerCase().trim(),evaNeedle=evaNorm(evaQ),evaLabels={member:"联系人",clone:"AI 分身",employee:"数字员工",agent:gt("loop.assignee.agent"),squad:gt("loop.assignee.squad")},evaOrder=["member","clone","employee","agent","squad"],evaKeys=[];St.forEach(jt=>{const evaKey=jt.group||jt.type;evaKeys.includes(evaKey)||evaKeys.push(evaKey)}),evaKeys.sort((jt,kt)=>evaOrder.indexOf(jt)-evaOrder.indexOf(kt));const evaFilter=evaList=>evaNeedle?evaList.filter(evaP=>evaNorm(evaP.name).includes(evaNeedle)):evaList,evaRank=evaName=>{const evaN=evaNorm(evaName);return evaN===evaNeedle?3:evaN.startsWith(evaNeedle)?2:1},evaItem=(evaP,evaSuffix)=>React.createElement(Dropdown.Item,{key:evaP.id+(evaSuffix||""),icon:React.createElement(EvaLoopIdentityAvatar,{person:evaP}),active:evaP.id===rt||evaLr.current[evaActive]===evaP,onClick:()=>ut(evaP.id,evaP.type,evaP.name)},React.createElement(EvaLoopIdentityName,{person:evaP})),evaKeyDown=evaEvent=>{if(evaEvent.isComposing||229===evaEvent.keyCode)return;const evaRows=evaLr.current||[];evaEvent.key==="ArrowDown"?(evaEvent.preventDefault(),evaSetActive(evaI=>Math.min(evaI+1,evaRows.length-1))):evaEvent.key==="ArrowUp"?(evaEvent.preventDefault(),evaSetActive(evaI=>Math.max(evaI-1,0))):evaEvent.key==="Enter"&&(evaEvent.preventDefault(),evaRows[evaActive]&&ut(evaRows[evaActive].id,evaRows[evaActive].type,evaRows[evaActive].name))},evaVisible=[];let evaBody;if(evaNeedle){const evaFlat=[];evaKeys.forEach(evaKey=>{evaFilter(St.filter(evaP=>(evaP.group||evaP.type)===evaKey)).forEach(evaP=>evaFlat.push(evaP))}),evaFlat.sort((evaA,evaB)=>evaRank(evaB.name)-evaRank(evaA.name)||evaNorm(evaA.name).indexOf(evaNeedle)-evaNorm(evaB.name).indexOf(evaNeedle)||evaA.name.length-evaB.name.length),evaFlat.forEach(evaP=>evaVisible.push(evaP)),evaBody=evaFlat.length?evaFlat.map(evaP=>evaItem(evaP)):React.createElement("div",{className:"eva-task-assignee-empty"},"未找到匹配的联系人或 AI")}else evaBody=evaKeys.map((evaKey,evaIndex)=>{const evaRows=evaFilter(St.filter(evaP=>(evaP.group||evaP.type)===evaKey));if(!evaRows.length)return null;const evaOpen=!!evaExp[evaKey],evaShow=evaOpen?evaRows:evaRows.slice(0,5),evaMore=evaRows.length-evaShow.length;evaShow.forEach(evaP=>evaVisible.push(evaP));return React.createElement(React.Fragment,{key:evaKey},(evaIndex>0||Ft)&&React.createElement(Dropdown.Divider,null),React.createElement(Dropdown.Title,null,evaLabels[evaKey]||evaKey),evaShow.map(evaP=>evaItem(evaP)),evaMore>0?React.createElement("div",{key:evaKey+"-more",className:"eva-task-assignee-expand",onMouseDown:evaEvent=>evaEvent.preventDefault(),onClick:evaEvent=>{evaEvent.stopPropagation(),evaSetExp({...evaExp,[evaKey]:!0})}},"展开其余 "+evaMore+(evaKey==="member"?" 位":" 个")):null)});evaLr.current=evaVisible;return React.createElement(Dropdown.Menu,null,St.length>5&&React.createElement("div",{className:"eva-task-assignee-search",onMouseDown:evaEvent=>evaEvent.stopPropagation(),onClick:evaEvent=>evaEvent.stopPropagation()},React.createElement("input",{ref:evaInputRef,placeholder:"搜索",onChange:evaEvent=>{evaEvent.nativeEvent.isComposing||evaSetQ(evaEvent.target.value)},onCompositionEnd:()=>evaSetQ(evaInputRef.current?evaInputRef.current.value:""),onKeyDown:evaKeyDown})),Ft&&!evaNeedle&&React.createElement(Dropdown.Item,{onClick:()=>ut(null,null,null),icon:React.createElement(CircleSlash,{size:13})},gt("loop.assignee.unassigned")),React.createElement("div",{className:"eva-task-assignee-scroll"},evaBody))})()`,
      '面板对齐提及候选规范：搜索、分组、每组 5 条展开、滚动与键盘选择');

    source=root.__evaCut(source,
      'updateIssue=(rt,ct)=>{const ut=issuesOf().find(pt=>pt.id===rt);return ut&&ct.status&&(ut.status=ct.status),Promise.resolve(ut)}',
      String.raw`updateIssue=(rt,ct)=>{const ut=issuesOf().find(pt=>pt.id===rt);if(!ut)return Promise.resolve(ut);const pt={...ct};if(Object.prototype.hasOwnProperty.call(pt,"parent_issue_id")){const mt=pt.parent_issue_id||null;if(mt===ut.id)return Promise.reject(new Error("任务不能成为自己的父任务"));if(mt&&!issuesOf().some(gt=>gt.id===mt))return Promise.reject(new Error("父任务不属于当前项目"));if(mt&&evaIssueDescendantIds(ut.id).has(mt))return Promise.reject(new Error("不能将任务移动到自己的子任务下"));pt.parent_issue_id=mt}if(Object.prototype.hasOwnProperty.call(pt,"source_id")||Object.prototype.hasOwnProperty.call(pt,"creator_id")||Object.prototype.hasOwnProperty.call(pt,"assignee_id")){const pid=ut.workspace_id||currentSpaceId(),store=evaMembers().store,scope=store.snapshot().projects[pid];if(!scope)return Promise.reject(new Error("请先进入已加入的项目"));if(Object.prototype.hasOwnProperty.call(pt,"source_id")){const sid=pt.source_id;if(!sid)return Promise.reject(new Error("来源者不能为空，请重新选择"));const sourceIdentity=evaResolveTaskIdentity(sid,scope);if(!sourceIdentity)return Promise.reject(new Error("来源者必须是联系人、AI 分身或数字员工，请重新选择"));pt.source_id=sid;pt.source_type=sourceIdentity.type;pt.source_name=sourceIdentity.name||""}if(Object.prototype.hasOwnProperty.call(pt,"assignee_id")){const aid=pt.assignee_id;if(aid===null||aid===""){pt.assignee_id=null;pt.assignee_type=null;pt.assignee_name=null}else{const assigneePerson=scope.humans.some(p=>p.id===aid)?store.person(aid):null;if(!assigneePerson)return Promise.reject(new Error("负责人只能是本项目的联系人，请重新选择"));pt.assignee_id=aid;pt.assignee_type="member";pt.assignee_name=assigneePerson.name||""}}if(Object.prototype.hasOwnProperty.call(pt,"creator_id")){const cid=pt.creator_id;if(!cid)return Promise.reject(new Error("创建者不能为空，请重新选择"));const identity=evaResolveTaskIdentity(cid,scope);if(!identity)return Promise.reject(new Error("创建者必须是联系人、AI 分身或数字员工，请重新选择"));pt.creator_id=cid;pt.creator_type=identity.type;pt.creator_name=identity.name||"";pt.creator_avatar=identity.avatar||""}}const mt=["title","description","status","priority","assignee_id","assignee_type","assignee_name","project_id","start_date","due_date","stage","parent_issue_id","source_id","source_type","source_name","creator_id","creator_type","creator_name","creator_avatar"];for(const gt of mt)Object.prototype.hasOwnProperty.call(pt,gt)&&(ut[gt]=gt==="status"?evaNormalizeTaskStatus(pt[gt]):pt[gt]);return ut.updated_at=new Date().toISOString(),Promise.resolve(ut)}`,
      '项目任务更新及父子关系校验');
    source=root.__evaCut(source,
      'batchUpdateIssues=(rt,ct)=>(rt.forEach(ut=>{const pt=issuesOf().find(mt=>mt.id===ut);pt&&Object.assign(pt,ct)}),Promise.resolve({updated:rt.length}))',
      String.raw`batchUpdateIssues=(rt,ct)=>{if(ct.status==="done"){const ut=rt.map(pt=>issuesOf().find(mt=>mt.id===pt)).filter(Boolean).find(pt=>evaIssueChildrenOf(pt.id).some(mt=>mt.status!=="done"&&mt.status!=="cancelled"));if(ut)return Promise.reject(new Error("批量完成前请先处理未完成子任务"))}return Promise.all(rt.map(ut=>updateIssue(ut,ct))).then(()=>({updated:rt.length}))}`,
      '批量更新保留子任务状态边界');
    source=root.__evaCut(source,
      'batchDeleteIssues=rt=>(rt.forEach(ct=>{const ut=issuesOf().findIndex(pt=>pt.id===ct);ut>=0&&issuesOf().splice(ut,1)}),Promise.resolve({deleted:rt.length}))',
      String.raw`batchDeleteIssues=rt=>{const ct=rt.map(ut=>issuesOf().find(pt=>pt.id===ut)).filter(Boolean).find(ut=>evaIssueChildrenOf(ut.id).length);if(ct)return Promise.reject(new Error("请先转移或删除子任务，再删除父任务"));rt.forEach(ut=>{const pt=issuesOf().findIndex(mt=>mt.id===ut);pt>=0&&issuesOf().splice(pt,1)});return Promise.resolve({deleted:rt.length})},
      restoreIssues=rt=>{const ct=issuesOf();rt.forEach(ut=>{ut&&ut.issue&&!ct.some(pt=>pt.id===ut.issue.id)&&ct.splice(Math.min(ut.index,ct.length),0,ut.issue)});return Promise.resolve({restored:rt.length})}`,
      '批量删除阻止遗留孤儿任务');
    source=root.__evaCut(source,
      'deleteIssue=rt=>{const ct=issuesOf().findIndex(ut=>ut.id===rt);return ct>=0&&issuesOf().splice(ct,1),Promise.resolve()}',
      String.raw`deleteIssue=rt=>{if(evaIssueChildrenOf(rt).length)return Promise.reject(new Error("请先转移或删除子任务，再删除父任务"));const ct=issuesOf().findIndex(ut=>ut.id===rt);return ct>=0&&issuesOf().splice(ct,1),Promise.resolve()}`,
      '单任务删除阻止遗留孤儿任务');
    source=root.__evaCut(source,
      'function useRunConfirm(){const{t:rt}=useI18n$1(),[ct,ut]=reactExports.useState(null),pt=Ct=>{Promise.resolve(Ct({})).catch(xt=>Toast.error(xt?.message??rt("loop.toast.saveFailed")))};return{requestAssign:(Ct,xt,Pt,Nt,Mt)=>{const Dt={issueId:Ct.id,status:Ct.status,assigneeType:xt,assigneeId:Pt,assigneeName:Nt,apply:Mt};if(!needsConfirm(Dt)){pt(Mt);return}ut(Dt)},requestStatus:(Ct,xt,Pt)=>{if(!statusMightTrigger(Ct,xt)){pt(Pt);return}ut({issueId:Ct.id,status:xt,assigneeType:Ct.assignee_type,assigneeId:Ct.assignee_id,assigneeName:Ct.assignee_name??null,apply:Pt})},runConfirmModal:React.createElement(RunConfirmModal,{pending:ct,onClose:()=>ut(null)})}}',
      String.raw`function useRunConfirm(){const{t:rt}=useI18n$1(),[ct,ut]=reactExports.useState(null),pt=Ct=>{Promise.resolve(Ct({})).catch(xt=>Toast.error(xt?.message??rt("loop.toast.saveFailed")))};return{requestAssign:(Ct,xt,Pt,Nt,Mt)=>{const evaApply=Dt=>Mt({assignee_name:Nt,...Dt}),Dt={issueId:Ct.id,status:Ct.status,assigneeType:xt,assigneeId:Pt,assigneeName:Nt,apply:evaApply};if(!needsConfirm(Dt)){pt(evaApply);return}ut(Dt)},requestStatus:(Ct,xt,Pt)=>{const evaApplyStatus=()=>{if(!statusMightTrigger(Ct,xt)){pt(Pt);return}ut({issueId:Ct.id,status:xt,assigneeType:Ct.assignee_type,assigneeId:Ct.assignee_id,assigneeName:Ct.assignee_name??null,apply:Pt})},evaIncomplete=xt==="done"?evaIssueChildrenOf(Ct.id).filter(Dt=>Dt.status!=="done"&&Dt.status!=="cancelled"):[];if(evaIncomplete.length){Modal.confirm({title:"仍有 "+evaIncomplete.length+" 项子任务未完成，仍然完成父任务？",content:"父任务完成不会自动完成子任务，子任务状态保持不变。",okText:"仍然完成",cancelText:rt("loop.action.cancel"),centered:!0,onOk:evaApplyStatus});return}evaApplyStatus()},runConfirmModal:React.createElement(RunConfirmModal,{pending:ct,onClose:()=>ut(null)})}}`,
      '完成父任务前提示未完成子任务');
    source=root.__evaCut(source,'function IssueCard(',String.raw`function evaIssueChildrenOf(rt,ct=issuesOf()){return ct.filter(ut=>ut.parent_issue_id===rt)}
function evaIssueParentOf(rt,ct=issuesOf()){return rt?.parent_issue_id?ct.find(ut=>ut.id===rt.parent_issue_id)??null:null}
function evaIssueAncestorChain(rt,ct=issuesOf()){const ut=new Map(ct.map(mt=>[mt.id,mt])),pt=[],mt=new Set(rt?.id?[rt.id]:[]);let gt=rt;while(gt?.parent_issue_id&&!mt.has(gt.parent_issue_id)){const St=ut.get(gt.parent_issue_id);if(!St)break;mt.add(St.id),pt.unshift(St),gt=St}return pt}
function evaIssueBreadcrumbChain(rt,ct=issuesOf(),ut=3){return[...evaIssueAncestorChain(rt,ct),rt].filter(Boolean).slice(-Math.max(1,ut))}
function evaIssueDescendantIds(rt,ct=issuesOf()){const ut=new Set,pt=[rt];while(pt.length){const mt=pt.pop();for(const gt of ct)gt.parent_issue_id===mt&&!ut.has(gt.id)&&(ut.add(gt.id),pt.push(gt.id))}return ut}
function evaIssueDefaultCollapsedIds(rt,ct=issuesOf(),ut=3){const pt=new Set,mt=(gt,St,Ct)=>{for(const xt of evaIssueChildrenOf(gt,ct)){if(Ct.has(xt.id))continue;const Pt=St+1,Nt=evaIssueChildrenOf(xt.id,ct),Mt=new Set(Ct);Mt.add(xt.id),Nt.length&&Pt>=ut?pt.add(xt.id):mt(xt.id,Pt,Mt)}};return mt(rt,0,new Set([rt])),pt}
const EvaHierarchyIcon=createLucideIcon("Network",[["rect",{x:"16",y:"16",width:"6",height:"6",rx:"1",key:"network-right"}],["rect",{x:"2",y:"16",width:"6",height:"6",rx:"1",key:"network-left"}],["rect",{x:"9",y:"2",width:"6",height:"6",rx:"1",key:"network-root"}],["path",{d:"M5 16v-3a1 1 0 0 1 1-1h12a1 1 0 0 1 1 1v3",key:"network-branches"}],["path",{d:"M12 12V8",key:"network-stem"}]]);
function EvaIssueAssignee({issue:rt,size:ct=20,compact:ut=!1}){if(!rt.assignee_id)return React.createElement("span",{className:"eva-issue-assignee is-empty"+(ut?" is-compact":""),title:"负责人：未指派","aria-label":"负责人：未指派"},ut?"—":"未指派");const pt=rt.assignee_type||"member",mt={id:rt.assignee_id,name:rt.assignee_name||"未命名",type:pt},gt="负责人："+mt.name+(pt==="agent"?"（AI）":"");return React.createElement("span",{className:"eva-issue-assignee"+(ut?" is-compact":""),title:gt,"aria-label":ut?gt:void 0},React.createElement(EvaLoopIdentityAvatar,{person:mt,size:ct}),!ut&&React.createElement("span",{className:"eva-issue-assignee__name"},mt.name),!ut&&pt==="agent"&&window.EvaAIIdentity.badge(React.createElement))}
function EvaIssueSourceBadge({issue:rt,size:ct=16}){if(!rt.source_id)return null;const pt=rt.source_type||"member",mt={id:rt.source_id,name:rt.source_name||"未命名",type:pt},gt="来源者："+mt.name+(pt==="agent"?"（AI）":"");return React.createElement("span",{className:"eva-issue-assignee eva-issue-source",title:gt,"aria-label":gt},React.createElement(EvaLoopIdentityAvatar,{person:mt,size:ct}),React.createElement("span",{className:"eva-issue-assignee__name"},mt.name),pt==="agent"&&window.EvaAIIdentity.badge(React.createElement))}
function EvaIssueRelationMeta({issue:rt,variant:ct="card"}){const ut=evaIssueParentOf(rt),pt=evaIssueChildrenOf(rt.id);if(!ut&&!pt.length)return null;const mt=pt.filter(gt=>gt.status==="done").length,gt=pt.length?Math.round(mt/pt.length*100):0;return React.createElement("div",{className:"eva-issue-relation eva-issue-relation--"+ct},ut&&React.createElement("span",{className:"eva-issue-relation__parent"+(pt.length?" has-children":""),title:"父任务："+ut.identifier+" "+ut.title},React.createElement(ChevronRight,{size:12}),React.createElement("span",{className:"eva-issue-relation__label"},"父任务"),React.createElement("strong",{className:"eva-issue-relation__id"},ut.identifier)),pt.length>0&&React.createElement("span",{className:"eva-issue-relation__children",title:"直接子任务已完成 "+mt+" 项，共 "+pt.length+" 项"},React.createElement("span",{className:"eva-issue-relation__label"},"直接子任务"),React.createElement("strong",null,mt," / ",pt.length),React.createElement("span",{className:"eva-issue-relation__track","aria-hidden":!0},React.createElement("span",{style:{width:gt+"%"}}))))}
function EvaIssueDetailSubtaskTree({rootIssue:rt,onOpen:ct,readOnly:ut=!1}){
  const{t:pt}=useI18n$1(),mt=issuesOf(),evaTreeSignature=mt.map(St=>St.id+":"+(St.parent_issue_id||"")).join("|"),[evaCollapsedIds,evaSetCollapsedIds]=reactExports.useState(()=>evaIssueDefaultCollapsedIds(rt.id,mt));
  reactExports.useEffect(()=>evaSetCollapsedIds(evaIssueDefaultCollapsedIds(rt.id,mt)),[rt.id,evaTreeSignature]);
  const gt=(St,Ct,xt)=>{
    if(xt.has(St.id))return null;
    const Pt=evaIssueChildrenOf(St.id,mt),evaExpanded=!evaCollapsedIds.has(St.id),Nt=ISSUE_STATUS_ICON[St.status],Mt=PRIORITY_ICON[St.priority||"none"],Dt=new Set(xt);Dt.add(St.id);
    return React.createElement("div",{key:St.id,className:"eva-loop-subtask-tree__branch"},
      React.createElement("div",{className:"eva-loop-subtask-tree__item",role:"treeitem","aria-level":Ct+1,"aria-expanded":Pt.length?evaExpanded:void 0},
        Pt.length?React.createElement("button",{type:"button",className:"eva-loop-subtask-tree__toggle","aria-label":evaExpanded?"收起 "+St.identifier+" 的子任务":"展开 "+St.identifier+" 的子任务",onClick:()=>evaSetCollapsedIds(Ft=>{const Qt=new Set(Ft);return evaExpanded?Qt.add(St.id):Qt.delete(St.id),Qt})},React.createElement(ChevronRight,{size:13,className:evaExpanded?"is-open":""})):React.createElement("span",{className:"eva-loop-subtask-tree__toggle-spacer"}),
        React.createElement(ut?"div":"button",{type:ut?void 0:"button",className:"loop-subissue",title:St.identifier+" "+St.title,"aria-label":ut?void 0:"打开任务 "+St.identifier+" "+St.title,onClick:ut?void 0:()=>ct(St.id)},
          React.createElement(Nt,{size:14,strokeWidth:2,style:{color:ISSUE_STATUS_HEX[St.status]},"aria-label":pt("loop.status."+St.status)}),
          React.createElement("span",{className:"loop-subissue__id"},St.identifier),
          React.createElement("span",{className:"loop-subissue__title"},St.title),
          React.createElement(EvaIssueAssignee,{issue:St}),
          React.createElement("span",{className:"loop-subissue__priority",title:pt("loop.priority."+(St.priority||"none"))},React.createElement(Mt,{size:14,strokeWidth:2,style:{color:PRIORITY_HEX[St.priority||"none"]}})))),
      evaExpanded&&Pt.length>0&&React.createElement("div",{className:"eva-loop-subtask-tree__children",role:"group"},Pt.map(Ft=>gt(Ft,Ct+1,Dt))));
  },St=evaIssueChildrenOf(rt.id,mt);
  return React.createElement(React.Fragment,null,evaCollapsedIds.size>0&&React.createElement("div",{className:"eva-loop-subtask-tree__depth-note"},React.createElement("span",null,"第 4 层及更深任务已收起"),React.createElement(Button,{theme:"borderless",size:"small",className:"eva-loop-subtask-tree__expand-all",icon:React.createElement(ChevronDown,{size:14}),onClick:()=>evaSetCollapsedIds(new Set)},"展开全部层级")),React.createElement("div",{className:"loop-subissues eva-loop-subtask-tree",role:"tree","aria-label":rt.identifier+" 的全部子任务"},St.map(Ct=>gt(Ct,0,new Set([rt.id])))));
}
function EvaIssueHierarchy({issues:rt,allIssues:ct,onOpen:ut,onCreateChild:pt,running:mt,resetKey:gt}){const{t:St}=useI18n$1(),Ct=reactExports.useMemo(()=>new Set(rt.map(sa=>sa.id)),[rt]),xt=reactExports.useMemo(()=>{const sa=new Map(ct.map(oa=>[oa.id,oa])),ra=new Set(Ct);for(const oa of rt){let la=oa,aa=new Set;while(la?.parent_issue_id&&!aa.has(la.parent_issue_id)){aa.add(la.parent_issue_id);const ma=sa.get(la.parent_issue_id);if(!ma)break;ra.add(ma.id),la=ma}}return ra},[ct,Ct,rt]),Pt=reactExports.useMemo(()=>{const sa=new Map;for(const oa of ct)xt.has(oa.id)&&(sa.has(oa.parent_issue_id)||sa.set(oa.parent_issue_id,[]),sa.get(oa.parent_issue_id).push(oa));return sa},[ct,xt]),Nt=reactExports.useMemo(()=>{const sa=new Set;for(const oa of rt){let ra=ct.find(la=>la.id===oa.parent_issue_id),aa=new Set;while(ra&&!aa.has(ra.id))aa.add(ra.id),sa.add(ra.id),ra=ct.find(la=>la.id===ra.parent_issue_id)}return sa},[ct,rt]),Mt=rt.length!==ct.length,[Dt,Ft]=reactExports.useState({});reactExports.useEffect(()=>Ft({}),[gt,[...Ct].sort().join("|")]);const Qt=(sa,ra)=>Object.prototype.hasOwnProperty.call(Dt,sa)?Dt[sa]:Mt?Nt.has(sa):ra===0,Vt=(sa,ra)=>Ft(la=>({...la,[sa]:!Qt(sa,ra)})),Ht=[],jt=new Set,tn=(sa,ra,la)=>{if(jt.has(sa.id)||la.has(sa.id))return;jt.add(sa.id);const aa=Pt.get(sa.id)||[],evaAllChildren=evaIssueChildrenOf(sa.id,ct),ma=evaAllChildren.filter(ca=>ca.status==="done").length,pa=Qt(sa.id,ra),ha=ISSUE_STATUS_ICON[sa.status],ga=PRIORITY_ICON[sa.priority],Oa=new Set(la);Oa.add(sa.id);Ht.push(React.createElement("div",{key:sa.id,className:"eva-issue-hierarchy__row"+(Ct.has(sa.id)?"":" is-context"),role:"treeitem","aria-level":ra+1,"aria-expanded":aa.length?pa:void 0,style:{"--eva-issue-depth":ra}},React.createElement("div",{className:"eva-issue-hierarchy__task"},aa.length?React.createElement("button",{type:"button",className:"eva-issue-hierarchy__toggle","aria-label":pa?"收起子任务":"展开子任务",onClick:()=>Vt(sa.id,ra)},React.createElement(ChevronRight,{size:14,className:pa?"is-open":""})):React.createElement("span",{className:"eva-issue-hierarchy__toggle-spacer"}),React.createElement(ha,{size:15,strokeWidth:2,style:{color:ISSUE_STATUS_HEX[sa.status]},"aria-label":St("loop.status."+sa.status)}),React.createElement("button",{type:"button",className:"eva-issue-hierarchy__main",onClick:()=>ut(sa.id)},React.createElement("span",{className:"eva-issue-hierarchy__id"},sa.identifier),mt.has(sa.id)&&React.createElement(RunningChip,null),React.createElement("span",{className:"eva-issue-hierarchy__title",title:sa.title},sa.title))),React.createElement("span",{className:"eva-issue-hierarchy__progress"},evaAllChildren.length?"子任务 "+ma+" / "+evaAllChildren.length:"—"),React.createElement("time",{className:"eva-issue-hierarchy__due"+(isOverdue(sa.due_date,sa.status)?" is-overdue":""),title:sa.due_date?"截止 "+formatShortDate(sa.due_date):"未设置截止日期"},sa.due_date?formatShortDate(sa.due_date):"未设置"),React.createElement(EvaIssueAssignee,{issue:sa}),React.createElement("span",{className:"eva-issue-hierarchy__priority",title:St("loop.priority."+sa.priority)},React.createElement(ga,{size:15,strokeWidth:2,style:{color:PRIORITY_HEX[sa.priority]}})),React.createElement("button",{type:"button",className:"eva-issue-hierarchy__add","aria-label":"为 "+sa.identifier+" 新建子任务",title:"新建子任务",onClick:ca=>{ca.stopPropagation(),pt(sa)}},React.createElement(Plus$c,{size:15}))));pa&&aa.forEach(ca=>tn(ca,ra+1,Oa))},Kt=ct.filter(sa=>xt.has(sa.id)&&(!sa.parent_issue_id||!xt.has(sa.parent_issue_id)));Kt.forEach(sa=>tn(sa,0,new Set));return React.createElement("div",{className:"eva-issue-hierarchy",role:"tree","aria-label":"任务层级"},React.createElement("div",{className:"eva-issue-hierarchy__head","aria-hidden":!0},React.createElement("span",null,"任务"),React.createElement("span",null,"进度"),React.createElement("span",null,"截止日期"),React.createElement("span",null,"负责人"),React.createElement("span",null,"优先级"),React.createElement("span",null)),Ht)}
function IssueCard(`,'任务父子关系组件与层级视图');
    const evaIssueCardStart=source.indexOf('function IssueCard('),evaIssueCardEnd=source.indexOf('const{Text:Text$d}=Typography;',evaIssueCardStart);
    if(evaIssueCardStart<0||evaIssueCardEnd<evaIssueCardStart)throw new Error('IssueCard 组件边界不匹配');
    source=root.__evaCut(source,source.slice(evaIssueCardStart,evaIssueCardEnd),String.raw`function IssueCard({issue:rt,onOpen:ct,running:ut,showRelation:pt=!0,draggable:mt,dragging:gt,onDragStart:St,onDragEnd:Ct}){
      const{t:xt,format:Pt}=useI18n$1(),Nt=PRIORITY_ICON[rt.priority],Mt=ISSUE_STATUS_ICON[rt.status],Dt=()=>ct(rt.id);
      return React.createElement("div",{className:"loop-card "+(gt?"is-dragging":""),draggable:mt,tabIndex:0,onDragStart:St,onDragEnd:Ct,onClick:Dt,onKeyDown:Ft=>{Ft.target===Ft.currentTarget&&(Ft.key==="Enter"||Ft.key===" ")&&(Ft.preventDefault(),Dt())}},
        React.createElement("div",{className:"loop-card__top"},React.createElement("span",{className:"loop-card__icon",title:xt("loop.priority."+rt.priority)},React.createElement(Nt,{size:14,strokeWidth:2,style:{color:PRIORITY_HEX[rt.priority]}})),React.createElement("span",{className:"loop-card__icon",title:xt("loop.status."+rt.status)},React.createElement(Mt,{size:14,strokeWidth:2,style:{color:ISSUE_STATUS_HEX[rt.status]}})),React.createElement("span",{className:"loop-card__id"},rt.identifier),ut&&React.createElement(RunningChip,null),React.createElement("time",{className:"loop-card__time"},formatRelativeTime$1(rt.updated_at??rt.created_at,Pt))),
        React.createElement("div",{className:"loop-card__title"},rt.title),
        pt&&React.createElement(EvaIssueRelationMeta,{issue:rt}),
        rt.labels&&rt.labels.length>0&&React.createElement("div",{className:"loop-card__labels"},React.createElement(LabelChips,{labels:rt.labels,max:3})),
        React.createElement("div",{className:"loop-card__foot"},rt.project_name&&React.createElement("span",{className:"loop-card__project"},rt.project_name),rt.due_date&&React.createElement("span",{className:"loop-card__due",style:{color:isOverdue(rt.due_date,rt.status)?"var(--semi-color-danger, #f5222d)":"var(--semi-color-text-2, #8590a6)"}},React.createElement(CalendarClock,{size:12}),formatShortDate(rt.due_date)),React.createElement("span",{className:"loop-card__spacer"}),React.createElement("span",{className:"loop-card__spacer"}),React.createElement(EvaIssueSourceBadge,{issue:rt}),React.createElement(AssigneeBadge,{type:rt.assignee_type,name:rt.assignee_name??null})));
    }`,'任务卡支持按视图控制轻量父子关系提示');

    const evaIssueBoardStart=source.indexOf('function IssueBoard('),evaIssueBoardEnd=source.indexOf('function IssueGroupBoard(',evaIssueBoardStart);
    if(evaIssueBoardStart<0||evaIssueBoardEnd<evaIssueBoardStart)throw new Error('IssueBoard 组件边界不匹配');
    source=root.__evaCut(source,source.slice(evaIssueBoardStart,evaIssueBoardEnd),String.raw`function IssueBoard({issues:rt,onOpen:ct,onChanged:ut,running:pt}){
      const{t:mt}=useI18n$1(),{requestStatus:gt,runConfirmModal:St}=useRunConfirm(),[Ct,xt]=reactExports.useState(null),[Pt,Nt]=reactExports.useState(null),Mt=Dt=>{Nt(null);const Ft=Ct;if(xt(null),!Ft)return;const Qt=rt.find(Vt=>Vt.id===Ft);!Qt||Qt.status===Dt||gt(Qt,Dt,async Vt=>{await updateIssue(Ft,{status:Dt,...Vt}),ut()})};
      return React.createElement("div",{className:"loop-board"},
        ISSUE_STATUS_ORDER.map(Dt=>{
          const Ft=rt.filter(Qt=>Qt.status===Dt),Vt=ISSUE_STATUS_ICON[Dt];
          return React.createElement("div",{key:Dt,className:"loop-board__col "+(Pt===Dt?"is-drop":""),onDragOver:Qt=>{Qt.preventDefault(),Pt!==Dt&&Nt(Dt)},onDragLeave:Qt=>{Qt.currentTarget.contains(Qt.relatedTarget)||Nt(Ht=>Ht===Dt?null:Ht)},onDrop:()=>Mt(Dt)},
            React.createElement("div",{className:"loop-board__col-head"},React.createElement(Vt,{size:14,strokeWidth:2,style:{color:ISSUE_STATUS_HEX[Dt]}}),React.createElement("span",{className:"loop-board__col-name"},mt("loop.status."+Dt)),React.createElement("em",null,Ft.length)),
            React.createElement("div",{className:"loop-board__cards"},Ft.map(Qt=>React.createElement(IssueCard,{key:Qt.id,issue:Qt,onOpen:ct,running:pt?.has(Qt.id),showRelation:!1,draggable:!0,dragging:Ct===Qt.id,onDragStart:()=>xt(Qt.id),onDragEnd:()=>{xt(null),Nt(null)}})))
          )
        }),
        St
      );
    }`,'看板将全部任务按自身状态平铺为独立卡片');

    const evaIssueGroupStart=source.indexOf('function IssueGroupBoard('),evaIssueGroupEnd=source.indexOf('function confirmDelete(',evaIssueGroupStart);
    if(evaIssueGroupStart<0||evaIssueGroupEnd<evaIssueGroupStart)throw new Error('IssueGroupBoard 组件边界不匹配');
    source=root.__evaCut(source,source.slice(evaIssueGroupStart,evaIssueGroupEnd),String.raw`function IssueGroupBoard({groups:rt,onOpen:ct,running:ut}){const{t:pt}=useI18n$1();return React.createElement("div",{className:"loop-groupboard"},rt.map(mt=>React.createElement("section",{key:mt.id,className:"loop-groupboard__group","aria-label":(mt.assignee_name||pt("loop.assignee.unassigned"))+"的任务"},React.createElement("div",{className:"loop-groupboard__head"},mt.assignee_type?React.createElement(AssigneeBadge,{type:mt.assignee_type,name:mt.assignee_name??null}):React.createElement("span",{className:"loop-assignee-empty"},pt("loop.assignee.unassigned")),React.createElement("em",null,mt.total," 项任务")),React.createElement("div",{className:"loop-groupboard__cards"},mt.issues.map(gt=>React.createElement(IssueCard,{key:gt.id,issue:gt,onOpen:ct,running:ut?.has(gt.id)}))))))}`,'分组视图展示明确的任务计数与父子关系');

    const evaIssueListStart=source.indexOf('function IssueList('),evaIssueListEnd=source.indexOf('const listSubscribers=',evaIssueListStart);
    if(evaIssueListStart<0||evaIssueListEnd<evaIssueListStart)throw new Error('IssueList 组件边界不匹配');
    source=root.__evaCut(source,source.slice(evaIssueListStart,evaIssueListEnd),String.raw`function IssueList({issues:rt,onOpen:ct,onChanged:ut,running:pt}){const{t:mt,format:gt}=useI18n$1(),{requestAssign:St,runConfirmModal:Ct}=useRunConfirm(),[xt,Pt]=reactExports.useState([]),[Nt,Mt]=reactExports.useState(!1),Dt=reactExports.useRef(!1),Ft=reactExports.useRef(!1),Qt=async(Kt,nn)=>{await updateIssue(Kt,nn),ut()};reactExports.useEffect(()=>{Pt(Kt=>{const nn=new Set(rt.map(ln=>ln.id)),rn=Kt.filter(ln=>nn.has(ln));return rn.length===Kt.length?Kt:rn})},[rt]);const Vt=reactExports.useMemo(()=>ISSUE_STATUS_ORDER.map(Kt=>({status:Kt,rows:rt.filter(nn=>nn.status===Kt)})).filter(Kt=>Kt.rows.length>0),[rt]),Ht=new Set(xt),jt=Kt=>Pt(nn=>nn.includes(Kt)?nn.filter(rn=>rn!==Kt):[...nn,Kt]),tn=async Kt=>{if(!Dt.current){Dt.current=!0,Mt(!0);try{await Kt(),Toast.success(mt("loop.batch.done")),Pt([]),ut()}catch(nn){Toast.error(nn.message||mt("loop.toast.saveFailed"))}finally{Dt.current=!1,Mt(!1)}}};return React.createElement(React.Fragment,null,xt.length>0&&React.createElement("div",{className:"loop-batchbar"},React.createElement("strong",null,mt("loop.batch.selected",{values:{count:xt.length}})),React.createElement(Select,{placeholder:mt("loop.menu.changeStatus"),size:"small",disabled:Nt,value:NO_VALUE,dropdownClassName:"loop-fields__dropdown",onChange:Kt=>tn(()=>batchUpdateIssues(xt,{status:Kt,suppress_run:!0})),style:{width:130}},ISSUE_STATUS_ORDER.map(Kt=>React.createElement(Select.Option,{key:Kt,value:Kt},mt("loop.status."+Kt)))),React.createElement(Select,{placeholder:mt("loop.menu.changePriority"),size:"small",disabled:Nt,value:NO_VALUE,dropdownClassName:"loop-fields__dropdown",onChange:Kt=>tn(()=>batchUpdateIssues(xt,{priority:Kt,suppress_run:!0})),style:{width:120}},PRIORITY_ORDER.map(Kt=>React.createElement(Select.Option,{key:Kt,value:Kt},mt("loop.priority."+Kt)))),React.createElement(AssigneePicker,{size:"small",value:null,valueName:null,onChange:(Kt,nn)=>tn(()=>batchUpdateIssues(xt,{assignee_id:Kt,assignee_type:nn,suppress_run:!0}))}),React.createElement(Button,{size:"small",type:"danger",theme:"borderless",icon:React.createElement(Trash2,{size:14}),disabled:Nt,onClick:()=>{if(Ft.current)return;Ft.current=!0;const Kt=xt;confirmDelete({title:mt("loop.batch.deleteConfirm",{values:{count:Kt.length}}),okText:mt("loop.action.delete"),cancelText:mt("loop.action.cancel"),onOk:async()=>{try{await tn(()=>batchDeleteIssues(Kt))}finally{Ft.current=!1}},onCancel:()=>{Ft.current=!1}})}},mt("loop.action.delete")),React.createElement(Button,{size:"small",theme:"borderless",icon:React.createElement(X,{size:14}),onClick:()=>Pt([]),"aria-label":mt("loop.action.cancel")})),React.createElement("div",{className:"loop-list"},Vt.map(Kt=>{const nn=ISSUE_STATUS_ICON[Kt.status];return React.createElement("section",{key:Kt.status,className:"loop-list__group","aria-label":mt("loop.status."+Kt.status)+"任务"},React.createElement("div",{className:"loop-list__group-head"},React.createElement(nn,{size:14,strokeWidth:2,style:{color:ISSUE_STATUS_HEX[Kt.status]}}),React.createElement("span",{className:"loop-list__group-name"},mt("loop.status."+Kt.status)),React.createElement("em",null,Kt.rows.length," 项任务")),Kt.rows.map(rn=>{const ln=PRIORITY_ICON[rn.priority],sn=Ht.has(rn.id),evaChildren=evaIssueChildrenOf(rn.id),evaRelationClass=(rn.parent_issue_id?" is-subtask":"")+(evaChildren.length?" has-subtasks":"");return React.createElement("div",{key:rn.id,className:"loop-list__row "+(sn?"is-selected":"")+evaRelationClass},React.createElement("span",{className:"loop-list__check",onClick:cn=>cn.stopPropagation()},React.createElement(Checkbox,{"aria-label":"选择任务 "+rn.identifier,checked:sn,onChange:()=>jt(rn.id)})),React.createElement("span",{className:"loop-list__icon",title:mt("loop.priority."+rn.priority)},React.createElement(ln,{size:14,strokeWidth:2,style:{color:PRIORITY_HEX[rn.priority]}})),React.createElement("span",{className:"loop-list__id"},rn.identifier),React.createElement("div",{className:"eva-loop-list__task"},React.createElement("button",{className:"loop-list__title",onClick:()=>ct(rn.id)},rn.title,pt?.has(rn.id)&&React.createElement(RunningChip,null)),React.createElement(EvaIssueRelationMeta,{issue:rn,variant:"list"})),React.createElement(LabelChips,{labels:rn.labels,max:2}),rn.due_date&&React.createElement("time",{className:"loop-list__due"+(isOverdue(rn.due_date,rn.status)?" is-overdue":""),title:"截止 "+formatShortDate(rn.due_date)},React.createElement(CalendarClock,{size:12}),formatShortDate(rn.due_date)),React.createElement("span",{className:"loop-list__assignee",onClick:cn=>cn.stopPropagation()},React.createElement(AssigneePicker,{size:"small",value:rn.assignee_id,valueName:rn.assignee_name??null,onChange:(cn,Cn,ir)=>St(rn,Cn,cn,ir,sr=>Qt(rn.id,{...sr}))})),React.createElement("time",{className:"loop-list__time"},formatRelativeTime$1(rn.updated_at??rn.created_at,gt)))}))})),Ct)}`,'列表视图展示父任务标识、截止日期与直接子任务进度');

    source=root.__evaCut(source,
      'React.createElement(AssigneePicker,{size:"small",value:null,valueName:null,onChange:(Kt,nn)=>tn(()=>batchUpdateIssues(xt,{assignee_id:Kt,assignee_type:nn,suppress_run:!0}))})',
      'React.createElement(AssigneePicker,{size:"small",value:null,valueName:null,onChange:(Kt,nn)=>tn(()=>batchUpdateIssues(xt,{assignee_id:Kt,assignee_type:nn,suppress_run:!0}))})',
      '任务批量负责人选择器开启搜索');
    source=root.__evaCut(source,
      'React.createElement(AssigneePicker,{size:"small",value:rn.assignee_id,valueName:rn.assignee_name??null,onChange:(cn,Cn,ir)=>St(rn,Cn,cn,ir,sr=>Qt(rn.id,{...sr}))})',
      'React.createElement(AssigneePicker,{size:"small",value:rn.assignee_id,valueName:rn.assignee_name??null,onChange:(cn,Cn,ir)=>St(rn,Cn,cn,ir,sr=>Qt(rn.id,{...sr}))})',
      '任务列表负责人选择器开启搜索');

    // 关联父任务选择器（命令式弹窗 + Semi Select 下拉搜索）。候选 = 同项目、
    // 非自身、非自身后代的任务；选定后交给详情的 Ta（其内部走 updateIssue 的
    // parent_issue_id 环路/跨项目校验并自带保存/失败 Toast）。
    source=root.__evaCut(source,'const EvaHierarchyIcon=createLucideIcon("Network",',
      String.raw`const EvaLinkIcon=createLucideIcon("link",[["path",{d:"M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71",key:"a"}],["path",{d:"M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71",key:"b"}]]);
const EvaExpandIcon=createLucideIcon("maximize-2",[["path",{d:"M15 3h6v6",key:"a"}],["path",{d:"M9 21H3v-6",key:"b"}],["path",{d:"M21 3l-7 7",key:"c"}],["path",{d:"M3 21l7-7",key:"d"}]]);
const EvaCollapseIcon=createLucideIcon("minimize-2",[["path",{d:"M4 14h6v6",key:"a"}],["path",{d:"M20 10h-6V4",key:"b"}],["path",{d:"M14 10l7-7",key:"c"}],["path",{d:"M3 21l7-7",key:"d"}]]);
function EvaParentPickerBody({issue:rt,initial:ct,onPick:ut}){const[pt,mt]=reactExports.useState(ct??null),gt=reactExports.useMemo(()=>{const Ct=issuesOf(),xt=evaIssueDescendantIds(rt.id);return Ct.filter(Pt=>Pt.id!==rt.id&&!xt.has(Pt.id)&&Pt.project_id===rt.project_id).sort((Pt,Nt)=>Pt.identifier<Nt.identifier?-1:Pt.identifier>Nt.identifier?1:0)},[rt.id]);return React.createElement("div",{className:"eva-parent-picker"},React.createElement(Select,{filter:(Ct,xt)=>{const Pt=gt.find(Nt=>Nt.id===xt.value);return Pt?(Pt.identifier+" "+Pt.title).toLowerCase().includes(String(Ct).trim().toLowerCase()):!1},style:{width:"100%"},placeholder:"搜索任务标识或标题",value:pt,showClear:!0,dropdownClassName:"loop-fields__dropdown eva-parent-picker__dropdown",emptyContent:gt.length?void 0:"当前项目暂无其它任务可作为父任务",onChange:Ct=>{mt(Ct??null),ut(Ct??null)}},gt.map(Ct=>React.createElement(Select.Option,{key:Ct.id,value:Ct.id,showTick:!0},React.createElement("span",{className:"eva-parent-picker__opt"},React.createElement("span",{className:"eva-parent-picker__id"},Ct.identifier),React.createElement("span",{className:"eva-parent-picker__title"},Ct.title))))))}
function evaOpenParentPicker(rt,ct){if(!rt)return;let ut=rt.parent_issue_id??null;Modal.confirm({title:"关联父任务",icon:null,centered:!0,okText:"确定",cancelText:"取消",className:"eva-parent-picker-modal",content:React.createElement(EvaParentPickerBody,{issue:rt,initial:ut,onPick:pt=>{ut=pt}}),onOk:()=>ct({parent_issue_id:ut??null})})}
const EvaHierarchyIcon=createLucideIcon("Network",`,'注入关联父任务选择器');

    // 抽屉顶栏动作区：去掉「看板」文字按钮，改为 [更多菜单][全屏切换][关闭] 三枚
    // 图标按钮，关闭置于最右。全屏切换在 .collab-route-right.eva-route-drawer 上
    // 切换 .eva-drawer-expanded（面板铺满），图标随态由 CSS 切换。
    source=root.__evaCut(source,
      'React.createElement(Button,{className:"loop-idp__boardbtn",theme:"borderless",onClick:Qa},St("loop.detail.board")),React.createElement(Dropdown,{trigger:"click",position:"bottomRight",render:mi(),clickToHide:!0},React.createElement(Button,{icon:React.createElement(Ellipsis,{size:18}),theme:"borderless","aria-label":"more"}))',
      String.raw`React.createElement(Dropdown,{trigger:"click",position:"bottomRight",clickToHide:!0,getPopupContainer:()=>document.querySelector(".collab-route-right.eva-route-drawer .panel")||document.body,render:React.createElement(Dropdown.Menu,null,React.createElement(Dropdown.Item,{icon:React.createElement(EvaLinkIcon,{size:13}),onClick:()=>evaOpenParentPicker(xt,Ta)},"关联父任务"),React.createElement(Dropdown.Divider,null),React.createElement(Dropdown.Item,{type:"danger",icon:React.createElement(Trash2,{size:13}),onClick:Aa},St("loop.menu.deleteIssue")))},React.createElement("span",{className:"loop-idp__morewrap"},React.createElement(Button,{className:"loop-idp__morebtn",icon:React.createElement(Ellipsis,{size:18}),theme:"borderless","aria-label":"更多操作"}))),React.createElement(Button,{className:"loop-idp__fsbtn",theme:"borderless","aria-label":"切换全屏",onClick:()=>{var el=document.querySelector(".collab-route-right.eva-route-drawer");el&&el.classList.toggle("eva-drawer-expanded")},icon:React.createElement("span",{className:"eva-fs-ico"},React.createElement(EvaExpandIcon,{size:16,className:"eva-fs-ico__enter"}),React.createElement(EvaCollapseIcon,{size:16,className:"eva-fs-ico__exit"}))}),React.createElement(Button,{className:"loop-idp__closebtn",theme:"borderless","aria-label":"关闭",onClick:Qa,icon:React.createElement(X,{size:18})})`,
      '任务详情抽屉顶栏改为全屏与关闭图标按钮');

    // 折叠菜单只保留两项：关联父任务、删除（删除沿用既有 confirmDelete 模态 Aa）。
    source=root.__evaCut(source,
      'mi=()=>React.createElement(Dropdown.Menu,null,React.createElement(Dropdown.Item,{icon:React.createElement(SlidersHorizontal,{size:13}),onClick:()=>{Xa(),rn(!0)}},St("loop.menu.editProps")),React.createElement(Dropdown.Item,{icon:React.createElement(Plus$c,{size:13}),onClick:()=>Kt(!0)},St("loop.subIssue.create")),React.createElement(Dropdown.Divider,null),ai?ni?Ia:qa:React.createElement(React.Fragment,null,qa,Ia),React.createElement(Dropdown.Divider,null),React.createElement(Dropdown.Item,{type:"danger",icon:React.createElement(Trash2,{size:13}),onClick:Aa},St("loop.menu.deleteIssue")))',
      String.raw`mi=()=>React.createElement(Dropdown.Menu,null,React.createElement(Dropdown.Item,{icon:React.createElement(EvaLinkIcon,{size:13}),onClick:()=>evaOpenParentPicker(xt,Ta)},"关联父任务"),React.createElement(Dropdown.Divider,null),React.createElement(Dropdown.Item,{type:"danger",icon:React.createElement(Trash2,{size:13}),onClick:Aa},St("loop.menu.deleteIssue")))`,
      '折叠菜单精简为关联父任务与删除');

    source=root.__evaCut(source,'case"channels":return React.createElement(ChannelsView,{onOpenTask:', 'case"channels":return React.createElement(ChannelsView,{key:rt.id,membershipProjectId:rt.id,onManageProject:()=>Pt("settings"),onOpenTask:', '项目 IM 成员上下文');
    source=root.__evaCut(source,'SpaceFrame=({space:rt,spaces:ct,onSwitch:ut})=>{const[pt,mt]=reactExports.useState("tasks")',
      'SpaceFrame=({space:rt,spaces:ct,onSwitch:ut})=>{const evaProjectMemberStore=evaMembers().store,evaProjectMemberRevision=reactExports.useSyncExternalStore(evaProjectMemberStore.subscribe,evaProjectMemberStore.getSnapshot),evaProjectActor=evaProjectMemberStore.snapshot().actorId,evaInitialProjectTab=new URLSearchParams(useLocation().search).get("evaTab");const[pt,mt]=reactExports.useState(evaInitialProjectTab==="files"?"files":"tasks")','项目内容访问状态');
    source=root.__evaCut(source,'Dt=reactExports.useMemo(()=>{switch(pt){case"tasks":return React.createElement(IssuePage',
      'Dt=reactExports.useMemo(()=>{if(!evaProjectMemberStore.canRead(rt.id,evaProjectActor))return React.createElement(MembersTab,{key:rt.id,workspaceId:rt.id});switch(pt){case"tasks":return React.createElement(IssuePage','未加入项目显示访问限制');
    source=root.__evaCut(source,'}},[pt,xt]);return React.createElement("div",{className:"collab-frame',
      '}},[pt,xt,rt.id,evaProjectMemberRevision]);reactExports.useEffect(()=>{const Ft=Qt=>{const Nt=Qt.detail||{};Nt.projectId===rt.id&&Nt.tab&&mt(Nt.tab)};return window.addEventListener("eva:open-project-view",Ft),()=>window.removeEventListener("eva:open-project-view",Ft)},[rt.id]);return React.createElement("div",{className:"collab-frame','项目成员变更刷新内容与批注页签恢复');
    source=root.__evaCut(source,'React.createElement("div",{className:"collab-frame eva-channel-surface","data-eva-channel-surface":"project"}',
      'React.createElement("div",{className:"collab-frame eva-channel-surface eva-space-card-foundation",style:{"--eva-space-card-accent":window.EvaProjectAppearance.css(rt).accent,"--eva-space-card-surface":window.EvaProjectAppearance.css(rt).surface,"--eva-space-card-border":window.EvaProjectAppearance.css(rt).border},"data-eva-channel-surface":"project","data-eva-project-id":rt.id,"data-eva-project-tab":pt}','项目批注定位上下文');
    source=root.__evaCut(source,'function SettingsPage({workspace:rt,onUpdated:ct}){','function SettingsPage({workspace:rt,onUpdated:ct,initialTab:evaInitialSettingsTab="general"}){','设置默认标签参数');
    source=root.__evaCut(source,'return rt?React.createElement("div",{className:"loop-page"},React.createElement("div",{className:"loop-page__body"},React.createElement(Tabs,{type:"line"}','return rt?React.createElement("div",{className:"loop-page eva-project-settings"},React.createElement("div",{className:"loop-page__body"},React.createElement(Tabs,{type:"line"}','项目设置五页签共享根作用域');
    source=root.__evaCut(source,'React.createElement(Tabs,{type:"line"},React.createElement(TabPane,{tab:"通用"','React.createElement(Tabs,{type:"line",defaultActiveKey:evaInitialSettingsTab},React.createElement(TabPane,{tab:"通用"','设置标签初始化');
    source=root.__evaCut(source,'case"settings":return React.createElement(SettingsPage,{workspace:{...WORKSPACE','case"settings":return React.createElement(SettingsPage,{key:evaTaskLocation.key,initialTab:new URLSearchParams(evaTaskLocation.search).get("evaSettingsTab")==="members"?"members":"general",workspace:{...WORKSPACE','项目设置默认基本信息');
    source=root.__evaCut(source,'toEntry=rt=>({id:rt.id,space_id:', 'toEntry=rt=>({...rt,id:rt.id,space_id:','文件视图保留来源元数据');
    source=root.__evaCut(source,'source:"user-upload",owner_uid:"u-wangyilin",updated_at:rt.updated_at','source:rt.source??"user-upload",owner_uid:"u-wangyilin",updated_at:rt.updated_at','文件来源不被通用转换覆盖');
    source=root.__evaCut(source,'FilesView=()=>{const[rt,ct]=reactExports.useState(driveEntriesOf()),',
      'FilesView=()=>{const evaFileContext=evaMembers(),evaFileProjectId=currentSpaceId(),evaFileActor=evaFileContext.store.snapshot().actorId,evaFileRevision=reactExports.useSyncExternalStore(evaFileContext.files.subscribe,evaFileContext.files.getSnapshot),evaFileRole=evaFileContext.files.role(evaFileProjectId,evaFileActor)||"editor",evaCanDelete=evaFileContext.files.can("trash",evaFileProjectId,evaFileActor),evaCanViewTrash=evaFileContext.files.can("view-trash",evaFileProjectId,evaFileActor),evaUploadInput=reactExports.useRef(null),[evaFilePreview,setEvaFilePreview]=reactExports.useState(null),[evaTrashOpen,setEvaTrashOpen]=reactExports.useState(false),rt=reactExports.useMemo(()=>evaFileContext.files.list(evaFileProjectId,evaFileActor),[evaFileRevision,evaFileProjectId,evaFileActor]),evaTrashEntries=reactExports.useMemo(()=>evaCanViewTrash?evaFileContext.files.trashList(evaFileProjectId,evaFileActor):[],[evaFileRevision,evaFileProjectId,evaFileActor,evaCanViewTrash]),evaPreviewEntry=async evaEntry=>{const url=await demoFileUrl(evaEntry.name);setEvaFilePreview({...evaEntry,url,extension:evaEntry.extension||evaEntry.name.split(".").pop()})};const', '项目文件读取统一文件数据层');
    source=root.__evaCut(source,'nn=(sr,pr)=>ct(mr=>mr.map(dr=>dr.id===sr?{...dr,...pr}:dr)),','nn=(sr,pr)=>{pr.name!==undefined&&evaFileContext.files.rename(evaFileActor,sr,pr.name);pr.parent_id!==undefined&&evaFileContext.files.move(evaFileActor,sr,pr.parent_id)},','项目文件重命名与移动写回统一数据层');
    source=root.__evaCut(source,'Cn=async sr=>(ct(pr=>[{id:rn(),parent_id:ut,name:sr,type:"folder",size:0,updated_at:ln(),creator:"王宜林",editor:"未编辑过"},...pr]),Mt(!1),!0),','Cn=async sr=>(evaFileContext.files.createFolder(evaFileActor,evaFileProjectId,sr,ut),Mt(!1),!0),','项目文件新建文件夹写回统一数据层');
    source=root.__evaCut(source,'className:"loop-page",style:{height:"100%"}},React.createElement("div",{className:"loop-page__head collab-drive-head"}',
      'className:"loop-page",style:{height:"100%"}},React.createElement(Modal,{className:"eva-members-modal",title:evaFilePreview?.name||"文件预览",width:900,visible:!!evaFilePreview,footer:null,onCancel:()=>setEvaFilePreview(null)},evaFilePreview&&React.createElement("div",{className:"eva-project-file-preview"},evaFilePreview.sharedVersion&&React.createElement("p",{className:"eva-members-notice"},"项目共享版本 v",evaFilePreview.sourceVersion," · 来源：",evaFilePreview.source.groupName,evaFilePreview.source.threadName?" / 子区 "+evaFilePreview.source.threadName:"",evaFilePreview.source.taskId?" / 任务 "+evaFilePreview.source.taskId:"","。访问此文件不会获得来源群的聊天权限。"),React.createElement(FilePreviewHost,{file:evaFilePreview,onClose:()=>setEvaFilePreview(null)}))),React.createElement("div",{className:"loop-page__head collab-drive-head"}', '项目文件预览复用组件');
    source=root.__evaCut(source,'ir=rt.filter(sr=>sr.type==="folder");return React.createElement',
      'ir=rt.filter(sr=>sr.type==="folder"),evaTrashModal=React.createElement(Modal,{className:"eva-members-modal",title:"回收站",width:760,visible:evaTrashOpen,footer:null,onCancel:()=>setEvaTrashOpen(false)},evaTrashEntries.length?React.createElement("div",{className:"eva-file-trash-list"},evaTrashEntries.map(evaEntry=>React.createElement("div",{className:"eva-file-trash-row",key:evaEntry.id},React.createElement("div",null,React.createElement("strong",null,evaEntry.name),React.createElement("small",null,"删除时间：",formatTime(evaEntry.deletedAt))),React.createElement("div",null,React.createElement(Button,{theme:"borderless",onClick:()=>evaFileContext.files.restore(evaFileActor,evaEntry.id)},"恢复"),React.createElement(Button,{theme:"borderless",type:"danger",onClick:()=>Modal.confirm({title:`永久删除「${evaEntry.name}」？`,content:"永久删除后不可恢复。",okText:"永久删除",cancelText:"取消",okButtonProps:{type:"danger"},onOk:()=>evaFileContext.files.removeForever(evaFileActor,evaEntry.id)})},"永久删除"))))):React.createElement("div",{className:"drive-file-list__center drive-file-list__empty"},"回收站为空"));return React.createElement','项目文件回收站内容');
    source=root.__evaCut(source,'React.createElement(FilePreviewHost,{file:evaFilePreview,onClose:()=>setEvaFilePreview(null)}))),React.createElement("div",{className:"loop-page__head collab-drive-head"}',
      'React.createElement(FilePreviewHost,{file:evaFilePreview,onClose:()=>setEvaFilePreview(null)}))),evaTrashModal,React.createElement("div",{className:"loop-page__head collab-drive-head"}','项目文件挂载回收站');
    source=root.__evaCut(source,'React.createElement("button",{className:"loop-toolbtn",onClick:()=>Mt(!0)},React.createElement(FolderPlus,{size:14})," 新建文件夹"),React.createElement("button",{className:"loop-btn loop-btn--primary"},React.createElement(Upload,{size:14})," 上传文件")',
      'React.createElement("span",{className:"eva-file-role-badge",title:"项目文件权限角色"},evaFileRole==="owner"?"Owner · 项目负责人":evaFileRole==="manager"?"Manager · 项目管理员":"Editor · 项目成员"),evaCanViewTrash&&React.createElement("button",{className:"loop-toolbtn",onClick:()=>setEvaTrashOpen(true)},"回收站"),React.createElement("button",{className:"loop-toolbtn",onClick:()=>Mt(!0)},React.createElement(FolderPlus,{size:14})," 新建文件夹"),React.createElement("input",{ref:evaUploadInput,type:"file",multiple:!0,hidden:!0,onChange:evaEvent=>{Array.from(evaEvent.target.files||[]).forEach(evaFile=>evaFileContext.files.upload(evaFileActor,evaFileProjectId,evaFile,ut));evaEvent.target.value=""}}),React.createElement("button",{className:"loop-btn loop-btn--primary",onClick:()=>evaUploadInput.current?.click()},React.createElement(Upload,{size:14})," 上传文件")','项目文件角色提示、回收站与本地上传');
    source=root.__evaCut(source,'onCopy:sr=>{const pr=rt.find(mr=>mr.id===sr.id);pr&&ct(mr=>[{...pr,id:rn(),name:`${pr.name.replace(/(\\.[^.]+)?$/," 副本$1")}`,updated_at:ln()},...mr])},onDelete:sr=>Modal.confirm({title:`删除「${sr.name}」？`,content:"删除后不可恢复。",okText:"删除",cancelText:"取消",okButtonProps:{type:"danger"},onOk:()=>ct(pr=>pr.filter(mr=>mr.id!==sr.id&&mr.parent_id!==sr.id))})',
      'onCopy:sr=>evaFileContext.files.copy(evaFileActor,sr.id),onDelete:sr=>Modal.confirm({title:`将「${sr.name}」移至回收站？`,content:"Owner 或 Manager 可从回收站恢复。",okText:"移至回收站",cancelText:"取消",okButtonProps:{type:"danger"},onOk:()=>evaFileContext.files.trash(evaFileActor,sr.id)})','项目文件复制与删除权限动作');
    source=root.__evaCut(source,'entries:Kt,loading:!1,onOpenFolder:sn,onOpenDoc:()=>{}','entries:Kt,loading:!1,onOpenFolder:sn,onOpenDoc:evaPreviewEntry,onOpenFile:evaPreviewEntry','项目文件打开预览');
    source=root.__evaCut(source,'onShare:()=>{},onDownload:()=>{},canDownload:!1,canEdit:!0,canShare:!1','onShare:()=>{},onDownload:async evaEntry=>downloadFile(await demoFileUrl(evaEntry.name),evaEntry.name),canDownload:!0,canEdit:!0,canDelete:evaCanDelete,canShare:!1','项目文件下载与删除能力');
    var fileListStart=source.indexOf('function FileList({'),fileListEnd=source.indexOf('function Breadcrumb({',fileListStart);
    if(fileListStart<0||fileListEnd<fileListStart)throw new Error('FileList 组件边界不匹配');
    var oldFileList=source.slice(fileListStart,fileListEnd),newFileList=oldFileList;
    newFileList=root.__evaCut(newFileList,'canShare:Dt}){','canShare:Dt,canDelete:evaCanDelete,onOpenFile:evaOpenFile}){','FileList 预览与删除能力');
    newFileList=root.__evaCut(newFileList,'const Vt=Qt.type==="folder";','const Vt=Qt.type==="folder",evaCanEdit=Mt;','项目共享副本按项目角色可编辑');
    newFileList=root.__evaCut(newFileList,'React.createElement("span",{className:"drive-file__name-text",title:Qt.name},Qt.name)',
      'React.createElement("span",{className:"eva-file-name-content"},evaOpenFile?React.createElement("button",{type:"button",className:"drive-file__name-link",onClick:()=>evaOpenFile(Qt)},Qt.name):React.createElement("span",{className:"drive-file__name-text",title:Qt.name},Qt.name),Qt.sharedVersion&&React.createElement("small",{className:"eva-members-muted"},"共享版本 v",Qt.sourceVersion," · 来源：",Qt.source.groupName,Qt.source.threadName?" / "+Qt.source.threadName:"",Qt.source.taskId?" / "+Qt.source.taskId:""))','文件列表来源说明');
    newFileList=newFileList.replaceAll('Mt&&React.createElement','evaCanEdit&&React.createElement').replaceAll('(Mt||','(evaCanEdit||');
    newFileList=root.__evaCut(newFileList,'evaCanEdit&&React.createElement(Dropdown.Divider,null),evaCanEdit&&React.createElement(Dropdown.Item,{type:"danger"','evaCanDelete&&React.createElement(Dropdown.Divider,null),evaCanDelete&&React.createElement(Dropdown.Item,{type:"danger"','Editor 不显示删除动作');
    source=root.__evaCut(source,oldFileList,newFileList,'FileList 共享文件能力');
    source=root.__evaCut(source,'async function demoFileUrl(rt){const ct=cache.get(rt);','async function demoFileUrl(rt){const evaSample=window.__EVA_FILE_SAMPLE_URLS?.[rt];if(evaSample)return evaSample;const ct=cache.get(rt);','演示文件静态内容');
    var projectFilesStart=source.indexOf('FilesView=()=>{'),projectFilesEnd=source.indexOf('},defaultLocale=',projectFilesStart);
    if(projectFilesStart<0||projectFilesEnd<projectFilesStart)throw new Error('团队文件组件边界不匹配');
    source=root.__evaCut(source,source.slice(projectFilesStart,projectFilesEnd+1),'FilesView=()=>window.EvaProjectFilesUI.render({context:evaMembers(),projectId:currentSpaceId()},{React:reactExports,FilePreviewHost,demoFileUrl,downloadFile})','项目团队文件复用文件库交互与视觉');
    const infoStart=source.indexOf('function GeneralTab('),infoEnd=source.indexOf('function WebhooksTab(',infoStart);
    if(infoStart<0||infoEnd<infoStart)throw new Error('项目信息组件边界不匹配');
    source=root.__evaCut(source,source.slice(infoStart,infoEnd),String.raw`function evaProjectIssuePrefix(project){
      if(project.issue_prefix)return project.issue_prefix;
      const existing=(ISSUES_BY_SPACE[project.id]||[]).find(issue=>/^[A-Z][A-Z0-9]*-\d+$/.test(issue.identifier||''));
      return existing?existing.identifier.slice(0,existing.identifier.lastIndexOf('-')):'P'+Array.from(project.id).map(c=>c.charCodeAt(0).toString(16)).join('').toUpperCase();
    }
    function evaNormalizeProjectOverview(overview){
      if(!overview||typeof overview!=="object"||Array.isArray(overview))throw new Error("项目信息格式错误");
      const text=(value,max,label)=>{const normalized=String(value??"").trim();if(normalized.length>max)throw new Error(label+"最多 "+max+" 个字符");return normalized},states=["done","active","pending"];
      const start=text(overview.period?.start,50,"项目开始时间"),end=text(overview.period?.end,50,"项目结束时间");
      if((start&&!end)||(!start&&end))throw new Error("项目周期请同时填写开始和结束日期");
      const goals=Array.isArray(overview.goals)?overview.goals.map(goal=>text(goal,200,"项目目标")).filter(Boolean):[];
      if(goals.length>12)throw new Error("项目目标最多 12 项");
      const milestones=Array.isArray(overview.milestones)?overview.milestones.map(row=>{
        const date=text(Array.isArray(row)?row[0]:"",50,"里程碑日期"),title=text(Array.isArray(row)?row[1]:"",200,"里程碑事项"),state=Array.isArray(row)&&states.includes(row[2])?row[2]:"pending";
        return date&&title?[date,title,state]:null;
      }).filter(Boolean):[];
      if(milestones.length>12)throw new Error("关键里程碑最多 12 项");
      return {status:text(overview.status,30,"项目状态"),background:text(overview.background,2000,"项目背景"),period:{start,end},stage:text(overview.stage,100,"当前阶段"),goals,milestones};
    }
    function evaSaveProjectInfo(id,{name,goal,issuePrefix,overview}){
      const store=evaMembers().store,actor=store.snapshot().actorId;
      if(!store.manager(id,actor))throw new Error('仅项目负责人或管理员可修改');
      const projects=loadSpaces(),project=projects.find(p=>p.id===id);if(!project)throw new Error('项目不存在');
      name=name.trim();goal=goal.trim();issuePrefix=(issuePrefix??evaProjectIssuePrefix(project)).trim().toUpperCase();
      if(!name||name.length>50)throw new Error('项目名称须为 1–50 个字符');
      if(goal.length>2000)throw new Error('共同目标最多 2000 个字符');
      if(!/^[A-Z][A-Z0-9]*$/.test(issuePrefix))throw new Error('任务前缀须以英文字母开头，仅包含字母和数字');
      if(projects.some(p=>p.id!==id&&(evaProjectIssuePrefix(p)===issuePrefix||(ISSUES_BY_SPACE[p.id]||[]).some(issue=>String(issue.identifier||'').startsWith(issuePrefix+'-')))))throw new Error('该任务前缀已被其他项目使用');
      const normalizedOverview=overview===undefined?undefined:evaNormalizeProjectOverview(overview);
      const next=projects.map(p=>p.id===id?{...p,name,short:name.slice(0,1),desc:goal,issue_prefix:issuePrefix,...(normalizedOverview===undefined?{}:{overview:normalizedOverview})}:p);
      localStorage.setItem(KEY,JSON.stringify(next));
      store.renameProject(id,actor,name);
      return next;
    }
    function GeneralTab({workspace:project,onUpdated}){
      const store=evaMembers().store,revision=reactExports.useSyncExternalStore(store.subscribe,store.getSnapshot),actor=store.snapshot().actorId,seedOverview=project.overview||(project.id==='prod'?window.__EVA_SUPPLY_CHAIN_DEMO.overview:{}),overviewKey=JSON.stringify(seedOverview),readOverview=source=>({status:source.status||'',background:source.background||'',period:{start:source.period?.start||'',end:source.period?.end||''},stage:source.stage||'',goals:Array.isArray(source.goals)?source.goals.map(goal=>String(goal)):[],milestones:Array.isArray(source.milestones)?source.milestones.map(row=>[String(row?.[0]||''),String(row?.[1]||''),['done','active','pending'].includes(row?.[2])?row[2]:'pending']):[]});
      const [name,setName]=reactExports.useState(project.name),[goal,setGoal]=reactExports.useState(project.desc||''),[issuePrefix,setIssuePrefix]=reactExports.useState(evaProjectIssuePrefix(project)),[overview,setOverview]=reactExports.useState(()=>readOverview(seedOverview)),[error,setError]=reactExports.useState(''),[saved,setSaved]=reactExports.useState(false);
      reactExports.useEffect(()=>setSaved(false),[project.id,actor]);
      reactExports.useEffect(()=>{setName(project.name);setGoal(project.desc||'');setIssuePrefix(evaProjectIssuePrefix(project));setOverview(readOverview(seedOverview));setError('');},[project.id,project.name,project.desc,project.issue_prefix,overviewKey,actor]);
      const editable=store.manager(project.id,actor),savedOverview=readOverview(seedOverview),changed=name.trim()!==project.name||goal.trim()!==(project.desc||'')||issuePrefix.trim().toUpperCase()!==evaProjectIssuePrefix(project)||JSON.stringify(overview)!==JSON.stringify(savedOverview),updateOverview=(key,value)=>{setOverview(current=>({...current,[key]:value}));setSaved(false)},updateGoal=(index,value)=>{setOverview(current=>({...current,goals:current.goals.map((goal,goalIndex)=>goalIndex===index?value:goal)}));setSaved(false)},updateMilestone=(index,key,value)=>{setOverview(current=>({...current,milestones:current.milestones.map((row,rowIndex)=>rowIndex===index?key===0?[value,row[1],row[2]]:key===1?[row[0],value,row[2]]:[row[0],row[1],value]:row)}));setSaved(false)};
      const save=()=>{try{const next=evaSaveProjectInfo(project.id,{name,goal,issuePrefix,overview});onUpdated?.(next);setError('');setSaved(true);}catch(e){setError(e.message||'保存失败，请重试');}};
      const field=(label,id,control,hint)=>React.createElement('div',{className:'eva-project-info-field'},React.createElement('label',{htmlFor:id},label),control,hint&&React.createElement('p',{className:'eva-members-muted'},hint));
      return React.createElement('div',{className:'eva-project-settings-info'},
        React.createElement('header',{className:'eva-project-info__hero eva-project-settings-info__hero'},React.createElement('div',{className:'eva-project-info__hero-main'},
          React.createElement('div',{className:'eva-project-info__eyebrow'},field('项目状态','eva-project-status',React.createElement(ForwardInput,{id:'eva-project-status','aria-label':'项目状态',value:overview.status,maxLength:30,disabled:!editable,placeholder:'例如：协作中',onChange:value=>updateOverview('status',value)})),React.createElement('span',null,'项目编号 · ',project.id)),
          field('项目名称','eva-project-name',React.createElement(ForwardInput,{id:'eva-project-name','aria-label':'项目名称',className:'eva-project-settings-info__title',value:name,maxLength:50,disabled:!editable,onChange:value=>{setName(value);setSaved(false);}})),
          field('项目简介','eva-project-goal',React.createElement('textarea',{id:'eva-project-goal','aria-label':'项目简介',value:goal,maxLength:2000,rows:3,disabled:!editable,placeholder:'概括项目希望共同达成的结果',onChange:e=>{setGoal(e.target.value);setSaved(false);}})),
          field('项目背景','eva-project-background',React.createElement('textarea',{id:'eva-project-background','aria-label':'项目背景',value:overview.background,maxLength:2000,rows:3,disabled:!editable,placeholder:'说明项目发起背景与需要解决的问题',onChange:e=>updateOverview('background',e.target.value)}))),
          React.createElement('dl',{className:'eva-project-info__facts eva-project-settings-info__facts'},React.createElement('div',null,React.createElement('dt',null,React.createElement('label',{htmlFor:'eva-project-period-start'},'项目周期')),React.createElement('dd',{className:'eva-project-settings-info__period'},React.createElement(ForwardInput,{id:'eva-project-period-start','aria-label':'项目开始时间',value:overview.period.start,disabled:!editable,placeholder:'开始日期',onChange:value=>updateOverview('period',{...overview.period,start:value})}),React.createElement('span',{'aria-hidden':true},'至'),React.createElement(ForwardInput,{id:'eva-project-period-end','aria-label':'项目结束时间',value:overview.period.end,disabled:!editable,placeholder:'结束日期',onChange:value=>updateOverview('period',{...overview.period,end:value})}))),React.createElement('div',null,React.createElement('dt',null,React.createElement('label',{htmlFor:'eva-project-stage'},'当前阶段')),React.createElement('dd',null,React.createElement(ForwardInput,{id:'eva-project-stage','aria-label':'当前阶段',value:overview.stage,maxLength:100,disabled:!editable,placeholder:'例如：方案评审',onChange:value=>updateOverview('stage',value)}))))),
        React.createElement('div',{className:'eva-project-info__grid eva-project-settings-info__grid'},React.createElement('section',{className:'eva-project-info__card'},React.createElement('div',{className:'eva-project-settings-info__card-title'},React.createElement('h2',null,'项目目标'),editable&&React.createElement(Button,{theme:'light',type:'tertiary',size:'small',icon:React.createElement(Plus$c,{size:16}),onClick:()=>{setOverview(current=>({...current,goals:[...current.goals,'']}));setSaved(false);}},'添加目标')),React.createElement('ol',{className:'eva-project-info__goals eva-project-settings-info__goals'},overview.goals.map((item,index)=>React.createElement('li',{key:index},React.createElement('span',null,String(index+1).padStart(2,'0')),React.createElement('div',{className:'eva-project-settings-info__row'},React.createElement(ForwardInput,{'aria-label':'项目目标 '+(index+1),value:item,maxLength:200,disabled:!editable,placeholder:'填写项目目标',onChange:value=>updateGoal(index,value)}),editable&&React.createElement(Button,{theme:'borderless',type:'danger',size:'small','aria-label':'删除项目目标 '+(index+1),onClick:()=>{setOverview(current=>({...current,goals:current.goals.filter((_,goalIndex)=>goalIndex!==index)}));setSaved(false);}},React.createElement(Trash2,{size:16}))))),!overview.goals.length&&React.createElement('li',{className:'eva-project-settings-info__empty'},'尚未添加项目目标'))),React.createElement('section',{className:'eva-project-info__card eva-project-info__card--milestones'},React.createElement('div',{className:'eva-project-settings-info__card-title'},React.createElement('h2',null,'关键里程碑'),editable&&React.createElement(Button,{theme:'light',type:'tertiary',size:'small',icon:React.createElement(Plus$c,{size:16}),onClick:()=>{setOverview(current=>({...current,milestones:[...current.milestones,['','', 'pending']]}));setSaved(false);}},'添加里程碑')),React.createElement('div',{className:'eva-project-info__timeline eva-project-settings-info__timeline'},overview.milestones.map((item,index)=>React.createElement('div',{key:index,className:'eva-project-info__milestone is-'+item[2]},React.createElement('span',{className:'eva-project-info__milestone-dot','aria-hidden':true}),React.createElement(ForwardInput,{'aria-label':'里程碑日期 '+(index+1),value:item[0],disabled:!editable,placeholder:'日期',onChange:value=>updateMilestone(index,0,value)}),React.createElement('div',{className:'eva-project-settings-info__milestone-copy'},React.createElement(ForwardInput,{'aria-label':'里程碑事项 '+(index+1),value:item[1],maxLength:200,disabled:!editable,placeholder:'里程碑事项',onChange:value=>updateMilestone(index,1,value)}),React.createElement('select',{'aria-label':'里程碑状态 '+(index+1),value:item[2],disabled:!editable,onChange:event=>updateMilestone(index,2,event.target.value)},React.createElement('option',{value:'pending'},'待开始'),React.createElement('option',{value:'active'},'进行中'),React.createElement('option',{value:'done'},'已完成'))),editable&&React.createElement(Button,{theme:'borderless',type:'danger',size:'small','aria-label':'删除里程碑 '+(index+1),onClick:()=>{setOverview(current=>({...current,milestones:current.milestones.filter((_,milestoneIndex)=>milestoneIndex!==index)}));setSaved(false);}},React.createElement(Trash2,{size:16})))),!overview.milestones.length&&React.createElement('p',{className:'eva-project-settings-info__empty'},'尚未添加关键里程碑')))),
        React.createElement('section',{className:'eva-project-settings-info__advanced'},field('任务前缀','eva-project-issue-prefix',React.createElement(ForwardInput,{id:'eva-project-issue-prefix','aria-label':'任务前缀',value:issuePrefix,disabled:!editable,placeholder:'例如 SC',onChange:value=>{setIssuePrefix(value.toUpperCase());setSaved(false);}}),'完整任务编号由前缀和数字组成，例如 SC-101。修改前缀只影响新任务，已有编号保留。')),
        React.createElement('div',{className:'eva-project-settings-info__actions'},React.createElement('div',null,error&&React.createElement('p',{role:'alert',className:'eva-members-error'},error),saved&&React.createElement('p',{role:'status',className:'eva-members-muted'},'项目信息已保存'),!editable&&React.createElement('p',{className:'eva-members-muted'},'仅项目负责人和管理员可编辑。')),editable&&React.createElement(Button,{theme:'solid',disabled:!name.trim()||!changed,onClick:save},'保存修改')));
    }`, '项目设置可编辑概览');
    source=root.__evaCut(source,"React.createElement(Trash2,{size:16}))))),!overview.goals.length","'删除')))),!overview.goals.length",'项目目标删除结构');
    source=root.__evaCut(source,"React.createElement(Trash2,{size:16})))),!overview.milestones.length","'删除'))),!overview.milestones.length",'里程碑删除结构');
    source=root.__evaCut(source,'tab:"通用",itemKey:"general"','tab:"基本信息",itemKey:"general"','基本信息标签');
    source=root.__evaCut(source,'SpaceFrame=({space:rt,spaces:ct,onSwitch:ut})','SpaceFrame=({space:rt,spaces:ct,onSwitch:ut,onProjectUpdated:evaProjectUpdated})','项目更新回调');
    source=root.__evaCut(source,'workspace:{...WORKSPACE,id:rt.id,name:rt.name,slug:rt.id}','workspace:rt,onUpdated:evaProjectUpdated','设置读取当前项目');
    source=root.__evaCut(source,'space:mt,spaces:rt,onSwitch:gt=>pt(gt)','space:mt,spaces:rt,onSwitch:gt=>pt(gt),onProjectUpdated:ct','项目列表刷新');
    source=root.__evaCut(source,'[pt,xt,rt.id,evaProjectMemberRevision]','[pt,xt,rt,evaProjectMemberRevision,evaProjectUpdated]','项目信息更新刷新内容');
    source=root.__evaCut(source,'name:"团队文件功能设计",short:"团",desc:(St.desc||"").replaceAll("云盘","团队文件")','name:St.name,short:St.short,desc:St.desc||""','保留用户修改的项目名称与目标');
    source=root.__evaCut(source,'createIssue=rt=>{const ut={...MOCK_ISSUES[0],...rt,id:`mock-${Date.now().toString(36)}`,identifier:`WS-${issuesOf().length+1}`};return issuesOf().push(ut),Promise.resolve(ut)}',String.raw`createIssue=rt=>{
      const pid=rt.workspace_id||currentSpaceId(),project=loadSpaces().find(p=>p.id===pid),store=evaMembers().store,snapshot=store.snapshot(),scope=snapshot.projects[pid];
      if(!project||!scope||!store.canRead(pid,snapshot.actorId))return Promise.reject(new Error("请先进入已加入的项目"));
      if(!String(rt.title||"").trim())return Promise.reject(new Error("请填写任务名称"));
      const allowed=scope.humans.map(p=>p.id);
      if(rt.assignee_id&&!allowed.includes(rt.assignee_id))return Promise.reject(new Error("负责人只能是本项目的联系人，请重新选择"));
      if(!rt.source_id)return Promise.reject(new Error("请选择来源者"));
      const sourceIdentity=evaResolveTaskIdentity(rt.source_id,scope);if(!sourceIdentity)return Promise.reject(new Error("来源者必须是联系人、AI 分身或数字员工，请重新选择"));
      if(rt.reviewer_id&&!scope.humans.some(p=>p.id===rt.reviewer_id))return Promise.reject(new Error("验收人已不在本项目，请重新选择"));
      const list=ISSUES_BY_SPACE[pid]||(ISSUES_BY_SPACE[pid]=[]);
      if(rt.parent_issue_id&&!list.some(i=>i.id===rt.parent_issue_id))return Promise.reject(new Error("父任务不属于当前项目"));
      const issuerId=rt.creator_id||snapshot.actorId,issuerIdentity=evaResolveTaskIdentity(issuerId,scope);if(!issuerIdentity)return Promise.reject(new Error("创建者必须是联系人、AI 分身或数字员工，请重新选择"));
      const prefix=evaProjectIssuePrefix(project),number=1+Math.max(0,...list.map(i=>{const match=String(i.identifier||"").match(/-(\d+)$/);return match?Number(match[1]):Number(i.number)||0;})),now=new Date().toISOString(),attachments=(rt.attachment_ids||[]).map(id=>evaLoopTaskAttachments.get(id)).filter(Boolean),attachmentText=attachments.length?"\n\n## 参考附件\n"+attachments.map(a=>"- ["+a.name.replace(/[\[\]]/g,"")+"]("+a.url+")").join("\n"):"";
      const assignee=rt.assignee_id?store.person(rt.assignee_id):null;
      const ut={...rt,id:"issue-"+pid+"-"+prefix+"-"+number,title:rt.title.trim(),description:(rt.description||"")+attachmentText,workspace_id:pid,project_id:pid==='prod'?'p-supply':null,project_name:project.name,number,identifier:prefix+"-"+number,status:rt.status||"todo",priority:rt.priority||"none",due_date:rt.due_date||null,assignee_id:rt.assignee_id||null,assignee_type:assignee?"member":null,assignee_name:assignee?.name||null,source_id:rt.source_id||null,source_type:sourceIdentity.type,source_name:sourceIdentity.name||null,creator_id:issuerId,creator_type:issuerIdentity.type,creator_name:issuerIdentity.name||"",creator_avatar:issuerIdentity.avatar||"",created_at:now,updated_at:now,position:list.length+1,attachments};
      list.push(ut);return Promise.resolve(ut);
    }`,'项目任务完整编号');
    const evaCreateStart=source.indexOf('function CreateIssueModal('),evaCreateEnd=source.indexOf('const{Text:Text$c}=Typography;',evaCreateStart);
    if(evaCreateStart<0||evaCreateEnd<evaCreateStart)throw new Error('新建 Loop 任务组件边界不匹配');
    source=root.__evaCut(source,source.slice(evaCreateStart,evaCreateEnd),String.raw`const evaLoopTaskAttachments=new Map(),evaLoopTaskLabelsByProject=new Map();
    function evaRegisterLoopAttachment(file,target={}){
      if(!file||file.size>20*1024*1024)return Promise.reject(new Error('单个附件不能超过 20 MB'));
      const name=String(file.name||'附件'),extension=(name.split('.').pop()||'').toLowerCase(),url=URL.createObjectURL(file),record={id:'task-file:'+crypto.randomUUID(),name,filename:name,size:Number(file.size||0),extension,mime_type:file.type||'',content_type:file.type||'',url,download_url:url,previewUrl:url,version:1};
      evaLoopTaskAttachments.set(record.id,record);
      if(target.issueId){const issue=issuesOf().find(item=>item.id===target.issueId);if(!issue)return Promise.reject(new Error('任务不存在'));issue.attachments=[...(issue.attachments||[]),record];issue.updated_at=new Date().toISOString();}
      return Promise.resolve(record);
    }
    function evaTaskLabels(project){
      const key=project?.id;if(!key)return[];
      if(!evaLoopTaskLabelsByProject.has(key)){const seed=(window.__EVA_SUPPLY_CHAIN_DEMO?.taskLabels||[]).filter(label=>label.project_id===key||(key==='prod'&&label.project_id==='p-supply'));evaLoopTaskLabelsByProject.set(key,seed.map(label=>({...label})));}
      return evaLoopTaskLabelsByProject.get(key);
    }
    function evaCurrentTaskProject(){return loadSpaces().find(project=>project.id===currentSpaceId());}
    function evaTaskProjectId(project){return project?.collaborationId||(project?.id==='p-supply'?'prod':project?.id);}
    function evaCreateTaskLabel(project,name,color){
      const normalized=String(name||'').trim();if(!normalized||normalized.length>20)throw new Error('标签名称须为 1–20 个字符');
      const labels=evaTaskLabels(project),existing=labels.find(label=>label.name===normalized);if(existing)return existing;
      const labelProjectId=project.id==='prod'?'p-supply':project.id,label={id:'task-label:'+labelProjectId+':'+Date.now().toString(36)+':'+Math.random().toString(36).slice(2,7),project_id:labelProjectId,name:normalized,color:color||'#64748b'};labels.push(label);return label;
    }
    function evaUpdateTaskLabel(project,labelId,patch){
      const labels=evaTaskLabels(project),label=labels.find(item=>item.id===labelId);if(!label)throw new Error('标签不存在');
      const name=patch?.name===undefined?label.name:String(patch.name||'').trim();if(!name||name.length>20)throw new Error('标签名称须为 1–20 个字符');
      if(labels.some(item=>item.id!==labelId&&item.name===name))throw new Error('当前项目已有同名标签');
      Object.assign(label,patch,{name});const issues=ISSUES_BY_SPACE[evaTaskProjectId(project)]||[];for(let index=0;index<issues.length;index++){const issue=issues[index];if((issue.labels||[]).some(attached=>attached.id===labelId))issues[index]={...issue,labels:issue.labels.map(attached=>attached.id===labelId?{...label}:attached)};}return label;
    }
    function evaDeleteTaskLabel(project,labelId){
      const labels=evaTaskLabels(project),index=labels.findIndex(item=>item.id===labelId);if(index<0)throw new Error('标签不存在');
      labels.splice(index,1);const issues=ISSUES_BY_SPACE[evaTaskProjectId(project)]||[];for(let issueIndex=0;issueIndex<issues.length;issueIndex++){const issue=issues[issueIndex];if((issue.labels||[]).some(label=>label.id===labelId))issues[issueIndex]={...issue,labels:issue.labels.filter(label=>label.id!==labelId)};}
    }
    function evaAttachTaskLabel(project,pid,issueId,labelId){
      const label=evaTaskLabels(project).find(item=>item.id===labelId),issues=ISSUES_BY_SPACE[pid]||[],index=issues.findIndex(item=>item.id===issueId);if(!label||index<0)throw new Error('标签或任务不存在');
      const issue=issues[index];if((issue.labels||[]).some(item=>item.id===label.id))return issue;const next={...issue,labels:[...(issue.labels||[]),{...label}]};issues[index]=next;return next;
    }
    function evaDetachTaskLabel(project,pid,issueId,labelId){
      const issues=ISSUES_BY_SPACE[pid]||[],index=issues.findIndex(item=>item.id===issueId);if(!evaTaskLabels(project).some(item=>item.id===labelId)||index<0)throw new Error('标签或任务不存在');
      const issue=issues[index],next={...issue,labels:(issue.labels||[]).filter(item=>item.id!==labelId)};issues[index]=next;return next;
    }
    function CreateIssueModal(props){
      const store=evaMembers().store;reactExports.useSyncExternalStore(store.subscribe,store.getSnapshot);
      const project=loadSpaces().find(p=>p.id===(props.projectId||currentSpaceId()));
      return window.EvaLoopTaskCreateUI.render({...props,parentIssue:props.parentIssue||issuesOf().find(issue=>issue.id===props.parentIssueId)},{React:reactExports,Modal,Button,LoopButton,Input:ForwardInput,AutoGrowTextarea,Select,AssigneePicker,DatePicker,Popover,LoopPropertyPill,statusOptions:ISSUE_STATUS_ORDER.map(value=>({value,label:({backlog:"待规划",todo:"待办",in_progress:"进行中",in_review:"审核中",done:"已完成",blocked:"受阻",cancelled:"已取消"})[value],icon:React.createElement(ISSUE_STATUS_ICON[value],{size:14,style:{color:ISSUE_STATUS_HEX[value]}})})),priorityOptions:PRIORITY_ORDER.map(value=>({value,label:({urgent:"紧急",high:"高",medium:"中",low:"低",none:"无"})[value],icon:React.createElement(PRIORITY_ICON[value],{size:14,style:{color:PRIORITY_HEX[value]}})})),icons:{X,ChevronRight,ChevronDown,CalendarClock,Paperclip:Paperclip$3,Trash2},members:store,HumanIdentity:evaMembers().ui.HumanIdentity,project,getPrefix:()=>project?evaProjectIssuePrefix(project):'',createIssue:payload=>props.canCreate&&!props.canCreate()?Promise.reject(new Error('已失去当前会话或项目的访问权限')):createIssue({...payload,source_conversation_id:props.conversationId||null}),uploadAttachment:file=>evaRegisterLoopAttachment(file),listLabels:()=>Promise.resolve(evaTaskLabels(project)),createLabel:name=>Promise.resolve(evaCreateTaskLabel(project,name)),attachLabel:(issueId,labelId)=>Promise.resolve(evaAttachTaskLabel(project,evaTaskProjectId(project),issueId,labelId))});
    }`,'项目 Loop 任务完整创建表单');
    source=root.__evaCut(source,'uploadAttachment=()=>Promise.resolve({url:""})','uploadAttachment=(rt,ct)=>evaRegisterLoopAttachment(rt,ct)','已有任务附件上传写回任务数据');
    source=root.__evaCut(source,'listLabels=()=>Promise.resolve([]),createLabel=()=>Promise.resolve(),updateLabel=()=>Promise.resolve(),deleteLabel=()=>Promise.resolve(),attachLabel=()=>Promise.resolve(),detachLabel=()=>Promise.resolve()',String.raw`listLabels=()=>Promise.resolve(evaTaskLabels(evaCurrentTaskProject())),createLabel=(name,color)=>Promise.resolve(evaCreateTaskLabel(evaCurrentTaskProject(),name,color)),updateLabel=(labelId,patch)=>Promise.resolve(evaUpdateTaskLabel(evaCurrentTaskProject(),labelId,patch)),deleteLabel=labelId=>Promise.resolve(evaDeleteTaskLabel(evaCurrentTaskProject(),labelId)),attachLabel=(issueId,labelId)=>{const project=evaCurrentTaskProject();return Promise.resolve(evaAttachTaskLabel(project,evaTaskProjectId(project),issueId,labelId))},detachLabel=(issueId,labelId)=>{const project=evaCurrentTaskProject();return Promise.resolve(evaDetachTaskLabel(project,evaTaskProjectId(project),issueId,labelId))}`,'任务详情标签使用项目数据');
    source=root.__evaCut(source,'function LoopPropertyPill({value:rt,options:ct,onChange:ut,ariaLabel:pt})','function LoopPropertyPill({value:rt,options:ct,onChange:ut,ariaLabel:pt,getPopupContainer,disabled})','属性胶囊浮层容器参数');
    source=root.__evaCut(source,'position:"bottomLeft",clickToHide:!0,render:React.createElement(Dropdown.Menu,null,ct.map(gt=>','position:"bottomLeft",clickToHide:!0,getPopupContainer,render:React.createElement(Dropdown.Menu,null,ct.map(gt=>','属性胶囊浮层跟随弹窗');
    source=root.__evaCut(source,'className:"loop-pill","aria-label":pt','className:"loop-pill","aria-label":pt,disabled','属性胶囊禁用状态');
    source=root.__evaCut(source,'const evaProjectMemberStore=evaMembers().store,evaProjectMemberRevision=', 'const evaTaskLocation=useLocation();reactExports.useEffect(()=>{const evaRequestedTab=new URLSearchParams(evaTaskLocation.search).get("evaTab");if(["tasks","channels","files","automation","project-info","settings"].includes(evaRequestedTab)){WKApp$1.routeRight.popAll();mt(evaRequestedTab);}},[rt.id,evaTaskLocation.search]);const evaProjectMemberStore=evaMembers().store,evaProjectMemberRevision=', '项目路由标签');
    source=root.__evaCut(source,'getIssue=rt=>Promise.resolve(issuesOf().find(ct=>ct.id===rt)??MOCK_ISSUES[0])','getIssue=rt=>{const issue=issuesOf().find(ct=>ct.id===rt||ct.identifier===rt);return issue?Promise.resolve(issue):Promise.reject(new Error("当前项目找不到任务："+rt))}','按完整任务编号查找');
    source=root.__evaCut(source,'listRuns=()=>Promise.resolve([{id:"run-supply-1-1"','listRuns=rt=>Promise.resolve((rt&&issuesOf().some(issue=>issue.id===rt)?[{id:"run-supply-1-1"','运行历史要求当前项目任务');
    source=root.__evaCut(source,'trigger_summary:"@提及后完成间接采购需求归集"}]),listRunMessages=', 'trigger_summary:"@提及后完成间接采购需求归集"}]:[]).filter(run=>run.issue_id===rt)),listRunMessages=', '运行历史按任务隔离');
    source=root.__evaCut(source,'Promise.all([getIssue(rt),listComments(rt),listRuns()])','Promise.all([getIssue(rt),listComments(rt),listRuns(rt)])','任务详情传入运行任务ID');
    source=root.__evaCut(source,'Pa=()=>listRuns().then(mr)','Pa=()=>listRuns(rt).then(mr)','刷新运行历史传入任务ID');
    source=root.__evaCut(source,'listComments=rt=>{const ct=', 'listComments=rt=>{if(!rt||!issuesOf().some(issue=>issue.id===rt))return Promise.resolve([]);const ct=', '评论限制当前项目任务');
    source=root.__evaCut(source,'listChildren=rt=>Promise.resolve(issuesOf().filter(ct=>ct.parent_issue_id===rt))','listChildren=rt=>Promise.resolve(rt&&issuesOf().some(issue=>issue.id===rt)?issuesOf().filter(ct=>ct.parent_issue_id===rt):[])','子任务限制当前项目父任务');
    source=root.__evaCut(source,'listTimeline().then(no=>{Wi()&&sr(no)})','listTimeline(rt).then(no=>{Wi()&&sr(no)})','任务动态明确任务ID');
    source=root.__evaCut(source,'readView(ut,["board","grouped","list"],ct??"board")','readView(ut,ut==="collab-tasks"?["board","list","hierarchy"]:["board","grouped","list","hierarchy"],ct??"board")','项目任务层级视图持久化');
    const evaLoopAttachmentsStart=source.indexOf('function LoopAttachments('),evaLoopAttachmentsEnd=source.indexOf('const FLEET_ISSUE_DEEP_LINK_PREFIX',evaLoopAttachmentsStart);
    if(evaLoopAttachmentsStart<0||evaLoopAttachmentsEnd<evaLoopAttachmentsStart)throw new Error('任务附件组件边界不匹配');
    source=root.__evaCut(source,source.slice(evaLoopAttachmentsStart,evaLoopAttachmentsEnd),String.raw`function evaFormatTaskAttachmentSize(value){const size=Number(value||0);if(!size)return"大小未知";if(size<1024)return size+" B";if(size<1024*1024)return(size/1024).toFixed(size<10240?1:0)+" KB";return(size/1024/1024).toFixed(1)+" MB"}function evaTaskAttachmentVisual(extension){const ext=String(extension||"").toLowerCase();if(ext==="pdf")return{tone:"is-pdf",label:"PDF",Icon:FileText};if(["csv","xls","xlsx","numbers"].includes(ext))return{tone:"is-sheet",label:"X",Icon:FileText};if(["doc","docx","rtf"].includes(ext))return{tone:"is-document",label:"W",Icon:FileText};if(["ppt","pptx","key"].includes(ext))return{tone:"is-presentation",label:"P",Icon:FileText};if(["zip","rar","7z","tar","gz"].includes(ext))return{tone:"is-archive",label:"ZIP",Icon:FileText};if(["md","markdown"].includes(ext))return{tone:"is-markdown",label:"MD",Icon:FileText};if(ext==="txt")return{tone:"is-text",label:"TXT",Icon:FileText};if(["png","jpg","jpeg","gif","webp","svg","heic"].includes(ext))return{tone:"is-image",label:"IMG",Icon:FileImage};if(["mp3","wav","m4a","aac","flac"].includes(ext))return{tone:"is-audio",label:"AUD",Icon:FileText};if(["mp4","mov","avi","mkv","webm"].includes(ext))return{tone:"is-video",label:"VID",Icon:FileText};return{tone:"is-generic",label:(ext||"FILE").slice(0,4).toUpperCase(),Icon:FileText}}function LoopAttachments({attachments:rt,workspaceSlug:ct,onPreview:evaOnPreview,onDownload:evaOnDownload,onSave:evaOnSave,onOpenLibrary:evaOnOpenLibrary,savedFileFor:evaSavedFileFor,canSave:evaCanSave}){return rt?.length?React.createElement("div",{className:"loop-atts eva-task-attachments","aria-label":"任务附件",role:"list"},rt.map(ut=>{const name=ut.filename||ut.name||"附件",extension=(ut.extension||name.split(".").pop()||"").toUpperCase(),visual=evaTaskAttachmentVisual(extension),saved=evaSavedFileFor?.(ut);return React.createElement("article",{key:ut.id||name,className:"wk-message-file wk-message-file--clickable eva-task-attachment-card","data-eva-task-attachment":ut.id||name,role:"listitem"},React.createElement("button",{type:"button",className:"eva-task-attachment-card__preview eva-task-attachment-preview",title:"预览 "+name,"aria-label":"预览 "+name,onClick:()=>evaOnPreview?.(ut)},React.createElement("span",{className:"wk-message-file-icon eva-task-attachment-card__filetype "+visual.tone,"data-eva-file-type":visual.label,"aria-hidden":true},React.createElement(visual.Icon,{size:28,className:"eva-task-attachment-card__filetype-icon"}),React.createElement("span",{className:"eva-task-attachment-card__filetype-label"},visual.label)),React.createElement("span",{className:"wk-message-file-info eva-task-attachment-card__content"},React.createElement("span",{className:"wk-message-file-name eva-task-attachment-card__name"},name),React.createElement("span",{className:"wk-message-file-meta eva-task-attachment-card__meta"},React.createElement("span",{className:"wk-message-file-size eva-task-attachment-card__size"},evaFormatTaskAttachmentSize(ut.size)),React.createElement("span",{className:"wk-message-file-ext eva-task-attachment-card__format"},extension||"FILE")))),React.createElement("div",{className:"wk-message-file-actions eva-task-attachment-card__actions"},saved?React.createElement("button",{type:"button",className:"wk-message-file-action eva-task-attachment-action","aria-label":"前往项目文件库",title:"前往项目文件库",onClick:()=>evaOnOpenLibrary?.(saved)},React.createElement(FileDriveIcon,{action:"viewDrive"})):evaOnSave&&React.createElement("button",{type:"button",className:"wk-message-file-action eva-task-attachment-action",disabled:!evaCanSave,"aria-label":"保存到项目文件库",title:evaCanSave?"保存 "+name+" 到项目文件库":"当前角色无保存权限",onClick:()=>evaOnSave(ut)},React.createElement(FileDriveIcon,{action:"saveDrive"})),evaOnDownload&&React.createElement("button",{type:"button",className:"wk-message-file-action eva-task-attachment-action","aria-label":"下载 "+name,title:"下载 "+name,onClick:()=>evaOnDownload(ut)},React.createElement(Download$5,{size:18,"aria-hidden":true}))))})):null}`,'任务附件复用群聊文件卡结构、类型标识与完整操作');
    source=root.__evaCut(source,
      'function replaceFleetIssueDeepLink(rt,ct){!rt||!ct||writeBrowserPath(buildFleetIssueDeepLink(rt,ct),"replace")}',
      'function replaceFleetIssueDeepLink(rt,ct){!rt||!ct||writeBrowserPath(buildFleetIssueDeepLink(rt,ct),"replace")}function evaRestoreFleetProjectRoute(rt){!rt||typeof window>"u"||!window.location.pathname.startsWith(FLEET_ISSUE_DEEP_LINK_PREFIX+"/")||writeBrowserPath("/#/collab?evaProject="+encodeURIComponent(rt),"replace")}',
      '关闭任务深链时恢复所属项目任务页地址');
    source=root.__evaCut(source,
      '[Ua,Ca]=reactExports.useState(!1),Ra=()=>Ca(!0),Ya=',
      '[Ua,Ca]=reactExports.useState(!1),[evaCreateParent,evaSetCreateParent]=reactExports.useState(null),Ra=()=>{evaSetCreateParent(null),Ca(!0)},evaCreateChild=$a=>{evaSetCreateParent($a),Ca(!0)},Ya=',
      '项目任务创建上下文');
    source=root.__evaCut(source,
      ':Kt==="board"?React.createElement(IssueBoard,{issues:Pt,onOpen:xa,onChanged:Oa,running:Ft}):Kt==="grouped"?React.createElement(IssueGroupBoard,{groups:Mt,onOpen:xa,running:Ft}):React.createElement(React.Fragment,null,React.createElement(IssueList,{issues:Pt,onOpen:xa,onChanged:Oa,running:Ft}),Vt>PAGE_SIZE&&React.createElement("div",{style:{display:"flex",justifyContent:"flex-end",padding:"12px 4px"}},React.createElement(Pagination,{total:Vt,pageSize:PAGE_SIZE,currentPage:Cn+1,onPageChange:$a=>ir($a-1)})))',
      ':Kt==="board"?React.createElement(IssueBoard,{issues:Pt,onOpen:xa,onChanged:Oa,running:Ft}):Kt==="grouped"?React.createElement(IssueGroupBoard,{groups:Mt,onOpen:xa,running:Ft}):Kt==="hierarchy"?React.createElement(EvaIssueHierarchy,{issues:Pt,allIssues:issuesOf(),onOpen:xa,onCreateChild:evaCreateChild,running:Ft,resetKey:currentSpaceId()+"|"+rn}):React.createElement(React.Fragment,null,React.createElement(IssueList,{issues:Pt,onOpen:xa,onChanged:Oa,running:Ft}),Vt>PAGE_SIZE&&React.createElement("div",{style:{display:"flex",justifyContent:"flex-end",padding:"12px 4px"}},React.createElement(Pagination,{total:Vt,pageSize:PAGE_SIZE,currentPage:Cn+1,onPageChange:$a=>ir($a-1)})))',
      '项目任务层级视图渲染');
    source=root.__evaCut(source,
      'React.createElement(CreateIssueModal,{visible:Ua,onClose:()=>Ca(!1),onCreated:()=>{Ca(!1),Oa(),Toast.success(pt("loop.toast.created"))}})',
      'React.createElement(CreateIssueModal,{visible:Ua,parentIssueId:evaCreateParent?.id,parentIssue:evaCreateParent,onClose:()=>{Ca(!1),evaSetCreateParent(null)},onCreated:$a=>{Ca(!1),evaSetCreateParent(null),Oa(),Toast.success(evaCreateParent?"子任务 "+($a?.identifier||"")+" 已创建":pt("loop.toast.created"))}})',
      '项目任务创建弹窗传递父任务');
    source=root.__evaCut(source,
      'Ea=ki=>{const Wi=currentWorkspaceSlug(),no=Ht.find(ls=>ls.id===ki);Wi&&no?.identifier&&pushFleetIssueDeepLink(Wi,no.identifier),WKApp$1.routeRight.push(React.createElement(IssueDetailPage,{key:ki,issueId:ki,onChanged:ct,onClose:()=>{Wi&&xt?.identifier?replaceFleetIssueDeepLink(Wi,xt.identifier):ut?.()}}))}',
      'Ea=ki=>{const Wi=currentWorkspaceSlug(),no=issuesOf().find(ls=>ls.id===ki);if(!no||ki===xt.id)return;Wi&&no.identifier&&replaceFleetIssueDeepLink(Wi,no.identifier),WKApp$1.routeRight.pop(),WKApp$1.routeRight.push(React.createElement(IssueDetailPage,{key:ki,issueId:ki,onChanged:ct,onClose:ut}))}',
      '任务详情层级导航替换当前详情而不叠加返回层');
    source=root.__evaCut(source,
      'Qa=()=>{ut?.()!==!1&&WKApp$1.routeRight.pop()}',
      'Qa=()=>{const Wi=currentWorkspaceSlug();Wi&&evaRestoreFleetProjectRoute(Wi),ut?.()!==!1&&WKApp$1.routeRight.pop()}',
      '从任务深链返回项目时同步恢复项目任务页地址');
    source=root.__evaCut(source,
      'routeRight:{push:rt=>{rrStack.push(rt),rrSync()},pop:()=>{rrStack.pop(),rrSync()},popAll:()=>{rrStack.length=0,rrSync()}}',
      'routeRight:{push:rt=>{rrStack.push(rt),rrSync()},pop:()=>{rrStack.pop(),rrSync()},popAll:()=>{rrStack.length=0,rrSync()},replace:rt=>{rrStack.length&&(rrStack[rrStack.length-1]=rt),rrSync()}}',
      '右侧路由栈新增 replace（任务抽屉原地切换上一条/下一条，不叠加返回层）');
    source=root.__evaCut(source,
      'RouteRightHost=()=>{const[rt,ct]=reactExports.useState([]);return reactExports.useEffect(()=>(rrNotify=ct,ct([...rrStack]),()=>{rrNotify=null}),[]),rt.length===0?null:React.createElement("div",{className:"collab-route-right"},React.createElement("div",{className:"mask",onClick:()=>WKApp$1.routeRight.popAll()}),React.createElement("div",{className:"panel"},rt[rt.length-1]))}',
      'RouteRightHost=()=>{const[rt,ct]=reactExports.useState([]),[evaExiting,evaSetExiting]=reactExports.useState(null),evaLast=reactExports.useRef(null);reactExports.useEffect(()=>(rrNotify=ct,ct([...rrStack]),()=>{rrNotify=null}),[]);reactExports.useEffect(()=>{if(rt.length>0)evaLast.current=rt[rt.length-1],evaExiting&&evaSetExiting(null);else if(evaLast.current){const el=evaLast.current;evaSetExiting(el);const ti=setTimeout(()=>{evaSetExiting(null),evaLast.current=null},240);return()=>clearTimeout(ti)}},[rt]);const evaShow=rt.length>0?rt[rt.length-1]:evaExiting,evaClosing=rt.length===0&&!!evaExiting;if(!evaShow)return null;const evaIsIssue=evaShow&&evaShow.type===IssueDetailPage,evaCls="collab-route-right"+(evaIsIssue?" eva-route-drawer":"")+(evaClosing?" eva-drawer-closing":"");return React.createElement("div",{className:evaCls},React.createElement("div",{className:"mask",onClick:()=>WKApp$1.routeRight.popAll()}),React.createElement("div",{className:"panel"},evaShow))}',
      '任务详情右滑抽屉：出栈时保留末屏做滑出动画，并按顶层元素类型标记 eva-route-drawer（仅任务详情抽屉化，不影响其它右侧路由）');
    source=root.__evaCut(source,
      'xa=$a=>{WKApp$1.routeRight.push(React.createElement(IssueDetailPage,{key:$a,issueId:$a,onChanged:Oa,onClose:()=>WKApp$1.routeRight.pop()}))}',
      'xa=$a=>{try{window.__evaTaskNavOrder=(Pt||[]).map(_e=>_e.id),window.__evaTaskCurrentId=$a,window.__evaTaskNavAt=()=>{const _o=window.__evaTaskNavOrder||[],_i=_o.indexOf(window.__evaTaskCurrentId);return{i:_i,len:_o.length}},window.__evaTaskNavGo=_d=>{const _o=window.__evaTaskNavOrder||[],_i=_o.indexOf(window.__evaTaskCurrentId),_j=_i+_d;if(_i<0||_j<0||_j>=_o.length)return;const _nid=_o[_j];window.__evaTaskCurrentId=_nid,WKApp$1.routeRight.replace(React.createElement(IssueDetailPage,{key:_nid,issueId:_nid,onChanged:Oa,onClose:()=>WKApp$1.routeRight.pop()}))}}catch(_e){}WKApp$1.routeRight.push(React.createElement(IssueDetailPage,{key:$a,issueId:$a,onChanged:Oa,onClose:()=>WKApp$1.routeRight.pop()}))}',
      '任务列表打开详情时记录当前列表顺序，暴露抽屉上一条/下一条原地切换导航');
    source=root.__evaCut(source,
      'Oi=Ht.filter(ki=>ki.status==="done").length,$i=',
      'evaDetailSubtaskIds=evaIssueDescendantIds(xt.id,issuesOf()),evaDetailSubtasks=issuesOf().filter(ki=>evaDetailSubtaskIds.has(ki.id)),Oi=evaDetailSubtasks.filter(ki=>ki.status==="done").length,evaSubtaskTotal=evaDetailSubtasks.length,evaParentIssue=evaIssueParentOf(xt),evaAncestorIssues=evaIssueAncestorChain(xt),evaBreadcrumbIssues=evaIssueBreadcrumbChain(xt),evaBreadcrumbAncestorIssues=evaBreadcrumbIssues.slice(0,-1),evaBreadcrumbHasHiddenAncestors=evaAncestorIssues.length>evaBreadcrumbAncestorIssues.length,$i=',
      '任务详情读取完整祖先链与全部后代');
    source=root.__evaCut(source,
      '[Ht,jt]=reactExports.useState(pt?.children??[]),[tn,Kt]=reactExports.useState(!1),',
      '[Ht,jt]=reactExports.useState(pt?.children??[]),evaTaskFileContext=evaMembers(),evaTaskFileStore=evaTaskFileContext.files,evaTaskFileActor=evaTaskFileContext.store.snapshot().actorId,evaTaskFileRevision=reactExports.useSyncExternalStore(evaTaskFileStore.subscribe,evaTaskFileStore.getSnapshot),[evaChildParent,evaSetChildParent]=reactExports.useState(null),[evaTaskFilePreview,setEvaTaskFilePreview]=reactExports.useState(null),[tn,Kt]=reactExports.useState(!1),',
      '任务详情持有新建子任务与附件预览上下文');
    source=root.__evaCut(source,
      '},[rt,pt]),reactExports.useEffect(()=>{Ct||listProjects().then(Cn).catch(()=>{})},[Ct]);',
      '},[rt,pt]),reactExports.useEffect(()=>{evaSetChildParent(null),setEvaTaskFilePreview(null)},[rt]),reactExports.useEffect(()=>{if(!evaTaskFilePreview)return;const evaCloseTaskPreview=evaEvent=>{evaEvent.target.closest?.(".eva-task-file-fs__stage, .eva-task-attachments")||setEvaTaskFilePreview(null)};document.addEventListener("pointerdown",evaCloseTaskPreview);return()=>document.removeEventListener("pointerdown",evaCloseTaskPreview)},[evaTaskFilePreview]),reactExports.useEffect(()=>{Ct||listProjects().then(Cn).catch(()=>{})},[Ct]);',
      '任务切换时重置子任务创建与附件预览上下文');
    source=root.__evaCut(source,
      'hi=ki=>React.createElement(LoopAttachments,{attachments:ki,workspaceSlug:pt?.workspace.slug}),Si=',
      'evaTaskSpaceId=xt?.workspace_id||currentSpaceId(),evaSavedTaskAttachment=ki=>xt?evaTaskFileStore.findTaskAttachment(evaTaskFileActor,evaTaskSpaceId,ki,xt):null,evaOpenTaskAttachment=async ki=>{const Wi=ki.filename??ki.name??"附件",no=(ki.extension??Wi.split(".").pop()??"").toLowerCase(),ls=ki.previewUrl??ki.url??ki.download_url??await demoFileUrl(Wi);setEvaTaskFilePreview({...ki,name:Wi,extension:no,url:ls})},evaDownloadTaskAttachment=async ki=>{try{const Wi=ki.filename??ki.name??"附件",no=ki.download_url??ki.url??ki.previewUrl??await demoFileUrl(Wi);await downloadFile(no,Wi)}catch(Wi){Toast.error(Wi?.message||"附件下载失败")}},evaSaveTaskAttachment=ki=>{try{evaTaskFileStore.saveTaskAttachment(evaTaskFileActor,evaTaskSpaceId,ki,xt);Toast.success("已保存到项目文件库")}catch(Wi){Toast.error(Wi?.message||"保存失败")}},evaOpenTaskFileLibrary=evaSavedFile=>{const evaTargetProjectId=evaSavedFile?.spaceId||evaSavedFile?.projectId||evaTaskSpaceId;setEvaTaskFilePreview(null);WKApp$1.routeRight.popAll();window.location.hash="#/collab?evaProject="+encodeURIComponent(evaTargetProjectId)+"&evaTab=files"},hi=ki=>React.createElement(LoopAttachments,{attachments:ki,workspaceSlug:pt?.workspace.slug,onPreview:evaOpenTaskAttachment,onDownload:evaDownloadTaskAttachment,onSave:evaSaveTaskAttachment,onOpenLibrary:evaOpenTaskFileLibrary,savedFileFor:evaSavedTaskAttachment,canSave:evaTaskFileStore.can("upload",evaTaskSpaceId,evaTaskFileActor)}),Si=',
      '任务附件支持预览下载与保存到项目文件库');
    source=root.__evaCut(source,
      'oi=async()=>{ga!==(xt?.description??"")&&await Ta({description:ga}),ia(!1)},mi=()=>',
      'oi=async()=>{ga!==(xt?.description??"")&&await Ta({description:ga}),ia(!1)},evaOpenChildCreator=ki=>{evaSetChildParent(ki||xt),Kt(!0)},mi=()=>',
      '任务详情统一子任务创建入口');
    source=root.__evaCut(source,
      'React.createElement(ChevronRight,{size:14,className:"loop-idp__crumb-sep"}),React.createElement("span",{className:"loop-idp__crumb-cur"}',
      'evaBreadcrumbHasHiddenAncestors&&React.createElement(React.Fragment,null,React.createElement(ChevronRight,{size:14,className:"loop-idp__crumb-sep"}),React.createElement("span",{className:"loop-idp__crumb-ellipsis","aria-label":"已省略更早的任务层级",title:"已省略更早的任务层级"},"…")),evaBreadcrumbAncestorIssues.map(ki=>React.createElement(React.Fragment,{key:ki.id},React.createElement(ChevronRight,{size:14,className:"loop-idp__crumb-sep"}),React.createElement(Ct?"span":"button",{type:Ct?void 0:"button",className:"loop-idp__crumb-task",title:ki.identifier+" "+ki.title,onClick:Ct?void 0:()=>Ea(ki.id)},React.createElement("span",{className:"loop-idp__crumb-id"},ki.identifier),React.createElement("span",{className:"loop-idp__crumb-title"},ki.title)))),React.createElement(ChevronRight,{size:14,className:"loop-idp__crumb-sep"}),React.createElement(Ct?"span":"button",{type:Ct?void 0:"button",className:"loop-idp__crumb-cur",title:xt.identifier+" "+xt.title,"aria-current":"page",onClick:Ct?void 0:()=>Ea(xt.id)}',
      '任务详情面包屑展示最近三级任务编号与名称');
    const evaDetailStart=source.indexOf('function IssueDetailPage('),evaChildSectionStart=source.indexOf('Ht.length>0&&React.createElement("div",{className:"loop-idp__section"}',evaDetailStart),evaChildSectionEnd=source.indexOf(',React.createElement("div",{className:"loop-idp__section loop-idp__feed-sec"}',evaChildSectionStart);
    if(evaDetailStart<0||evaChildSectionStart<0||evaChildSectionEnd<evaChildSectionStart)throw new Error('任务详情子任务区边界不匹配');
    source=root.__evaCut(source,source.slice(evaChildSectionStart,evaChildSectionEnd),String.raw`React.createElement("div",{className:"loop-idp__section eva-loop-subtasks"},React.createElement("div",{className:"loop-idp__stitle loop-idp__desc-title eva-loop-subtasks__head"},React.createElement("span",null,St("loop.subIssue.title"),React.createElement("em",{className:"loop-idp__count"}," ",Oi," / ",evaSubtaskTotal)),!Ct&&React.createElement("div",{className:"eva-loop-subtasks__actions"},React.createElement(Button,{theme:"borderless",size:"small",icon:React.createElement(Plus$c,{size:14}),onClick:()=>evaOpenChildCreator(xt)},"新建子任务"))),React.createElement("div",{className:"eva-loop-subtasks__progress",role:"progressbar","aria-label":"子任务完成进度","aria-valuemin":0,"aria-valuemax":evaSubtaskTotal,"aria-valuenow":Oi},React.createElement("span",{style:{width:evaSubtaskTotal?Oi/evaSubtaskTotal*100+"%":"0%"}})),evaSubtaskTotal?React.createElement(EvaIssueDetailSubtaskTree,{rootIssue:xt,onOpen:Ea,readOnly:Ct}):React.createElement("div",{className:"eva-loop-subtasks__empty"},React.createElement("span",null,"暂无子任务，可从这里开始拆分下一步。"),!Ct&&React.createElement(Button,{theme:"light",size:"small",icon:React.createElement(EvaHierarchyIcon,{size:14}),onClick:()=>evaOpenChildCreator(xt)},"开始分解")))`,'任务详情仅以递归层级树展示全部后代');
    source=root.__evaCut(source,
      'Hi("props")&&React.createElement("div",{className:"loop-idp__asec-body"},React.createElement("div",{className:"loop-idp__prop loop-idp__prop--inline"},React.createElement("span",{className:"loop-idp__prop-k"},St("loop.field.status"))',
      'Hi("props")&&React.createElement("div",{className:"loop-idp__asec-body"},xt.parent_issue_id&&React.createElement("div",{className:"loop-idp__prop loop-idp__prop--parent"},React.createElement("span",{className:"loop-idp__prop-k"},"父任务"),Ct?React.createElement("span",{className:"loop-idp__prop-v"},evaParentIssue?evaParentIssue.identifier+" "+evaParentIssue.title:xt.parent_issue_id):React.createElement("button",{type:"button",className:"loop-idp__parent-link",onClick:()=>Ea(xt.parent_issue_id)},evaParentIssue?evaParentIssue.identifier+" "+evaParentIssue.title:xt.parent_issue_id)),React.createElement("div",{className:"loop-idp__prop loop-idp__prop--inline"},React.createElement("span",{className:"loop-idp__prop-k"},St("loop.field.status"))',
      '任务详情属性区显示父任务');
    // Eva 的任务归属由入口和顶部路径决定；详情与创建表单一致，不再提供旧 Loop 项目切换行。
    source=root.__evaCut(source,
      'React.createElement("div",{className:"loop-idp__prop loop-idp__prop--inline"},React.createElement("span",{className:"loop-idp__prop-k"},St("loop.field.project")),Ct?React.createElement("span",{className:"loop-idp__prop-v"},xt.project_name??St("loop.field.noProject")):React.createElement(Dropdown,{trigger:"click",position:"bottomRight",clickToHide:!0,render:React.createElement(Dropdown.Menu,null,React.createElement(Dropdown.Item,{active:!xt.project_id,onClick:()=>Ta({project_id:null})},St("loop.field.noProject")),cn.length>0&&React.createElement(Dropdown.Divider,null),cn.map(ki=>React.createElement(Dropdown.Item,{key:ki.id,active:xt.project_id===ki.id,onClick:()=>Ta({project_id:ki.id})},ki.icon," ",ki.title)))},React.createElement("button",{type:"button",className:"loop-idp__prop-edit loop-idp__prop-edit--text"},xt.project_name??St("loop.field.noProject"),React.createElement(ChevronDown,{size:12,className:"loop-idp__prop-caret"})))),',
      'React.createElement("div",{className:"loop-idp__prop loop-idp__prop--inline loop-idp__prop--due"},React.createElement("span",{className:"loop-idp__prop-k"},St("loop.field.dueDate")),Ct?React.createElement("span",{className:"loop-idp__prop-v loop-idp__due-value"},React.createElement(CalendarClock,{size:13}),xt.due_date?formatShortDate(xt.due_date):"未设置"):React.createElement(DatePicker,{className:"loop-idp__due-picker",type:"date",density:"compact",format:"yyyy-MM-dd",value:xt.due_date?xt.due_date.slice(0,10):void 0,placeholder:"未设置","aria-label":"截止日期",showClear:!0,onChange:(ki,Wi)=>Ta({due_date:Wi||null}),style:{width:132}})),',
      '截止日期在主属性区且移除旧 Loop 项目切换行');
    source=root.__evaCut(source,
      ',reactExports.useEffect(()=>{Ct||listProjects().then(Cn).catch(()=>{})},[Ct])',
      '',
      '移除仅项目切换使用的候选加载');
    // Eva 每个协作项目独立，任务归属不再有第二层项目维度：筛选面板不提供项目与含无项目。
    source=root.__evaCut(source,
      'qr.length>0&&ca(pt("loop.filter.project"),sn.projectIds,$a=>wa({projectIds:$a}),Fa,{filter:!0}),React.createElement("div",{className:"loop-fields__row"},React.createElement(CheckboxWithGroup,{className:"loop-nofilter",checked:sn.noProject,onChange:$a=>wa({noProject:!!$a.target.checked}),disabled:Sa},pt("loop.filter.noProject"))),',
      '',
      '任务筛选移除项目与含无项目');
    source=root.__evaCut(source,
      'Fa=qr.map($a=>React.createElement(Select.Option,{key:$a.id,value:$a.id},$a.title)),',
      '',
      '移除项目筛选项构建');
    source=root.__evaCut(source,
      '+(sn.projectIds.length||sn.noProject?1:0)',
      '',
      '筛选项计数不含项目');
    source=root.__evaCut(source,
      'project_ids:sn.projectIds.length?sn.projectIds:void 0,include_no_project:sn.noProject||void 0,',
      '',
      '任务查询不带项目维度');
    source=root.__evaCut(source,
      'projectIds:stringList(rt.projectIds),noProject:rt.noProject===!0,',
      'projectIds:[],noProject:!1,',
      '旧的已保存项目筛选不再生效');
    source=root.__evaCut(source,
      'React.createElement(AssigneePicker,{size:"small",value:xt.assignee_id,valueName:xt.assignee_name??null,onChange:(ki,Wi,no)=>oa(xt,Wi,ki,no,ls=>Ta({assignee_id:ki,assignee_type:Wi,...ls}))})',
      'React.createElement(AssigneePicker,{size:"small",value:xt.assignee_id,valueName:xt.assignee_name??null,onChange:(ki,Wi,no)=>oa(xt,Wi,ki,no,ls=>Ta({assignee_id:ki,assignee_type:Wi,...ls}))})',
      '任务详情负责人选择器开启搜索');
    source=root.__evaCut(source,
      'React.createElement("div",{className:"loop-fields__inline"},React.createElement("div",{style:{flex:1}},React.createElement("div",{className:"loop-fields__label"},St("loop.field.startDate")),React.createElement(DatePicker,{type:"date",format:"yyyy-MM-dd",value:xt.start_date?xt.start_date.slice(0,10):void 0,onChange:(ki,Wi)=>Ta({start_date:Wi||""}),style:{width:"100%"}})),React.createElement("div",{style:{flex:1}},React.createElement("div",{className:"loop-fields__label"},St("loop.field.dueDate")),React.createElement(DatePicker,{type:"date",format:"yyyy-MM-dd",value:xt.due_date?xt.due_date.slice(0,10):void 0,onChange:(ki,Wi)=>Ta({due_date:Wi||""}),style:{width:"100%"}})))',
      'React.createElement("div",null,React.createElement("div",{className:"loop-fields__label"},St("loop.field.startDate")),React.createElement(DatePicker,{type:"date",format:"yyyy-MM-dd",value:xt.start_date?xt.start_date.slice(0,10):void 0,onChange:(ki,Wi)=>Ta({start_date:Wi||""}),style:{width:"100%"}}))',
      '截止日期从更多属性提升到主属性区');
    source=root.__evaCut(source,
      'ln.map(ki=>React.createElement(Select.Option,{key:ki.id,value:ki.id},ki.identifier," ",ki.title))',
      'ln.filter(ki=>!evaIssueDescendantIds(rt).has(ki.id)).map(ki=>React.createElement(Select.Option,{key:ki.id,value:ki.id},ki.identifier," ",ki.title))',
      '父任务选择器排除后代任务');
    source=root.__evaCut(source,
      'React.createElement(CreateIssueModal,{visible:tn,parentIssueId:rt,onClose:()=>Kt(!1),onCreated:()=>{Toast.success(St("loop.toast.created")),listChildren(rt).then(jt).catch(()=>{}),ct?.()}})',
      'React.createElement(CreateIssueModal,{visible:tn,parentIssueId:evaChildParent?.id||rt,parentIssue:evaChildParent||xt,onClose:()=>{Kt(!1),evaSetChildParent(null)},onCreated:ki=>{Toast.success("子任务 "+(ki?.identifier||"")+" 已创建"),Kt(!1),evaSetChildParent(null),ca(),ct?.()}})',
      '任务详情创建任意节点的子任务');
    const evaTaskDetailStart=source.indexOf('function IssueDetailPage('),evaTaskDetailEnd=source.indexOf('function readView(',evaTaskDetailStart);
    if(evaTaskDetailStart<0||evaTaskDetailEnd<evaTaskDetailStart)throw new Error('任务详情预览挂载边界不匹配');
    const evaTaskDetailSource=source.slice(evaTaskDetailStart,evaTaskDetailEnd);
    if(!evaTaskDetailSource.endsWith(')}'))throw new Error('任务详情预览根节点边界不匹配');
    const evaTaskDetailWithPreview=evaTaskDetailSource.slice(0,-2)+',evaTaskFilePreview&&reactDomExports.createPortal(React.createElement("div",{className:"eva-task-file-fs",role:"dialog","aria-modal":"true","aria-label":"任务附件预览"},React.createElement("div",{className:"eva-task-file-fs__stage"},React.createElement(FilePreviewHost,{file:evaTaskFilePreview,onClose:()=>setEvaTaskFilePreview(null)}))),document.querySelector(".collab-body")||document.body))}';
    source=root.__evaCut(source,evaTaskDetailSource,evaTaskDetailWithPreview,'任务附件预览铺满工作区(portal 到 collab-body)');
    source=root.__evaCut(source,'const sa=skillSource();return React.createElement("div",{className:"loop-sd"}', 'const sa=["github","local","workspace"].includes(mt.source_type)?mt.source_type:"workspace";return React.createElement("div",{className:"loop-sd"}', '技能来源读取元数据而非异步内容请求');
    const contributionStart=source.indexOf('getAgentContributions=rt=>{'),contributionEnd=source.indexOf(',getAgentEnv=',contributionStart);
    if(contributionStart<0||contributionEnd<contributionStart)throw new Error('专家活跃记录边界不匹配');
    source=root.__evaCut(source,source.slice(contributionStart,contributionEnd),String.raw`getAgentContributions=rt=>listAgentTasks(rt).then(runs=>{const counts=new Map();for(const run of runs){const day=String(run.created_at||'').slice(0,10);if(day)counts.set(day,(counts.get(day)||0)+1);}const end=new Date();end.setUTCHours(0,0,0,0);return Array.from({length:120},(_,index)=>{const date=new Date(end.getTime()-(119-index)*864e5).toISOString().slice(0,10);return {date,count:counts.get(date)||0};});})`,'专家活跃统计取自同一运行记录');
    source=root.__evaCut(source,'ut("loop.agent.successAvg",{values:{pct:bi.successPct,avg:formatDurationMs(bi.avgMs)}})', 'bi.terminalCount?ut("loop.agent.successAvg",{values:{pct:bi.successPct,avg:formatDurationMs(bi.avgMs)}}):"暂无已结束运行，成功率与耗时尚不可用"', '专家无运行时不显示虚构成功率');
    source=root.__evaCut(source,'St("loop.field.creator")','"创建者"','详情创建者文案');
    // 来源者与创建者在详情中都可修改：来源者在先、创建者在后；来源者限本项目联系人，创建者限本项目人类或 AI。
    source=root.__evaCut(source,
      'React.createElement("div",{className:"loop-idp__prop loop-idp__prop--inline"},React.createElement("span",{className:"loop-idp__prop-k"},"创建者"),React.createElement("span",{className:"loop-idp__prop-person"},React.createElement(EvaLoopIdentityAvatar,{person:{id:xt.creator_id,name:xt.creator_name,type:"member",avatar:xt.creator_avatar}}),xt.creator_name??"—")),React.createElement("div",{className:"loop-idp__prop loop-idp__prop--inline"},React.createElement("span",{className:"loop-idp__prop-k"},St("loop.detail.created")),React.createElement("span",{className:"loop-idp__prop-v loop-idp__prop-v--muted"},fmt(xt.created_at)))',
      'React.createElement("div",{className:"loop-idp__prop loop-idp__prop--inline"},React.createElement("span",{className:"loop-idp__prop-k"},"来源者"),Ct?(xt.source_id?React.createElement("span",{className:"loop-idp__prop-person"},React.createElement(EvaLoopIdentityAvatar,{person:{id:xt.source_id,name:xt.source_name,type:xt.source_type||"member"}}),React.createElement(EvaLoopIdentityName,{person:{id:xt.source_id,name:xt.source_name,type:xt.source_type||"member"}})):React.createElement("span",{className:"loop-idp__prop-v loop-idp__prop-v--muted"},"未设置")):React.createElement(AssigneePicker,{size:"small",types:["member","agent"],allowClear:false,candidates:evaTaskIdentityCandidates(xt.workspace_id||currentSpaceId()),value:xt.source_id,valueName:xt.source_name??null,onChange:ki=>Ta({source_id:ki})})),React.createElement("div",{className:"loop-idp__prop loop-idp__prop--inline"},React.createElement("span",{className:"loop-idp__prop-k"},"创建者"),Ct?React.createElement("span",{className:"loop-idp__prop-person"},React.createElement(EvaLoopIdentityAvatar,{person:{id:xt.creator_id,name:xt.creator_name,type:xt.creator_type||"member",avatar:xt.creator_avatar}}),React.createElement(EvaLoopIdentityName,{person:{id:xt.creator_id,name:xt.creator_name,type:xt.creator_type||"member"}})):React.createElement(AssigneePicker,{size:"small",types:["member","agent"],allowClear:false,candidates:evaTaskIdentityCandidates(xt.workspace_id||currentSpaceId()),value:xt.creator_id,valueName:xt.creator_name??null,onChange:ki=>Ta({creator_id:ki})})),React.createElement("div",{className:"loop-idp__prop loop-idp__prop--inline"},React.createElement("span",{className:"loop-idp__prop-k"},St("loop.detail.created")),React.createElement("span",{className:"loop-idp__prop-v loop-idp__prop-v--muted"},fmt(xt.created_at)))',
      '详情来源者与创建者可编辑');
    source=root.__evaCut(source,'function CreateIssueModal(props){',String.raw`function EvaChatTaskList({projectId,conversationId,messages=[],onClose,onCreate}){
      const h=React.createElement,store=evaMembers().store;reactExports.useSyncExternalStore(store.subscribe,store.getSnapshot);
      const actor=store.snapshot().actorId,allowed=store.canRead(projectId,actor)&&store.canRead(conversationId,actor),text=messages.map(m=>m.text||m.content||"").join(" ");
      const tasks=allowed?(ISSUES_BY_SPACE[projectId]||[]).filter(t=>t.source_conversation_id===conversationId||messages.some(m=>m.taskId===t.id||m.issue_id===t.id)||text.split(/[^A-Z0-9-]+/).includes(t.identifier)):[];
      return h("aside",{className:"eva-chat-task-list"},h("header",{className:"wk-thread-panel-header"},h("strong",null,"聊天任务（"+tasks.length+"）"),h(Button,{theme:"borderless",icon:h(X,{size:18}),"aria-label":"关闭聊天任务",onClick:onClose})),h("div",{className:"eva-chat-task-list-body"},h(Button,{theme:"light",icon:h(Plus$c,{size:16}),block:true,disabled:!allowed,onClick:onCreate},"新建任务"),tasks.length?tasks.map(t=>h("button",{type:"button",key:t.id,className:"eva-chat-task-card",onClick:()=>{if(!store.canRead(projectId,actor)||!store.canRead(conversationId,actor))return;onClose();window.__evaOpenWorkspaceFromTree?.(projectId,"tasks");requestAnimationFrame(()=>WKApp$1.routeRight.push(h(IssueDetailPage,{issueId:t.id,onChanged:()=>{},onClose:()=>WKApp$1.routeRight.pop()})));}},h("span",{className:"eva-chat-task-meta"},t.identifier,h("span",null,({backlog:"待规划",todo:"待办",in_progress:"进行中",in_review:"审核中",done:"已完成",blocked:"受阻",cancelled:"已取消"})[t.status])),h("strong",null,t.title),h("span",{className:"eva-chat-task-meta"},t.assignee_id?h(EvaLoopIdentityAvatar,{person:{id:t.assignee_id,name:t.assignee_name,type:t.assignee_type}}):null,h("span",null,t.assignee_name||"未指派"),h("span",null,({urgent:"紧急",high:"高优先级",medium:"中优先级",low:"低优先级",none:""})[t.priority])))):h("p",{className:"eva-members-muted"},"当前聊天暂无关联任务，在这里新建后即可查看。")));
    }
    function CreateIssueModal(props){`,'chat task list');
    // The project skill creator owns its modal state; the legacy list keeps only open/closed.
    const skillPageStart=source.indexOf('function SkillPage(){'),skillPageEnd=source.indexOf('function ',skillPageStart+20);
    if(skillPageStart<0||skillPageEnd<skillPageStart)throw new Error('技能列表组件边界不匹配');
    let skillPage=source.slice(skillPageStart,skillPageEnd);
    const stateStart=skillPage.indexOf(',[Ht,jt]='),stateEnd=skillPage.indexOf(',Jr=reactExports.useCallback',stateStart);
    const handlerStart=skillPage.indexOf('oa=()=>{Vt(!0)'),handlerEnd=skillPage.indexOf('pa=async ga=>',handlerStart);
    const modalStart=skillPage.indexOf('React.createElement(Modal,{className:"loop-modal",visible:Qt');
    if([stateStart,stateEnd,handlerStart,handlerEnd,modalStart].some(i=>i<0)||!skillPage.endsWith(')}'))throw new Error('技能创建弹窗锚点不匹配');
    skillPage=skillPage.slice(0,modalStart)+`Qt&&window.EvaProjectSkillCreate.render({onClose:()=>Vt(!1),onCreated:(skill,imported)=>{Vt(!1);Jr();if(imported)ia(skill.id);},existingNames:ut.map(s=>s.name),projectId:currentSpaceId()},{React:reactExports,Modal,Button,LoopButton,Input:ForwardInput,FileText,Upload:Upload,Plus:Plus$c,parseFrontmatter,ensureSkillFrontmatter,setFrontmatterField,isValidSkillName,createSkill,Toast}))}`;
    skillPage=skillPage.slice(0,handlerStart)+'oa=()=>Vt(!0),'+skillPage.slice(handlerEnd);
    skillPage=skillPage.slice(0,stateStart)+skillPage.slice(stateEnd);
    source=root.__evaCut(source,source.slice(skillPageStart,skillPageEnd),skillPage,'项目技能双入口');
    source=root.__evaCut(source,'createSkill=rt=>{const ct={...SKILLS[0],...rt,id:`sk-${Date.now().toString(36)}`,name:rt.name??"新技能"};return SKILLS.push(ct),Promise.resolve(ct)}',String.raw`createSkill=rt=>{
      if(rt.workspace_id&&rt.workspace_id!==currentSpaceId())return Promise.reject(new Error("项目已切换，请重新打开技能创建窗口"));
      const list=skillsOf(),name=String(rt.name||"").trim();
      if(!isValidSkillName(name))return Promise.reject(new Error("名称仅支持英文字母、数字、连字符和下划线"));
      if(list.some(s=>s.name.toLowerCase()===name.toLowerCase()))return Promise.reject(new Error("当前项目已有同名技能，请修改名称"));
      const now=new Date().toISOString(),skill={...rt,id:"sk-"+crypto.randomUUID(),workspace_id:currentSpaceId(),name,source_type:"workspace",created_at:now,updated_at:now};
      list.push(skill);return Promise.resolve(skill);
    }`,'技能创建写入当前项目');
    source=root.__evaCut(source,'getSkill=rt=>Promise.resolve(skillsOf().find(ct=>ct.id===rt)??SKILLS[0])','getSkill=rt=>{const skill=skillsOf().find(ct=>ct.id===rt);return skill?Promise.resolve(skill):Promise.reject(new Error("当前项目找不到该技能"))}','技能详情按项目读取');
    source=root.__evaCut(source,'updateSkill=(rt,ct)=>{const ut=skillsOf().find(pt=>pt.id===rt)??SKILLS[0];return Object.assign(ut,ct),Promise.resolve(ut)}','updateSkill=(rt,ct)=>{const ut=skillsOf().find(pt=>pt.id===rt);if(!ut)return Promise.reject(new Error("当前项目找不到该技能"));if(skillsOf().some(s=>s.id!==rt&&s.name.toLowerCase()===ct.name?.toLowerCase()))return Promise.reject(new Error("当前项目已有同名技能"));return Object.assign(ut,ct,{updated_at:new Date().toISOString()}),Promise.resolve(ut)}','技能编辑保留当前项目');
    source=root.__evaCut(source,'deleteSkill=rt=>{const ct=SKILLS.findIndex(ut=>ut.id===rt);return ct>=0&&SKILLS.splice(ct,1),Promise.resolve()}','deleteSkill=rt=>{const list=skillsOf(),index=list.findIndex(s=>s.id===rt);if(index>=0)list.splice(index,1);return Promise.resolve()}','技能删除作用于当前项目');
    source=root.__evaCut(source,'map(ct=>({path:ct.path,content:ct.content}))','map(ct=>({...ct}))','技能附件保留二进制元数据');
    source=root.__evaCut(source,'React.createElement(SkillFileViewer,{key:Ht,path:Ht,content:ur,onChange:qr})','Qt.find(f=>f.path===Ht)?.encoding==="base64"?window.EvaProjectSkillCreate.binaryPreview(React,Qt.find(f=>f.path===Ht)):React.createElement(SkillFileViewer,{key:Ht,path:Ht,content:ur,onChange:qr})','二进制附件只读下载');
    // Loop task status compatibility belongs to the shared data adapter, not a view.
    // 负责人只能是本项目联系人，候选不再回落到旧 Loop 全局列表（专家团、其他项目 AI）。
    source=root.__evaCut(source,
      'React.createElement(AssigneePicker,{size:"small",value:xt.assignee_id,valueName:xt.assignee_name??null,onChange:(ki,Wi,no)=>oa(xt,Wi,ki,no,ls=>Ta({assignee_id:ki,assignee_type:Wi,...ls}))})',
      'React.createElement(AssigneePicker,{size:"small",candidates:evaTaskProjectIdentities(xt.workspace_id||currentSpaceId(),"member"),value:xt.assignee_id,valueName:xt.assignee_name??null,onChange:(ki,Wi,no)=>oa(xt,Wi,ki,no,ls=>Ta({assignee_id:ki,assignee_type:Wi,...ls}))})',
      '详情负责人候选只限本项目联系人');
    source=root.__evaCut(source,
      'React.createElement(AssigneePicker,{size:"small",value:rn.assignee_id,valueName:rn.assignee_name??null,onChange:(cn,Cn,ir)=>St(rn,Cn,cn,ir,sr=>Qt(rn.id,{...sr}))})',
      'React.createElement(AssigneePicker,{size:"small",candidates:evaTaskProjectIdentities(currentSpaceId(),"member"),value:rn.assignee_id,valueName:rn.assignee_name??null,onChange:(cn,Cn,ir)=>St(rn,Cn,cn,ir,sr=>Qt(rn.id,{...sr}))})',
      '列表负责人候选只限本项目联系人');
    source=root.__evaCut(source,
      'React.createElement(AssigneePicker,{size:"small",value:null,valueName:null,onChange:(Kt,nn)=>tn(()=>batchUpdateIssues(xt,{assignee_id:Kt,assignee_type:nn,suppress_run:!0}))})',
      'React.createElement(AssigneePicker,{size:"small",candidates:evaTaskProjectIdentities(currentSpaceId(),"member"),value:null,valueName:null,onChange:(Kt,nn)=>tn(()=>batchUpdateIssues(xt,{assignee_id:Kt,assignee_type:nn,suppress_run:!0}))})',
      '批量指派候选人只限本项目联系人');
    source=root.__evaCut(source,'issuesOf=()=>scoped(ISSUES_BY_SPACE);function groupIssuesByAssignee',String.raw`issuesOf=()=>evaNormalizeTaskList(scoped(ISSUES_BY_SPACE));
    function evaNormalizeTaskStatus(status){return status==='backlog'?'todo':status}
    // 任务身份解析：联系人不限项目；AI 分身与数字员工必须已加入所在项目（传入 scope 时校验）。
    function evaResolveTaskIdentity(id,scope){
      const store=evaMembers().store,snapshot=store.snapshot();
      const human=(snapshot.people||[]).find(person=>person.id===id);
      if(human)return{type:"member",name:human.name,avatar:human.avatar||""};
      const clone=(snapshot.clones||[]).find(clone=>clone.id===id&&clone.active!==false);
      const employee=clone?null:store.employee(id);
      const identity=clone?{type:"agent",name:clone.name,avatar:clone.avatar||""}:employee?{type:"agent",name:employee.name,avatar:employee.avatar||""}:null;
      if(identity&&scope&&![...(scope.cloneIds||[]),...(scope.employeeIds||[])].includes(id))return null;
      return identity;
    }
    function evaNormalizeTaskList(issues){for(const issue of issues){issue.status=evaNormalizeTaskStatus(issue.status);evaEnsureTaskSource(issue);}return issues}
    // 旧任务缺来源者时回退到创建者本人；只在初始化后使用任务自身字段，
    // 不能在模块初始化期调用 evaMembers()（成员 store 尚未初始化）。
    function evaEnsureTaskSource(issue){
      if(issue.source_id)return issue;
      const creatorId=issue.creator_id;
      if(!creatorId)return issue;
      issue.source_id=creatorId;issue.source_name=issue.creator_name||"";issue.source_type='member';
      return issue;
    }
    // 负责人候选仍限本项目联系人（kinds 为 "member" 时仅成员）；来源者与创建者不限项目。
    function evaTaskProjectIdentities(pid,kinds){
      const store=evaMembers().store,snapshot=store.snapshot(),scope=snapshot.projects[pid];
      if(!scope)return[];
      const humans=(scope.humans||[]).map(row=>snapshot.people.find(person=>person.id===row.id)).filter(Boolean).map(person=>({id:person.id,type:"member",name:person.name,avatar:person.avatar}));
      if(kinds==="member")return humans;
      const clones=(scope.cloneIds||[]).map(id=>snapshot.clones.find(clone=>clone.id===id)).filter(Boolean).map(clone=>({id:clone.id,type:"agent",group:"clone",name:clone.name}));
      const employees=(scope.employeeIds||[]).map(id=>store.employee(id)).filter(Boolean).map(employee=>({id:employee.id,type:"agent",group:"employee",name:employee.name}));
      return[...humans,...clones,...employees];
    }
    // 来源者与创建者的候选：全部联系人 + 已加入当前项目的 AI 分身与数字员工；不含项目管家。
    function evaTaskIdentityCandidates(pid){
      const store=evaMembers().store,snapshot=store.snapshot(),scope=snapshot.projects[pid||currentSpaceId()];
      const humans=(snapshot.people||[]).map(person=>({id:person.id,type:"member",name:person.name,avatar:person.avatar}));
      const clones=(scope?(scope.cloneIds||[]):[]).map(id=>snapshot.clones.find(clone=>clone.id===id)).filter(Boolean).filter(clone=>clone.active!==false).map(clone=>({id:clone.id,type:"agent",group:"clone",name:clone.name}));
      const employees=(scope?(scope.employeeIds||[]):[]).map(id=>store.employee(id)).filter(Boolean).map(employee=>({id:employee.id,type:"agent",group:"employee",name:employee.name,kind:"employee",identityAppearance:window.EvaDigitalEmployeesStore?.appearance?.(employee)}));
      return[...humans,...clones,...employees];
    }
    function groupIssuesByAssignee`,'旧任务状态兼容');
    source=root.__evaCut(source,'ISSUES_BY_SPACE={prod:window.__EVA_SUPPLY_CHAIN_DEMO.issues,"drive-design":window.__EVA_DRIVE_DEMO.issues,official:window.__EVA_OFFICIAL_TASKS,lab:window.__EVA_CLIENT_TASKS}',
      'ISSUES_BY_SPACE={prod:evaNormalizeTaskList(window.__EVA_SUPPLY_CHAIN_DEMO.issues),"drive-design":evaNormalizeTaskList(window.__EVA_DRIVE_DEMO.issues),official:evaNormalizeTaskList(window.__EVA_OFFICIAL_TASKS),lab:evaNormalizeTaskList(window.__EVA_CLIENT_TASKS)}','所有项目初始任务状态兼容');
    for(const name of ['ISSUE_STATUS_ORDER','STATUSES'])source=root.__evaCut(source,`${name}=["backlog","todo","in_progress","in_review","done","blocked","cancelled"]`,`${name}=["todo","in_progress","in_review","done","blocked","cancelled"]`,'合并任务状态枚举 '+name);
    source=root.__evaCut(source,'status:rt.status||"todo"','status:evaNormalizeTaskStatus(rt.status)||"todo"','创建任务旧状态兼容');
    source=root.__evaCut(source,'statuses:enumList(rt.statuses,STATUSES)','statuses:enumList(Array.isArray(rt.statuses)?rt.statuses.map(evaNormalizeTaskStatus):rt.statuses,STATUSES)','保存筛选状态兼容');
    source=root.__evaCut(source,'ct.statuses.includes(pt.status)','ct.statuses.map(evaNormalizeTaskStatus).includes(evaNormalizeTaskStatus(pt.status))','查询旧状态兼容');
    source=root.__evaCut(source,'function needsConfirm(rt){return isAgentAssignee(rt.assigneeType,rt.assigneeId)&&rt.status!=="backlog"}','function needsConfirm(){return false}','指派AI不等于启动执行');
    source=root.__evaCut(source,'function statusMightTrigger(rt,ct){return isAgentAssignee(rt.assignee_type,rt.assignee_id)&&rt.status==="backlog"&&ct!=="backlog"&&ct!=="done"&&ct!=="cancelled"}','function statusMightTrigger(){return false}','任务状态不触发执行');
    // Compatibility labels remain for historical activity/snapshots only; no new backlog option.
    for(let index=0;index<3;index++)source=root.__evaCut(source,'backlog:"待规划"','backlog:"待办"','历史任务状态文案 '+index);
    // 「表格」视图（对齐 Multica Issues Table）：注入桥接组件依赖。
    source=root.__evaCut(source,'function IssuePage({defaultScope:rt,defaultView:ct,viewKey:ut}={}){',
      String.raw`const EvaTable2Icon=createLucideIcon("table-2",[["path",{d:"M9 3H5a2 2 0 0 0-2 2v4m6-6h10a2 2 0 0 1 2 2v4M9 3v18m0 0h10a2 2 0 0 0 2-2V9M9 21H5a2 2 0 0 1-2-2V9m0 0h18",key:"t2-1"}]]);
const EvaColumns3Icon=createLucideIcon("columns-3",[["rect",{width:"18",height:"18",x:"3",y:"3",rx:"2",key:"c3-1"}],["path",{d:"M9 3v18",key:"c3-2"}],["path",{d:"M15 3v18",key:"c3-3"}]]);
const EvaRows3Icon=createLucideIcon("rows-3",[["rect",{width:"18",height:"18",x:"3",y:"3",rx:"2",key:"r3-1"}],["path",{d:"M21 9H3",key:"r3-2"}],["path",{d:"M21 15H3",key:"r3-3"}]]);
const EvaGripVerticalIcon=createLucideIcon("grip-vertical",[["circle",{cx:"9",cy:"12",r:"1",key:"gv-1"}],["circle",{cx:"9",cy:"5",r:"1",key:"gv-2"}],["circle",{cx:"9",cy:"19",r:"1",key:"gv-3"}],["circle",{cx:"15",cy:"12",r:"1",key:"gv-4"}],["circle",{cx:"15",cy:"5",r:"1",key:"gv-5"}],["circle",{cx:"15",cy:"19",r:"1",key:"gv-6"}]]);
const EvaEyeOffIcon=createLucideIcon("eye-off",[["path",{d:"M10.733 5.076a10.744 10.744 0 0 1 11.205 6.575 1 1 0 0 1 0 .696 10.747 10.747 0 0 1-1.444 2.49",key:"eo-1"}],["path",{d:"M14.084 14.158a3 3 0 0 1-4.242-4.242",key:"eo-2"}],["path",{d:"M17.479 17.499a10.75 10.75 0 0 1-15.417-5.151 1 1 0 0 1 0-.696 10.75 10.75 0 0 1 4.446-5.143",key:"eo-3"}],["path",{d:"m2 2 20 20",key:"eo-4"}]]);
const EvaDownloadIcon=createLucideIcon("download",[["path",{d:"M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4",key:"dl-1"}],["polyline",{points:"7 10 12 15 17 10",key:"dl-2"}],["line",{x1:"12",x2:"12",y1:"15",y2:"3",key:"dl-3"}]]);
const EvaCheckIcon=createLucideIcon("check",[["path",{d:"M20 6 9 17l-5-5",key:"ck-1"}]]);
const EvaCalendarDaysIcon=createLucideIcon("calendar-days",[["path",{d:"M8 2v4",key:"cd-1"}],["path",{d:"M16 2v4",key:"cd-2"}],["rect",{width:"18",height:"18",x:"3",y:"4",rx:"2",key:"cd-3"}],["path",{d:"M3 10h18",key:"cd-4"}],["path",{d:"M8 14h.01",key:"cd-5"}],["path",{d:"M12 14h.01",key:"cd-6"}],["path",{d:"M16 14h.01",key:"cd-7"}],["path",{d:"M8 18h.01",key:"cd-8"}],["path",{d:"M12 18h.01",key:"cd-9"}],["path",{d:"M16 18h.01",key:"cd-10"}]]);
const EvaChevronLeftIcon=createLucideIcon("chevron-left",[["path",{d:"m15 18-6-6 6-6",key:"cl-1"}]]);
function EvaIssueTableView(props){return window.EvaLoopTableView.render(props,{React:reactExports,useI18n:useI18n$1,Popover,Checkbox,Switch,Toast,DatePicker,Input:ForwardInput,AssigneePicker,LabelChips,RunningChip,useRunConfirm,EvaLoopIdentityAvatar,EvaLoopIdentityName,updateIssue,batchUpdateIssues,restoreIssues,batchDeleteIssues,confirmDelete,evaIssueChildrenOf,evaIssueDescendantIds,evaCurrentTaskProject,evaTaskProjectId,evaTaskLabels,evaAttachTaskLabel,evaDetachTaskLabel,evaCreateTaskLabel,ISSUE_STATUS_ORDER,ISSUE_STATUS_HEX,PRIORITY_ORDER,PRIORITY_HEX,DndContext,SortableContext,useSortable,useDndContext,useSensors:useSensors$1,useSensor,PointerSensor,KeyboardSensor,sortableKeyboardCoordinates,closestCenter,restrictToHorizontalAxis,horizontalListSortingStrategy,icons:{Search:Search$1,ChevronDown,ChevronRight,ChevronLeft:EvaChevronLeftIcon,Plus:Plus$c,X,Pencil,ArrowUp,ArrowDown,Download:EvaDownloadIcon,Trash2,Check:EvaCheckIcon,Table2:EvaTable2Icon,Columns3:EvaColumns3Icon,Rows3:EvaRows3Icon,GripVertical:EvaGripVerticalIcon,EyeOff:EvaEyeOffIcon,CalendarDays:EvaCalendarDaysIcon,CalendarClock}});}
function IssuePage({defaultScope:rt,defaultView:ct,viewKey:ut}={}){`,'表格视图桥接组件依赖注入');
    // 切换器加入「表格」，位于层级之后（第四种视图）。
    source=root.__evaCut(source,
      '["board","list","hierarchy"].map($a=>React.createElement("button",{key:$a,type:"button",role:"tab","aria-selected":Kt===$a,className:`loop-seg__btn${Kt===$a?" is-active":""}`,onClick:()=>Da($a)},$a==="board"?React.createElement(Workbench,{theme:"outline",size:"14",fill:"currentColor"}):$a==="grouped"?React.createElement(Users,{size:14}):$a==="list"?React.createElement(List$1,{size:14}):React.createElement(EvaHierarchyIcon,{size:14}),$a==="hierarchy"?"层级":pt(`loop.view.${$a}`)))',
      '["board","list","hierarchy","table"].map($a=>React.createElement("button",{key:$a,type:"button",role:"tab","aria-selected":Kt===$a,className:`loop-seg__btn${Kt===$a?" is-active":""}`,onClick:()=>Da($a)},$a==="board"?React.createElement(Workbench,{theme:"outline",size:"14",fill:"currentColor"}):$a==="grouped"?React.createElement(Users,{size:14}):$a==="list"?React.createElement(List$1,{size:14}):$a==="hierarchy"?React.createElement(EvaHierarchyIcon,{size:14}):React.createElement(EvaTable2Icon,{size:14}),$a==="hierarchy"?"层级":$a==="table"?"表格":pt(`loop.view.${$a}`)))',
      '项目任务切换器加入表格视图');
    // 视图持久化白名单加入 table（仅项目任务页）。
    source=root.__evaCut(source,
      'readView(ut,ut==="collab-tasks"?["board","list","hierarchy"]:["board","grouped","list","hierarchy"],ct??"board")',
      'readView(ut,ut==="collab-tasks"?["board","list","hierarchy","table"]:["board","grouped","list","hierarchy"],ct??"board")',
      '项目任务表格视图持久化');
    // 渲染分发加入表格分支。
    source=root.__evaCut(source,
      'running:Ft,resetKey:currentSpaceId()+"|"+rn}):React.createElement(React.Fragment,null,React.createElement(IssueList,',
      'running:Ft,resetKey:currentSpaceId()+"|"+rn}):Kt==="table"?React.createElement(EvaIssueTableView,{issues:Pt,allIssues:issuesOf(),onOpen:xa,onChanged:Oa,running:Ft,viewKey:ut,projectId:St,onCreateSubIssue:evaCreateChild}):React.createElement(React.Fragment,null,React.createElement(IssueList,',
      '项目任务表格视图渲染');
    return source;
  });
})(window);
