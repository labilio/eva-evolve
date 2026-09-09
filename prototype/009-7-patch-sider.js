(function (root) {
  'use strict';
  root.__evaPatch('sidebar', function (source) {
        /* Keep desktop sidebar sizing in the native layout state instead of a visual overlay.
         * 当前产品要求展开态默认 180px；折叠宽保持 80px。中间栏仍独立使用
         * 260px 默认宽度，不复用此处的全局导航尺寸。 */
        var sidebarWidthReplacements = [
          [
            'DEFAULT_SIDER_WIDTH=260,DESKTOP_COLLAPSED_WIDTH=0,SIDER_MIN_WIDTH=200',
            'DEFAULT_SIDER_WIDTH=180,DESKTOP_COLLAPSED_WIDTH=80,SIDER_MIN_WIDTH=200'
          ],
          [
            'Layout$1=({sider:rt,onSessionClick:ct})=>{const[ut,pt]=reactExports.useState(!1),[mt,gt]=reactExports.useState(!1),',
            'Layout$1=({sider:rt,onSessionClick:ct})=>{const[ut,pt]=reactExports.useState(!1),[mt,gt]=reactExports.useState(!1),'
          ],
          [
            'storageKey:"sider-width-px"',
            'storageKey:"eva-unified-sider-width-px-v2"'
          ],
          [
            '!mt&&$r({className:"z-20",style:{right:"-4px",width:"8px"},linePlacement:"start"})',
            '!mt&&$r({className:"z-20 eva-sider-resize-handle",style:{right:"-4px",width:"8px"},linePlacement:"start"})'
          ],
          [
            'minWidth:SIDER_MIN_WIDTH,maxWidth:Math.max(SIDER_MIN_WIDTH,Math.round(St*.5)),storageKey:"eva-unified-sider-width-px-v2",collapseThreshold:SIDER_MIN_WIDTH,collapsedWidth:DESKTOP_COLLAPSED_WIDTH,collapsed:ut,onCollapsedChange:pt',
            'minWidth:DEFAULT_SIDER_WIDTH,maxWidth:Math.max(SIDER_MIN_WIDTH,Math.round(St*.5)),storageKey:"eva-unified-sider-width-px-v2",collapseThreshold:SIDER_MIN_WIDTH,collapsedWidth:DESKTOP_COLLAPSED_WIDTH,collapsed:ut,onCollapsedChange:pt'
          ],
          [
            'style:{"--eva-sider-w":`${ut?0:Ir}px`}',
            'style:{"--eva-sider-w":`${ut?DESKTOP_COLLAPSED_WIDTH:Ir}px`}'
          ],
          [
            'React.createElement(LayoutComponent.Sider,{collapsedWidth:0,collapsed:ut,width:Ir,',
            'React.createElement(LayoutComponent.Sider,{collapsedWidth:DESKTOP_COLLAPSED_WIDTH,collapsed:ut,width:Ir,'
          ],
          [
            'value:{isMobile:mt,siderCollapsed:ut,setSiderCollapsed:pt}',
            'value:{isMobile:mt,siderCollapsed:ut,setSiderCollapsed:pt}'
          ],
          [
            /* 标题栏左上角按钮在桌面端切换窄版(80px)/宽版(180px)，不再整体隐藏侧栏。 */
            'ir=!!Pt?.setSiderCollapsed&&!(Pt?.isMobile&&sn)',
            'ir=!!Pt?.setSiderCollapsed&&!(Pt?.isMobile&&sn)'
          ],
          [
            'pr=Pt?.siderCollapsed?ct("common.expandMore",{defaultValue:"Expand sidebar"}):ct("common.collapse",{defaultValue:"Collapse sidebar"})',
            'pr=Pt?.siderCollapsed?ct("common.expandMore",{defaultValue:"Expand sidebar"}):ct("common.collapse",{defaultValue:"Collapse sidebar"})'
          ],
          [
            'ur=()=>{!ir||!Pt?.setSiderCollapsed||Pt.setSiderCollapsed(!Pt.siderCollapsed)}',
            'ur=()=>{if(!ir)return;Pt?.setSiderCollapsed?.(!Pt.siderCollapsed)}'
          ],
          [
            '}:{position:"relative",overflow:"visible"};return React.createElement(LayoutContext.Provider',
            '}:{position:"relative",overflow:"visible"};return React.createElement(LayoutContext.Provider'
          ],
          [
            'className:classNames("!bg-2 layout-sider",{collapsed:ut})',
            'className:classNames("!bg-2 layout-sider",{collapsed:ut})'
          ],
          [
            'if(isPrimaryApplicationShortcut(gt,{key:"b",targetGuard:"embedded-editor"})){gt.preventDefault(),ct();return}',
            ''
          ],
          [
            ',onDoubleClick:()=>{Ht(ct),Pt?.(!1)}',
            ',onDoubleClick:()=>{if(Kt?.includes("eva-sider-resize-handle")){xt?(Ht(ct),Pt?.(!1)):Pt?.(!0);return}Ht(ct),Pt?.(!1)}'
          ],
          [
            ',["切换侧栏","⌘ B"]',
            ''
          ]
        ];
        source = root.__evaCutAll(source, sidebarWidthReplacements, '侧栏宽度');

        source = root.__evaCut(
          source,
          ',!ut&&React.createElement("div",{className:"eva-promo-banner"},React.createElement("div",null,React.createElement("div",{className:"t1"},"打造王牌Skill"),React.createElement("div",{className:"t2"},"瓜分万元奖金池！")),React.createElement("span",{className:"coin"},"🪙"))',
          '',
          '移除侧栏广告栏'
        );

        /* 展开态最小宽度固定为 180px；拖到 200px 阈值时切换为 80px
         * 缩略态，避免在两者之间挤压、重排导航内容。折叠态右拖时不再消耗
         * 进入折叠的阈值，第一像素右移便直接恢复标准宽度。 */
        source = root.__evaCut(
          source,
          'const Ur=oa=>{if(Mt&&oa<St){hr||(hr=!0,Pt?.(!0));return}const ra=Mt?Math.max(ut,oa):oa;',
          'const Ur=oa=>{if(Mt&&oa<St&&!xt){hr||(hr=!0,Pt?.(!0));return}const ra=Mt?Math.max(ut,oa):oa;',
          '侧栏拖拽恢复阈值'
        );
        source = root.__evaCut(
          source,
          'if(ra!==null?Mt&&ra<St:hr)Pt?.(!0);else{',
          'if(ra!==null?Mt&&ra<St&&!xt:hr)Pt?.(!0);else{',
          '侧栏拖拽收尾阈值'
        );

        /*
         * Sidebar architecture: React owns mode and first-level navigation.
         * Personal/team entries are separate configs; common entries are defined once.
         * Inapplicable entries are never mounted, so hidden DOM cannot leak across modes.
         */
        source = root.__evaCutAll(source, [
          ['LABEL$1="消息"', 'LABEL$1="我的消息"'],
          ['LABEL$2="项目"', 'LABEL$2="我的项目"']
        ], '侧栏入口名称');
        var siderComponentAnchor = 'Sider=({onSessionClick:rt,collapsed:ct=!1})=>{';
        var siderArchitecture = String.raw`
SiderFooter=props=>{const[visible,setVisible]=reactExports.useState(false),navigate=useNavigate();return React.createElement(React.Fragment,null,React.createElement(EvaSiderFooterBase,{...props,isSettings:false,onSettingsClick:()=>setVisible(true)}),window.EvaSettingsUI.render({visible,onClose:()=>setVisible(false),navigate},{React:reactExports,Modal,Button,icons:{ChevronDown,MessageSquare,general:Settings,appearance:Monitor,engine:SlidersHorizontal,im:Bot,browser:Globe,mail:Mail$1,memory:Brain$8,shortcuts:Keyboard,about:Info$4,usage:createLucideIcon("chart-column",[["path",{d:"M3 3v18h18",key:"axes"}],["path",{d:"M18 17V9",key:"bar1"}],["path",{d:"M13 17V5",key:"bar2"}],["path",{d:"M8 17v-3",key:"bar3"}]])},pages:{general:EvaGeneral,appearance:EvaAppearance,engine:EvaEngine,im:EvaImBot,browser:EvaBrowser,mail:EvaMail,memory:EvaMemory,shortcuts:EvaShortcut,about:EvaAbout}}))},
EvaDigitalLinkIcon=createLucideIcon("link-2",[["path",{d:"M9 17H7A5 5 0 0 1 7 7h2",key:"left"}],["path",{d:"M15 7h2a5 5 0 0 1 0 10h-2",key:"right"}],["path",{d:"M8 12h8",key:"middle"}]]),EvaDigitalEmployeesPage=props=>{const navigate=useNavigate(),{search}=useLocation(),evaCreatorParams=new URLSearchParams(search),initialType=evaCreatorParams.get("evaCreate"),returnTo=evaCreatorParams.get("evaReturn");return window.EvaDigitalEmployeesUI.render({...props,navigate,initialType,returnTo},{React:reactExports,Button,Input:ForwardInput,TextArea,Select,Checkbox,Switch,Modal,Table,Tag,Toast,Dropdown,ChannelsView,icons:{Search:Search$1,More:EllipsisIcon,Sparkles,Users,Grid:LayoutGrid,File:FileText,Link:EvaDigitalLinkIcon,ArrowLeft:ArrowLeft$3},members:evaMembers().store,navigatePersonal:(id,go)=>go("/guid")})},EvaContactsIcon=createLucideIcon("book-user",[["path",{d:"M15 13a3 3 0 1 0-6 0",key:"book-user-avatar"}],["path",{d:"M17 18a5 5 0 0 0-10 0",key:"book-user-profile"}],["path",{d:"M4 19.5v-15A2.5 2.5 0 0 1 6.5 2H19a1 1 0 0 1 1 1v18a1 1 0 0 1-1 1H6.5a1 1 0 0 1 0-5H20",key:"book-user-book"}]]),EvaConnectionCenterIcon=createLucideIcon("unplug",[["path",{d:"M17 19a1 1 0 0 1-1-1v-2a2 2 0 0 1 2-2h2a2 2 0 0 1 2 2v2a1 1 0 0 1-1 1z",key:"unplug-socket"}],["path",{d:"M17 21v-2",key:"unplug-socket-pin"}],["path",{d:"M19 14V6.5a1 1 0 0 0-7 0v11a1 1 0 0 1-7 0V10",key:"unplug-cable"}],["path",{d:"M21 21v-2",key:"unplug-socket-pin-2"}],["path",{d:"M3 5V3",key:"unplug-plug-pin"}],["path",{d:"M4 10a2 2 0 0 1-2-2V6a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2a2 2 0 0 1-2 2z",key:"unplug-plug"}],["path",{d:"M7 5V3",key:"unplug-plug-pin-2"}]]),EvaDriveIcon=createLucideIcon("hard-drive",[["path",{d:"M10 16h.01",key:"1ra8yu"}],["path",{d:"M2.212 11.577a2 2 0 0 0-.212.896V18a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-5.527a2 2 0 0 0-.212-.896L18.55 5.11A2 2 0 0 0 16.76 4H7.24a2 2 0 0 0-1.79 1.11z",key:"1jiv2b"}],["path",{d:"M21.946 12.013H2.054",key:"12xlhc"}],["path",{d:"M6 16h.01",key:"1l4qyb"}]]),
EVA_PERSONAL_NAV=Object.freeze(["new-chat","my-ai","workboard","automation","connection-center"]),EVA_TEAM_NAV=Object.freeze(["messages","projects","contacts","drive","sites"]),EVA_COMMON_NAV=Object.freeze(["digital-employees","agent-create"]),
evaSidebarMode=(rt,ct)=>{const ut=new URLSearchParams(ct||"");if(rt==="/messages"&&ut.get("evaIM")==="my-ai")return"personal";if(rt==="/collab"||rt==="/messages"||rt==="/contacts"||rt==="/drive")return"collaboration";if(rt==="/guid"||rt.indexOf("/conversation/")===0||rt==="/scheduled"||rt.indexOf("/eva-stub/%E5%B7%A5%E4%BD%9C%E6%9D%BF")===0||rt.indexOf("/eva-stub/Agent")===0)return"personal";return ut.get("evaMode")==="collaboration"?"collaboration":"personal"},
evaSidebarSelectionFromRoute=(rt,ct)=>{if(rt==="/messages")return new URLSearchParams(ct||"").get("evaIM")==="my-ai"?"my-ai":"messages";if(rt==="/collab")return"projects";if(rt==="/contacts")return"contacts";if(rt==="/drive")return"drive";if(rt==="/scheduled")return"automation";if(rt==="/guid"||rt.indexOf("/conversation/")===0)return"new-chat";if(rt.indexOf("/eva-stub/%E5%B7%A5%E4%BD%9C%E6%9D%BF")===0)return"workboard";if(rt.indexOf("/eva-stub/Agent")===0)return"agent-create";if(rt.indexOf("/eva-stub/%E6%95%B0%E5%AD%97%E5%91%98%E5%B7%A5")===0)return"digital-employees";if(rt.indexOf("/eva-stub/%E6%8A%80%E8%83%BD")===0)return"connection-center";if(rt.indexOf("/eva-stub/%E7%AB%99%E7%82%B9")===0)return"sites";return""},
EvaPersonalEntry=rt=>React.createElement("div",{className:classNames("eva-personal-entry",rt.collapsed&&"is-collapsed",rt.isActive&&"is-selected"),"data-eva-my-assistant-identity":"true","aria-current":rt.isActive?"page":void 0},React.createElement("button",{type:"button",className:"eva-personal-entry__main",onClick:rt.onClick,"aria-label":"Eva 同学",title:"Eva 同学"},React.createElement("span",{className:"eva-personal-entry__logo"},React.createElement("img",{src:window.__EVA_COLLEAGUE_PORTRAIT,alt:""})),React.createElement("span",{className:"eva-personal-entry__label"},"Eva 同学"))),
EvaMyAiCollaborationIcon=()=>React.createElement("img",{className:"eva-my-ai-collaboration-icon",src:"prototype/assets/my-ai-collaboration.svg",alt:""}),
EvaSidebarSection=({title:rt,items:ct,render:ut,collapsed:pt})=>{const mt=rt==="数字员工"?"其他":pt&&rt==="团队协作"?"团队":rt,gt=ct.map(vt=>{const yt=ut(vt),bt=pt&&vt==="my-ai"&&yt?.props?.children;return React.createElement("div",{className:"eva-nav-entry",key:vt,"data-eva-nav-id":vt},bt?React.cloneElement(yt,{},React.cloneElement(bt,{label:"我的Agent"})):yt)});return React.createElement("section",{className:classNames("eva-nav-section",pt&&"is-collapsed"),"aria-label":mt},React.createElement("div",{className:"eva-nav-section__title"},mt),React.createElement("div",{className:"eva-nav-section__items"},gt))},
EvaSidebarNavigation=rt=>{const ct={isMobile:rt.isMobile,collapsed:rt.collapsed,siderTooltipProps:rt.siderTooltipProps},pt=gt=>{switch(gt){case"search":return React.createElement(SiderSearchEntry,{key:gt,...ct,onConversationSelect:rt.onConversationSelect,onSessionClick:rt.onSessionClick});case"new-chat":return React.createElement(EvaPersonalEntry,{key:gt,...ct,isActive:rt.activeNavId===gt,onClick:()=>rt.navigate("/guid")});case"workboard":return React.createElement(SiderEvaStub,{key:gt,label:"任务看板",icon:React.createElement(Workbench,{theme:"outline",size:"16",fill:"currentColor",className:"block leading-none",style:{lineHeight:0}}),...ct,isActive:rt.activeNavId===gt,onClick:()=>rt.navigate("/eva-stub/工作板")});case"automation":return React.createElement(SiderEvaStub,{key:gt,label:"自动化任务",icon:React.createElement(AlarmClock$4,{theme:"outline",size:"16",fill:"currentColor",className:"block leading-none",style:{lineHeight:0}}),...ct,isActive:rt.activeNavId===gt,onClick:()=>rt.navigate("/scheduled")});case"messages":return React.createElement(SiderMessagesEntry,{key:gt,...ct,isActive:rt.activeNavId===gt,onClick:()=>rt.navigate("/messages")});case"my-ai":return React.createElement("div",{key:gt,id:"eva-my-avatar-nav","data-eva-my-avatar-nav":"true"},React.createElement(SiderEvaStub,{label:"我的Agent",icon:React.createElement(EvaMyAiCollaborationIcon,null),...ct,isActive:rt.activeNavId===gt,onClick:()=>{}}));case"projects":return React.createElement(SiderCollabEntry,{key:gt,...ct,isActive:rt.activeNavId===gt,onClick:()=>{window.dispatchEvent(new CustomEvent("eva:open-project-directory")),rt.navigate("/collab")}});case"contacts":return React.createElement("div",{key:gt,id:"eva-contacts-nav","data-eva-contacts-nav":"true"},React.createElement(SiderEvaStub,{label:"通讯录",icon:React.createElement(EvaContactsIcon,{size:16,strokeWidth:1.8,className:"block leading-none",style:{lineHeight:0}}),...ct,isActive:rt.activeNavId===gt,onClick:()=>{}}));case"drive":return React.createElement("div",{key:gt,id:"eva-drive-nav","data-eva-action":"drive","data-eva-native-clone":"true"},React.createElement(SiderEvaStub,{label:"文件库",icon:React.createElement(EvaDriveIcon,{size:16,strokeWidth:1.8,className:"block leading-none",style:{lineHeight:0}}),...ct,isActive:rt.activeNavId===gt,onClick:()=>{}}));case"agent-create":return React.createElement(SiderEvaStub,{key:gt,label:rt.collapsed?"创建中心":"Agent 创建中心",icon:React.createElement(Sparkles,{size:16}),...ct,isActive:rt.activeNavId===gt,onClick:()=>rt.navigate("/eva-stub/Agent创建中心")});case"digital-employees":return React.createElement(SiderEvaStub,{key:gt,label:"数字员工市场",icon:React.createElement(Bot,{size:16,strokeWidth:1.8,className:"block leading-none",style:{lineHeight:0}}),...ct,isActive:rt.activeNavId===gt,onClick:()=>rt.navigate("/eva-stub/数字员工?evaMode="+rt.mode)});case"connection-center":return React.createElement("div",{key:gt,id:"eva-connection-center-nav"},React.createElement(SiderEvaStub,{label:"连接中心",icon:React.createElement(EvaConnectionCenterIcon,{size:16,strokeWidth:1.8,className:"block leading-none",style:{lineHeight:0}}),...ct,isActive:rt.activeNavId===gt,onClick:()=>rt.navigate("/eva-stub/技能?evaMode="+rt.mode)}));case"sites":return React.createElement(SiderEvaStub,{key:gt,label:"站点",icon:React.createElement(Earth$2,{theme:"outline",size:"16",fill:"currentColor",className:"block leading-none",style:{lineHeight:0}}),...ct,isActive:rt.activeNavId===gt,onClick:()=>rt.navigate("/eva-stub/站点?evaMode="+rt.mode)});default:return null}};return React.createElement(React.Fragment,null,React.createElement(EvaSidebarSection,{title:"个人",items:EVA_PERSONAL_NAV,render:pt,collapsed:rt.collapsed}),React.createElement(EvaSidebarSection,{title:"团队协作",items:EVA_TEAM_NAV,render:pt,collapsed:rt.collapsed}),React.createElement(EvaSidebarSection,{title:"数字员工",items:EVA_COMMON_NAV,render:pt,collapsed:rt.collapsed}))},
`;
        siderArchitecture = siderArchitecture
          .replace('collapsed:rt.collapsed,siderTooltipProps', 'collapsed:rt.isMobile&&rt.collapsed,siderTooltipProps')
          .replace('EvaPersonalEntry,{key:gt,...ct,isActive:', 'EvaPersonalEntry,{key:gt,...ct,collapsed:rt.collapsed,isActive:');
        source = root.__evaCut(source, siderComponentAnchor, siderArchitecture + siderComponentAnchor, '标准侧栏组件');
        var evaMyAiNavigationNeedle = 'onClick:()=>{}}));case"projects"';
        var evaMyAiNavigationReplacement = 'onClick:()=>rt.navigate("/messages?evaIM=my-ai")}));case"projects"';
        source = root.__evaCut(source, evaMyAiNavigationNeedle, evaMyAiNavigationReplacement, 'My AI 导航');

        source = root.__evaCutAll(source, [
          ['case"contacts":return React.createElement("div",{key:gt,id:"eva-contacts-nav","data-eva-contacts-nav":"true"},React.createElement(SiderEvaStub,{label:"通讯录",icon:React.createElement(EvaContactsIcon,{size:16,strokeWidth:1.8,className:"block leading-none",style:{lineHeight:0}}),...ct,isActive:rt.activeNavId===gt,onClick:()=>{}}))', 'case"contacts":return React.createElement("div",{key:gt,id:"eva-contacts-nav","data-eva-contacts-nav":"true"},React.createElement(SiderEvaStub,{label:"通讯录",icon:React.createElement(EvaContactsIcon,{size:16,strokeWidth:1.8,className:"block leading-none",style:{lineHeight:0}}),...ct,isActive:rt.activeNavId===gt,onClick:()=>rt.navigate("/contacts")}))'],
          ['case"drive":return React.createElement("div",{key:gt,id:"eva-drive-nav","data-eva-action":"drive","data-eva-native-clone":"true"},React.createElement(SiderEvaStub,{label:"文件库",icon:React.createElement(EvaDriveIcon,{size:16,strokeWidth:1.8,className:"block leading-none",style:{lineHeight:0}}),...ct,isActive:rt.activeNavId===gt,onClick:()=>{}}))', 'case"drive":return React.createElement("div",{key:gt,id:"eva-drive-nav","data-eva-action":"drive","data-eva-native-clone":"true"},React.createElement(SiderEvaStub,{label:"文件库",icon:React.createElement(EvaDriveIcon,{size:16,strokeWidth:1.8,className:"block leading-none",style:{lineHeight:0}}),...ct,isActive:rt.activeNavId===gt,onClick:()=>rt.navigate("/drive")}))']
        ], '正式侧栏导航');

        var siderStateAnchor = 'Kt=typeof window<"u"&&!window.electronAPI&&Dt==="authenticated";reactExports.useEffect';
        var siderStateReplacement = 'Kt=typeof window<"u"&&!window.electronAPI&&Dt==="authenticated",evaMode=evaSidebarMode(gt,St),evaNavigate=mr=>{Pt(),Promise.resolve(xt(mr)).catch(()=>{})},evaActiveNavIdState=reactExports.useState(()=>evaSidebarSelectionFromRoute(gt,St)),evaActiveNavId=evaActiveNavIdState[0],setEvaActiveNavId=evaActiveNavIdState[1];reactExports.useEffect(()=>{setEvaActiveNavId(evaSidebarSelectionFromRoute(gt,St))},[gt,St]);reactExports.useEffect';
        source = root.__evaCut(source, siderStateAnchor, siderStateReplacement, '侧栏路由状态');

        var nativePageAnchor = 'PanelRoute=({layout:rt})=>{';
        var nativePageComponent = 'EvaContactsPage=()=>window.EvaContactsUI.render({React:reactExports,Button,Input:ForwardInput,Modal,SearchIcon:Search$1,CloseIcon:X,store:evaMembers().store,ui:evaMembers().ui}),EvaSitesPage=()=>window.EvaSitesUI.render({React:reactExports}),EvaNativePage=({pageId:rt})=>{const ct=reactExports.useRef(null);reactExports.useEffect(()=>{const ut=ct.current;return window.__evaNativePages?.mount(rt,ut),()=>window.__evaNativePages?.unmount(rt,ut)},[rt]);return React.createElement("div",{ref:ct,id:"eva-native-page-"+rt,className:"eva-native-page-host","data-eva-native-page":rt})},';
        source = root.__evaCut(source, nativePageAnchor, nativePageComponent + nativePageAnchor, '原生路由页面宿主');
        source = root.__evaCutAll(source, [
          ['React.createElement(Route,{path:"/guid",element:withRouteFallback(Guid)})', 'React.createElement(Route,{path:"/guid",element:React.createElement(EvaNativePage,{pageId:"personal"})})'],
          ['React.createElement(Route,{path:"/conversation/:id",element:withRouteFallback(Conversation)})', 'React.createElement(Route,{path:"/conversation/:id",element:React.createElement(EvaNativePage,{pageId:"personal"})})'],
          ['React.createElement(Route,{path:"/messages",element:withRouteFallback(MessagesPage$1)}),React.createElement(Route,{path:"/eva-stub/:name"', 'React.createElement(Route,{path:"/messages",element:withRouteFallback(MessagesPage$1)}),React.createElement(Route,{path:"/contacts",element:React.createElement(EvaContactsPage,null)}),React.createElement(Route,{path:"/drive",element:React.createElement(EvaNativePage,{pageId:"drive"})}),React.createElement(Route,{path:"/eva-stub/:name"'],
          ['function EvaStubPage(){const{name:rt}=useParams(),ct=decodeURIComponent(rt??"");if(ct==="技能")return React.createElement("div",{id:"eva-connection-center-native-host",className:"eva-connection-center-native-host"});', 'function EvaStubPage(){const{name:rt}=useParams(),ct=decodeURIComponent(rt??"");if(ct==="工作板")return React.createElement(EvaNativePage,{pageId:"workboard"});if(ct==="Agent创建中心")return React.createElement(EvaDigitalEmployeesPage,{view:"create"});if(ct==="数字员工")return React.createElement(EvaDigitalEmployeesPage,{view:"market"});if(ct==="站点")return React.createElement(EvaSitesPage,null);if(ct==="技能")return React.createElement(EvaNativePage,{pageId:"connection-center"});']
        ], '正式页面路由');

        var nativeSiderStart = source.indexOf(siderComponentAnchor);
        var siderItemsStart = source.indexOf('React.createElement(SiderSearchEntry', nativeSiderStart);
        var siderItemsEnd = source.indexOf('))),React.createElement(SiderFooter', siderItemsStart);
        if (siderItemsStart < 0 || siderItemsEnd < 0) throw new Error('EVA 侧栏菜单替换范围不存在');
        /*
         * 侧栏内容的宿主是 vendor 的 .flex-1.min-h-0.overflow-hidden，它会裁掉一切溢出，
         * 而三段导航（个人 3 + 团队 5 + 其他 3）都是 shrink-0：折叠态每个 entry 从 34px 变成
         * 56px（图标上、文字下），11 项 + 3 个分组标题实测 700px，宿主只有 662px —— 底部
         * 62px 连同分组历史直接被切掉且无处可滚。所以这里必须自己套一层
         * flex-1 min-h-0 overflow-y-auto 的滚动容器，把导航和历史一起纳入滚动范围；
         * 折叠态的分组历史随之改成 shrink-0（跟着外层一起滚，不再抢 flex-1 被压成 0 高）。
         * 展开态内容 591px < 617px 不触发滚动，行为与原来一致。
         */
        var nativeNavigation = String.raw`React.createElement("div",{className:classNames("flex-1 min-h-0 flex flex-col gap-2px overflow-y-auto",siderStyles.scrollArea)},React.createElement(EvaSidebarNavigation,{mode:evaMode,activeNavId:evaActiveNavId,isMobile:pt,collapsed:ct,siderTooltipProps:sr,pathname:gt,onConversationSelect:ln,onSessionClick:rt,isBatchMode:Vt,onNewChat:nn,onToggleBatchMode:()=>Ht(mr=>!mr),navigate:evaNavigate}),React.createElement("div",{className:"flex-1 min-h-0"}))`;
        source = source.slice(0, siderItemsStart) + nativeNavigation + source.slice(siderItemsEnd + 1);
        source = root.__evaCut(source, 'React.createElement("div",{className:"eva-user-row",onClick:gt},React.createElement("img",{className:"ava",src:window.__EVA_CURRENT_USER_PORTRAIT,alt:""}),React.createElement("span",{className:"nm"},"王宜林"),React.createElement("span",{className:"gt"},"›"),', 'React.createElement("div",{className:"eva-user-row"},React.createElement(evaMembers().ui.AccountSwitcher,{onAccount:gt}),', '左下角统一演示身份');
        source = root.__evaCut(source, 'SiderFooter=({isMobile:rt,', 'EvaSiderFooterBase=({isMobile:rt,', '设置入口组件归属');
        source = root.__evaCut(source, 'React.createElement(evaMembers().ui.AccountSwitcher,{onAccount:gt}),', 'React.createElement(evaMembers().ui.AccountSwitcher,{}),React.createElement("button",{type:"button",className:"eva-settings-trigger",title:"设置","aria-label":"设置",onClick:gt},React.createElement(Settings,{size:18})),', '左下角齿轮设置入口');
        source = root.__evaCut(source, 'React.createElement(SettingTwo,{theme:"outline",size:"16",fill:"currentColor",className:"block leading-none",style:{lineHeight:0}})', 'React.createElement(Settings,{size:18})', '收起侧栏设置齿轮');
    return source;
  });
})(window);
