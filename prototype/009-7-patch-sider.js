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
            /* 全局导航只有展开/折叠两态（规范：默认 180px、折叠 80px），不参与自由拖拽。
             * 直接不渲染 Semi Sider 自带的 resize 手柄，连同其默认粗高亮线与双击行为一起去掉；
             * 折叠/展开仍由顶栏按钮和 ⌘B 驱动，不受影响。 */
            '!mt&&$r({className:"z-20",style:{right:"-4px",width:"8px"},linePlacement:"start"})',
            'null'
          ],
          [
            /* 宽度锁死在 180：min=max=defaultWidth。useResizableSplit 初始化时只采用
             * 落在 [min,max] 内的存储值，任何历史拖拽宽度（如曾被拖到的 600px）都会
             * 落在范围外而被丢弃，回退到默认 180px；无需迁移 storageKey 即可自愈。 */
            'minWidth:SIDER_MIN_WIDTH,maxWidth:Math.max(SIDER_MIN_WIDTH,Math.round(St*.5)),storageKey:"eva-unified-sider-width-px-v2",collapseThreshold:SIDER_MIN_WIDTH,collapsedWidth:DESKTOP_COLLAPSED_WIDTH,collapsed:ut,onCollapsedChange:pt',
            'minWidth:DEFAULT_SIDER_WIDTH,maxWidth:DEFAULT_SIDER_WIDTH,storageKey:"eva-unified-sider-width-px-v2",collapseThreshold:SIDER_MIN_WIDTH,collapsedWidth:DESKTOP_COLLAPSED_WIDTH,collapsed:ut,onCollapsedChange:pt'
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
            '}:{position:"relative"};return React.createElement(LayoutContext.Provider'
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

        /* 顶栏「反馈问题」后面的侧栏折叠按钮移除，改用「!1」空占位保持
         * createElement 参数结构不变。折叠/展开仍可通过双击或拖拽侧栏分隔线触发。 */
        source = root.__evaCut(
          source,
          'nn&&React.createElement("button",{type:"button",className:classNames("app-titlebar__button",Pt?.isMobile&&"app-titlebar__button--mobile"),onClick:hr,"aria-label":rn},pt?React.createElement(ExpandRight$1,{theme:"outline",size:cn,fill:"currentColor"}):React.createElement(ExpandLeft$1,{theme:"outline",size:cn,fill:"currentColor"}))',
          '!1',
          '移除顶栏侧栏折叠按钮'
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
EvaMoreIcon=createLucideIcon("ellipsis",[["circle",{cx:12,cy:12,r:1,key:"a"}],["circle",{cx:19,cy:12,r:1,key:"b"}],["circle",{cx:5,cy:12,r:1,key:"c"}]]),EvaLogOutIcon=createLucideIcon("log-out",[["path",{d:"m16 17 5-5-5-5",key:"a"}],["path",{d:"M21 12H9",key:"b"}],["path",{d:"M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4",key:"c"}]]),SiderFooter=props=>{const[visible,setVisible]=reactExports.useState(false),[menuOpen,setMenuOpen]=reactExports.useState(false),navigate=useNavigate(),auth=useAuth(),store=evaMembers().store;reactExports.useSyncExternalStore(store.subscribe,store.getSnapshot,store.getSnapshot);const actorId=store.snapshot().actorId,person=store.person(actorId),name=person?.name||actorId;return React.createElement(React.Fragment,null,React.createElement("footer",{className:classNames("eva-sider-footer",props.collapsed&&"is-collapsed")},React.createElement(Dropdown,{trigger:"custom",visible:menuOpen,onClickOutSide:()=>setMenuOpen(false),position:props.collapsed?"rightBottom":"top",className:"eva-account-menu",render:React.createElement(Dropdown.Menu,null,React.createElement(Dropdown.Item,{className:"eva-account-menu__item",onClick:()=>{setMenuOpen(false);setVisible(true)}},React.createElement(Settings,{size:16,className:"eva-account-menu__icon"}),React.createElement("span",{className:"eva-account-menu__label"},"设置")),React.createElement(Dropdown.Item,{className:"eva-account-menu__item eva-account-menu__item--danger",onClick:()=>{setMenuOpen(false);auth.logout&&auth.logout()}},React.createElement(EvaLogOutIcon,{size:16,className:"eva-account-menu__icon"}),React.createElement("span",{className:"eva-account-menu__label"},"退出登录")))},React.createElement("button",{type:"button",className:classNames("eva-sider-account",menuOpen&&"is-open"),"aria-haspopup":"menu","aria-expanded":menuOpen,"aria-label":"账户："+name,onClick:()=>setMenuOpen(vt=>!vt)},React.createElement("img",{className:"eva-sider-account__avatar",src:window.EvaAvatar.personUri(actorId),alt:""}),React.createElement("span",{className:"eva-sider-account__name",title:name},name),React.createElement(ChevronRight,{size:16,className:"eva-sider-account__chevron","aria-hidden":true})))),window.EvaSettingsUI.render({visible,onClose:()=>setVisible(false),navigate},{React:reactExports,Modal,Button,icons:{ChevronDown,MessageSquare,general:Settings,appearance:Monitor,engine:SlidersHorizontal,im:Bot,browser:Globe,mail:Mail$1,memory:Brain$8,shortcuts:Keyboard,about:Info$4,usage:createLucideIcon("chart-column",[["path",{d:"M3 3v16a2 2 0 0 0 2 2h16",key:"axes"}],["path",{d:"M18 17V9",key:"bar1"}],["path",{d:"M13 17V5",key:"bar2"}],["path",{d:"M8 17v-3",key:"bar3"}]])},pages:{general:EvaGeneral,appearance:(window.EvaAppearanceUI?window.EvaAppearanceUI.create({React:reactExports}):EvaAppearance),engine:EvaEngine,im:EvaImBot,browser:EvaBrowser,mail:EvaMail,memory:EvaMemory,shortcuts:EvaShortcut,about:EvaAbout}}))},
EvaDigitalLinkIcon=createLucideIcon("link-2",[["path",{d:"M9 17H7A5 5 0 0 1 7 7h2",key:"left"}],["path",{d:"M15 7h2a5 5 0 1 1 0 10h-2",key:"right"}],["path",{d:"M8 12h8",key:"middle"}]]),EvaDigitalEmployeesPage=props=>{const navigate=useNavigate(),{search}=useLocation(),evaCreatorParams=new URLSearchParams(search),initialType=evaCreatorParams.get("evaCreate"),returnTo=evaCreatorParams.get("evaReturn");return window.EvaDigitalEmployeesUI.render({...props,navigate,initialType,returnTo},{React:reactExports,Button,Input:ForwardInput,TextArea,Select,Checkbox,Switch,Modal,Table,Tag,Toast,Dropdown,ChannelsView,icons:{Search:Search$1,More:EllipsisIcon,Sparkles,Users,Grid:LayoutGrid,File:FileText,Link:EvaDigitalLinkIcon,ArrowLeft:ArrowLeft$3},members:evaMembers().store,navigatePersonal:(id,go)=>go("/guid")})},EvaContactsIcon=createLucideIcon("book-user",[["path",{d:"M15 13a3 3 0 1 0-6 0",key:"book-user-profile"}],["path",{d:"M4 19.5v-15A2.5 2.5 0 0 1 6.5 2H19a1 1 0 0 1 1 1v18a1 1 0 0 1-1 1H6.5a1 1 0 0 1 0-5H20",key:"book-user-book"}],["circle",{cx:"12",cy:"8",r:"2",key:"book-user-avatar"}]]),EvaConnectionCenterIcon=createLucideIcon("cable",[["path",{d:"M17 19a1 1 0 0 1-1-1v-2a2 2 0 0 1 2-2h2a2 2 0 0 1 2 2v2a1 1 0 0 1-1 1z",key:"cable-socket"}],["path",{d:"M17 21v-2",key:"cable-socket-pin"}],["path",{d:"M19 14V6.5a1 1 0 0 0-7 0v11a1 1 0 0 1-7 0V10",key:"cable-line"}],["path",{d:"M21 21v-2",key:"cable-socket-pin-2"}],["path",{d:"M3 5V3",key:"cable-plug-pin"}],["path",{d:"M4 10a2 2 0 0 1-2-2V6a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2a2 2 0 0 1-2 2z",key:"cable-plug"}],["path",{d:"M7 5V3",key:"cable-plug-pin-2"}]]),EvaDriveIcon=createLucideIcon("hard-drive",[["path",{d:"M10 16h.01",key:"1ra8yu"}],["path",{d:"M2.212 11.577a2 2 0 0 0-.212.896V18a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-5.527a2 2 0 0 0-.212-.896L18.55 5.11A2 2 0 0 0 16.76 4H7.24a2 2 0 0 0-1.79 1.11z",key:"1jiv2b"}],["path",{d:"M21.946 12.013H2.054",key:"12xlhc"}],["path",{d:"M6 16h.01",key:"1l4qyb"}]]),EvaWorkbenchIcon=createLucideIcon("presentation",[["path",{d:"M2 3h20",key:"top"}],["path",{d:"M21 3v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V3",key:"screen"}],["path",{d:"m7 21 5-5 5 5",key:"stand"}]]),EvaAutomationIcon=createLucideIcon("alarm-clock",[["circle",{cx:"12",cy:"13",r:"8",key:"face"}],["path",{d:"M12 9v4l2 2",key:"hands"}],["path",{d:"M5 3 2 6",key:"left-bell"}],["path",{d:"m22 6-3-3",key:"right-bell"}],["path",{d:"M6.38 18.7 4 21",key:"left-foot"}],["path",{d:"M17.64 18.67 20 21",key:"right-foot"}]]),
EVA_PERSONAL_NAV=Object.freeze(["new-chat","my-ai","workboard","automation","connection-center"]),EVA_TEAM_NAV=Object.freeze(["messages","projects","contacts","drive","sites"]),EVA_COMMON_NAV=Object.freeze(["digital-employees"]),
evaSidebarMode=(rt,ct)=>{const ut=new URLSearchParams(ct||"");if(rt==="/messages"&&ut.get("evaIM")==="my-ai")return"personal";if(rt==="/collab"||rt==="/messages"||rt==="/contacts"||rt==="/drive")return"collaboration";if(rt==="/guid"||rt.indexOf("/conversation/")===0||rt==="/scheduled"||rt.indexOf("/eva-stub/%E5%B7%A5%E4%BD%9C%E6%9D%BF")===0||rt.indexOf("/eva-stub/Agent")===0)return"personal";return ut.get("evaMode")==="collaboration"?"collaboration":"personal"},
evaSidebarSelectionFromRoute=(rt,ct)=>{if(rt==="/messages")return new URLSearchParams(ct||"").get("evaIM")==="my-ai"?"my-ai":"messages";if(rt==="/collab")return"projects";if(rt==="/contacts")return"contacts";if(rt==="/drive")return"drive";if(rt==="/scheduled")return"automation";if(rt==="/guid"||rt.indexOf("/conversation/")===0)return"new-chat";if(rt.indexOf("/eva-stub/%E5%B7%A5%E4%BD%9C%E6%9D%BF")===0)return"workboard";if(rt.indexOf("/eva-stub/Agent")===0)return"agent-create";if(rt.indexOf("/eva-stub/%E6%95%B0%E5%AD%97%E5%91%98%E5%B7%A5")===0)return"digital-employees";if(rt.indexOf("/eva-stub/%E6%8A%80%E8%83%BD")===0)return"connection-center";if(rt.indexOf("/eva-stub/%E7%AB%99%E7%82%B9")===0)return"sites";return""},
EvaPersonalEntry=rt=>React.createElement("div",{className:classNames("eva-personal-entry",rt.collapsed&&"is-collapsed",rt.isActive&&"is-selected"),"data-eva-my-assistant-identity":"true","aria-current":rt.isActive?"page":void 0},React.createElement("button",{type:"button",className:"eva-personal-entry__main",onClick:rt.onClick,"aria-label":"Eva 同学",title:"Eva 同学"},React.createElement("span",{className:"eva-personal-entry__logo"},React.createElement("img",{src:window.__EVA_COLLEAGUE_PORTRAIT,alt:""})),React.createElement("span",{className:"eva-personal-entry__label"},"Eva 同学"))),
evaMessagesHasUnread=rt=>{try{const ct=rt.snapshot().actorId,ut=window.__EVA_CHANNELS_BY_SPACE||{},pt=gt=>gt&&!rt.conversationMuted(gt.id,ct)&&rt.conversationUnread(gt.id,ct,gt.unread||0)>0;for(const gt in ut){const St=ut[gt]||[];for(let vt=0;vt<St.length;vt++){if(pt(St[vt]))return!0;const yt=St[vt].threads||[];for(let bt=0;bt<yt.length;bt++)if(pt(yt[bt]))return!0}}return!1}catch(gt){return!1}},
EvaMessagesNavEntry=rt=>{const ct=evaMembers().store;reactExports.useSyncExternalStore(ct.subscribe,ct.getSnapshot,ct.getSnapshot);const ut=evaMessagesHasUnread(ct),pt=React.createElement(MessageSquare,{size:16,strokeWidth:1.8,className:"block leading-none"}),gt=React.createElement("span",{className:"eva-nav-msg-iconwrap"},pt,ut&&React.createElement("span",{className:"eva-nav-msg-unread eva-nav-msg-unread--icon",role:"status","aria-label":"有未读消息",title:"有未读消息"}));return React.createElement(SiderEvaStub,{label:rt.label,isMobile:rt.isMobile,collapsed:rt.isMobile&&rt.collapsed,siderTooltipProps:rt.siderTooltipProps,isActive:rt.isActive,onClick:rt.onClick,icon:gt})},
EvaMyAiCollaborationIcon=()=>{const rt=window.EvaAITeam,ct=window.EvaDigitalEmployeesStore,pt=window.EvaMyAITeamGroup;reactExports.useSyncExternalStore(rt.subscribe,rt.getSnapshot,rt.getSnapshot);reactExports.useSyncExternalStore(ct.subscribe,ct.getSnapshot,ct.getSnapshot);reactExports.useSyncExternalStore(pt.subscribe,pt.getSnapshot,pt.getSnapshot);const ut=rt.hasUnread()||ct.hasUnread()||pt.hasUnread();return React.createElement("span",{className:"eva-my-ai-collaboration-icon-wrap"},React.createElement("img",{className:"eva-my-ai-collaboration-icon",src:"prototype/assets/my-ai-collaboration.svg",alt:""}),ut&&React.createElement("span",{className:"eva-my-ai-collaboration-icon__unread",role:"status","aria-label":"我的 Agent 有未读消息",title:"有未读消息"}))},
EvaSidebarSection=({title:rt,items:ct,render:ut,collapsed:pt})=>{const mt=rt==="数字员工"?"其他":pt&&rt==="团队协作"?"团队":rt,gt=ct.map(vt=>{const yt=ut(vt);return React.createElement("div",{className:"eva-nav-entry",key:vt,"data-eva-nav-id":vt},yt)});return React.createElement("section",{className:classNames("eva-nav-section",pt&&"is-collapsed"),"aria-label":mt},React.createElement("div",{className:"eva-nav-section__title"},mt),React.createElement("div",{className:"eva-nav-section__items"},gt))},
EvaSidebarNavigation=rt=>{const ct={isMobile:rt.isMobile,collapsed:rt.collapsed,siderTooltipProps:rt.siderTooltipProps},pt=gt=>{switch(gt){case"search":return React.createElement(SiderSearchEntry,{key:gt,...ct,onConversationSelect:rt.onConversationSelect,onSessionClick:rt.onSessionClick});case"new-chat":return React.createElement(EvaPersonalEntry,{key:gt,...ct,isActive:rt.activeNavId===gt,onClick:()=>rt.navigate("/guid")});case"workboard":return React.createElement(SiderEvaStub,{key:gt,label:"任务看板",icon:React.createElement(Workbench,{theme:"outline",size:"16",fill:"currentColor",className:"block leading-none",style:{lineHeight:0}}),...ct,isActive:rt.activeNavId===gt,onClick:()=>rt.navigate("/eva-stub/工作板")});case"automation":return React.createElement(SiderEvaStub,{key:gt,label:rt.collapsed?"自动化":"自动化任务",icon:React.createElement(AlarmClock$4,{theme:"outline",size:"16",fill:"currentColor",className:"block leading-none",style:{lineHeight:0}}),...ct,isActive:rt.activeNavId===gt,onClick:()=>rt.navigate("/scheduled")});case"messages":return React.createElement(SiderMessagesEntry,{key:gt,...ct,isActive:rt.activeNavId===gt,onClick:()=>rt.navigate("/messages")});case"my-ai":return React.createElement("div",{key:gt,id:"eva-my-avatar-nav","data-eva-my-avatar-nav":"true"},React.createElement(SiderEvaStub,{label:rt.collapsed?"Agent":"我的 Agent",icon:React.createElement(EvaMyAiCollaborationIcon,null),...ct,isActive:rt.activeNavId===gt,onClick:()=>{}}));case"projects":return React.createElement(SiderCollabEntry,{key:gt,...ct,isActive:rt.activeNavId===gt,onClick:()=>{window.dispatchEvent(new CustomEvent("eva:open-project-directory")),rt.navigate("/collab")}});case"contacts":return React.createElement("div",{key:gt,id:"eva-contacts-nav","data-eva-contacts-nav":"true"},React.createElement(SiderEvaStub,{label:"通讯录",icon:React.createElement(EvaContactsIcon,{size:16,strokeWidth:1.8,className:"block leading-none",style:{lineHeight:0}}),...ct,isActive:rt.activeNavId===gt,onClick:()=>{}}));case"drive":return React.createElement("div",{key:gt,id:"eva-drive-nav","data-eva-action":"drive","data-eva-native-clone":"true"},React.createElement(SiderEvaStub,{label:"文件库",icon:React.createElement(EvaDriveIcon,{size:16,strokeWidth:1.8,className:"block leading-none",style:{lineHeight:0}}),...ct,isActive:rt.activeNavId===gt,onClick:()=>{}}));case"agent-create":return React.createElement(SiderEvaStub,{key:gt,label:rt.collapsed?"创建中心":"Agent 创建中心",icon:React.createElement(Sparkles,{size:16}),...ct,isActive:rt.activeNavId===gt,onClick:()=>rt.navigate("/eva-stub/Agent创建中心")});case"digital-employees":return React.createElement(SiderEvaStub,{key:gt,label:rt.collapsed?"数字员工":"数字员工市场",icon:React.createElement(Bot,{size:16,strokeWidth:1.8,className:"block leading-none",style:{lineHeight:0}}),...ct,isActive:rt.activeNavId===gt,onClick:()=>rt.navigate("/eva-stub/数字员工?evaMode="+rt.mode)});case"connection-center":return React.createElement("div",{key:gt,id:"eva-connection-center-nav"},React.createElement(SiderEvaStub,{label:"连接中心",icon:React.createElement(EvaConnectionCenterIcon,{size:16,strokeWidth:1.8,className:"block leading-none",style:{lineHeight:0}}),...ct,isActive:rt.activeNavId===gt,onClick:()=>rt.navigate("/eva-stub/技能?evaMode="+rt.mode)}));case"sites":return React.createElement(SiderEvaStub,{key:gt,label:"站点",icon:React.createElement(Earth$2,{theme:"outline",size:"16",fill:"currentColor",className:"block leading-none",style:{lineHeight:0}}),...ct,isActive:rt.activeNavId===gt,onClick:()=>rt.navigate("/eva-stub/站点?evaMode="+rt.mode)});default:return null}};
        const useLayout=reactExports.useLayoutEffect||reactExports.useEffect;
        const navGroups=[{gi:0,raw:"个人",items:EVA_PERSONAL_NAV},{gi:1,raw:"团队协作",items:EVA_TEAM_NAV},{gi:2,raw:"数字员工",items:EVA_COMMON_NAV}];
        const flat=[];navGroups.forEach(g=>g.items.forEach(id=>flat.push({id:id,gi:g.gi})));
        const total=flat.length;
        const msgStore=evaMembers().store;reactExports.useSyncExternalStore(msgStore.subscribe,msgStore.getSnapshot,msgStore.getSnapshot);
        const rootRef=reactExports.useRef(null);
        const moreState=reactExports.useState(false),moreOpen=moreState[0],setMoreOpen=moreState[1];
        const visState=reactExports.useState(total),visN=visState[0],setVisN=visState[1];
        const phaseState=reactExports.useState("measure"),phase=phaseState[0],setPhase=phaseState[1];
        useLayout(()=>{const root=rootRef.current;if(!root||typeof ResizeObserver>"u")return;const ro=new ResizeObserver(()=>setPhase("measure"));ro.observe(root);return()=>ro.disconnect()},[]);
        useLayout(()=>{setPhase("measure")},[rt.collapsed,rt.activeNavId,total]);
        useLayout(()=>{if(phase!=="measure")return;const root=rootRef.current;if(!root)return;const avail=root.clientHeight;const els=Array.prototype.slice.call(root.querySelectorAll(":scope > .eva-nav-section [data-eva-nav-id]"));const rootTop=root.getBoundingClientRect().top;const bottomOf=i=>els[i].getBoundingClientRect().bottom-rootTop;let n=total;if(els.length===total&&total>0&&bottomOf(total-1)>avail+1){const reserve=rt.collapsed?76:56;const target=avail-reserve;n=0;for(let i=0;i<total;i++){if(bottomOf(i)<=target)n=i+1;else break}n=Math.max(1,n)}setVisN(n);setPhase("ready")},[phase,rt.collapsed]);
        const effVisN=phase==="measure"?total:visN;
        const visSet=new Set(flat.slice(0,effVisN).map(f=>f.id));
        if(phase==="ready"&&effVisN<total&&rt.activeNavId&&!visSet.has(rt.activeNavId)){const visArr=flat.slice(0,effVisN).map(f=>f.id);if(visArr.length)visArr.pop();visArr.push(rt.activeNavId);visSet.clear();visArr.forEach(id=>visSet.add(id))}
        const overflowGroups=navGroups.map(g=>({gi:g.gi,raw:g.raw,ids:g.items.filter(id=>!visSet.has(id))})).filter(g=>g.ids.length);
        const hasOverflow=phase==="ready"&&overflowGroups.length>0;
        const moreHasUnread=hasOverflow&&overflowGroups.some(g=>g.ids.indexOf("messages")>=0)&&evaMessagesHasUnread(msgStore);
        const flyout=React.createElement("div",{className:"eva-nav-more-menu",onClick:()=>setMoreOpen(false)},overflowGroups.map(g=>React.createElement(EvaSidebarSection,{key:g.gi,title:g.raw,items:g.ids,render:pt,collapsed:false})));
        return React.createElement("div",{className:classNames("eva-sidebar-nav",rt.collapsed&&"is-collapsed"),ref:rootRef},navGroups.map(g=>{const items=g.items.filter(id=>visSet.has(id));return items.length?React.createElement(EvaSidebarSection,{key:g.gi,title:g.raw,items:items,render:pt,collapsed:rt.collapsed}):null}),hasOverflow&&React.createElement("section",{className:classNames("eva-nav-section eva-nav-section--more",rt.collapsed&&"is-collapsed"),key:"__more","aria-label":"更多"},React.createElement("div",{className:"eva-nav-section__items"},React.createElement("div",{className:"eva-nav-entry eva-nav-entry--more"},React.createElement(Dropdown,{trigger:"hover",mouseEnterDelay:60,mouseLeaveDelay:160,visible:moreOpen,onVisibleChange:setMoreOpen,position:rt.collapsed?"rightBottom":"rightTop",className:"eva-account-menu eva-nav-more-pop",render:flyout},React.createElement("button",{type:"button",className:classNames("eva-nav-more",moreOpen&&"is-open"),"aria-haspopup":"menu","aria-expanded":moreOpen,"aria-label":"更多导航"},React.createElement("span",{className:"eva-nav-msg-iconwrap"},React.createElement(EvaMoreIcon,{size:16,strokeWidth:1.8,className:"eva-nav-more__icon"}),moreHasUnread&&React.createElement("span",{className:"eva-nav-msg-unread eva-nav-msg-unread--icon",role:"status","aria-label":"有未读消息",title:"有未读消息"})),React.createElement("span",{className:"eva-nav-more__label"},"更多")))))))},
`;
        siderArchitecture = siderArchitecture
          .replace('React.createElement(Workbench,{theme:"outline",size:"16",fill:"currentColor",className:"block leading-none",style:{lineHeight:0}})', 'React.createElement(EvaWorkbenchIcon,{size:16,strokeWidth:1.8,className:"block leading-none"})')
          .replace('React.createElement(AlarmClock$4,{theme:"outline",size:"16",fill:"currentColor",className:"block leading-none",style:{lineHeight:0}})', 'React.createElement(EvaAutomationIcon,{size:16,strokeWidth:1.8,className:"block leading-none"})')
          .replace('React.createElement(SiderMessagesEntry,{key:gt,...ct,isActive:rt.activeNavId===gt,onClick:()=>rt.navigate("/messages")})', 'React.createElement(EvaMessagesNavEntry,{key:gt,label:"我的消息",...ct,isActive:rt.activeNavId===gt,onClick:()=>rt.navigate("/messages")})')
          .replace('React.createElement(SiderCollabEntry,{key:gt,...ct,isActive:rt.activeNavId===gt,onClick:()=>{window.dispatchEvent(new CustomEvent("eva:open-project-directory")),rt.navigate("/collab")}})', 'React.createElement(SiderEvaStub,{key:gt,label:"我的项目",icon:React.createElement(LayoutGrid,{size:16,strokeWidth:1.8,className:"block leading-none"}),...ct,isActive:rt.activeNavId===gt,onClick:()=>{window.dispatchEvent(new CustomEvent("eva:open-project-directory")),rt.navigate("/collab")}})')
          .replace('React.createElement(Earth$2,{theme:"outline",size:"16",fill:"currentColor",className:"block leading-none",style:{lineHeight:0}})', 'React.createElement(Globe,{size:16,strokeWidth:1.8,className:"block leading-none"})')
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
         * 侧栏内容宿主是 vendor 的 .flex-1.min-h-0，导航区（个人 5 + 团队 5 + 其他 1）在矮
         * 视口或折叠态会超出可用高度。此处不再套 overflow-y-auto 滚动，而是把导航交给
         * EvaSidebarNavigation 的响应式收纳：可见区放不下的入口收进底部「更多」，悬停即以
         * 二级浮层展开（样式见 012-mode-layer.css .eva-nav-more*）。活动项永不进溢出，
         * 选中态始终留在可见区。.eva-sidebar-nav 的 overflow:hidden 仅作测量滞后时的兜底裁剪。
         */
        var nativeNavigation = String.raw`React.createElement("div",{className:classNames("flex-1 min-h-0 flex flex-col",siderStyles.scrollArea)},React.createElement(EvaSidebarNavigation,{mode:evaMode,activeNavId:evaActiveNavId,isMobile:pt,collapsed:ct,siderTooltipProps:sr,pathname:gt,onConversationSelect:ln,onSessionClick:rt,isBatchMode:Vt,onNewChat:nn,onToggleBatchMode:()=>Ht(mr=>!mr),navigate:evaNavigate}))`;
        source = source.slice(0, siderItemsStart) + nativeNavigation + source.slice(siderItemsEnd + 1);
        // Replace the analysed legacy footer as one unit: no promo, account switcher,
        // logout or theme controls remain mounted in the client navigation footer.
        var footerStart = source.indexOf('SiderFooter=({isMobile:rt,');
        var footerEnd = source.indexOf('};/**\n * @license lucide-react', footerStart);
        if (footerStart < 0 || footerEnd < 0) throw new Error('EVA 原生底部组件边界不存在');
        var legacyFooter = source.slice(footerStart, footerEnd + 1);
        if (!legacyFooter.includes('className:"eva-user-row"') || !legacyFooter.includes('sider-footer-btn-mobile')) throw new Error('EVA 原生底部组件合同变化');
        source = root.__evaCut(source, ',' + legacyFooter, '', '底部只读身份与唯一设置入口');
    return source;
  });
})(window);
