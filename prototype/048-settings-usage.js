(function(root){
'use strict';
let SettingsDialog;
root.EvaSettingsUI={render(props,deps){SettingsDialog||=create(deps);return deps.React.createElement(SettingsDialog,props);}};
function create({React:R,Modal,Button,icons,pages}){
const h=R.createElement;
// icons 由调用方按菜单 id 注入，不含关闭图标，就地内联一枚 lucide x。
const CloseIcon=()=>h('svg',{width:18,height:18,viewBox:'0 0 24 24',fill:'none',stroke:'currentColor',strokeWidth:1.75,strokeLinecap:'round',strokeLinejoin:'round','aria-hidden':true},h('path',{d:'M18 6 6 18'}),h('path',{d:'m6 6 12 12'}));
function Usage({onOpen}){
const [scope,setScope]=R.useState('me'),[domain,setDomain]=R.useState(''),[opened,setOpened]=R.useState(null);
const store=root.EvaDigitalEmployeesStore;
R.useSyncExternalStore(store.subscribe,store.getSnapshot);
const F={me:1,team:9.4,org:186}[scope],n=(v,d=0)=>(v*F).toFixed(d).replace(/\B(?=(\d{3})+(?!\d))/g,','),seed=s=>{let v=0;for(let i=0;i<s.length;i++)v=(v*31+s.charCodeAt(i))>>>0;return v;};
const days=id=>{const v=seed(id),raw=Array.from({length:14},(_,i)=>((v>>>(i%12))+i*7+v%13)%100),max=Math.max(...raw)||1;return raw.map(x=>Math.round(x/max*100));};
const team=R.useSyncExternalStore(root.EvaAITeam.subscribe,root.EvaAITeam.getSnapshot);
const twins=team.identities.filter(a=>a.role==='persona').map(a=>({...a,kind:'twin',by:'u-wangyilin',one:a.description}));
const mine=store.agents().filter(a=>a.by==='u-wangyilin'||a.market==='mine'||store.chatIds().includes(a.id));
const eva={id:'a_eva',name:'Eva 同学',one:'个人助理',kind:'assistant'};
const pool=[eva,...new Map([...twins,...mine,...(scope==='me'?[]:store.agents().filter(a=>a.kind==='staff'&&a.domain).slice(0,24))].map(a=>[a.id,a])).values()];
const usage=a=>seed(a.id)%900+(a.id==='a_eva'?9000:a.kind==='twin'?1200:100),rank=a=>a.id==='a_eva'?0:a.by==='u-wangyilin'||a.market==='mine'?1:2;
pool.sort((a,b)=>rank(a)-rank(b)||usage(b)-usage(a));
const domains=[...new Set(pool.map(a=>a.domain).filter(Boolean))],shown=pool.filter(a=>!domain||a.domain===domain),total=shown.reduce((sum,a)=>sum+usage(a),0)||1;
const chip=(label,value)=>h(Button,{key:value,theme:domain===value?'light':'borderless','aria-pressed':domain===value,onClick:()=>setDomain(value)},label);
return h('section',{className:'eva-usage'},h('header',{className:'eva-usage__heading'},h('div',null,h('h2',null,'用量看板'),h('p',null,{me:'我这个月用了多少、都花在哪儿',team:'AI 运营平台部这个月的情况',org:'全集团 AI 用量总览'}[scope])),h('div',{className:'eva-usage__filters'},[['me','我的'],['team','我的部门'],['org','全公司']].map(([value,label])=>h(Button,{key:value,theme:scope===value?'light':'borderless','aria-pressed':scope===value,onClick:()=>{setScope(value);setDomain('');setOpened(null);}},label)))),
h('div',{className:'eva-usage__kpis'},[['本月 Token',n(41400),'占预算 27%'],['对话轮次',n(268)+' 次','比上月 +18%'],['自动任务跑了',n(142)+' 次','成功率 96%'],['产物',n(23)+' 个',n(6)+' 个已发布成站点']].map(([label,value,note])=>h('div',{key:label,className:'eva-usage__kpi'},h('span',null,label),h('strong',null,value),h('small',null,note)))),
h('div',{className:'eva-usage__filters'},chip('全部',''),domains.map(d=>chip(d,d))),h('h3',null,'谁在用'),h('p',null,'右边一条是它自己最近 14 天的节奏（颜色越深那天用得越多），总量看右边的数 —— 点一行看明细'),
h('div',{className:'eva-usage__list'},shown.map(a=>{const dd=days(a.id),u=usage(a),open=opened===a.id;return h(R.Fragment,{key:a.id},h('button',{type:'button',className:'eva-usage__row','aria-expanded':open,onClick:()=>setOpened(open?null:a.id)},a.id==='a_eva'?h('img',{className:'eva-usage__avatar',src:root.__EVA_COLLEAGUE_PORTRAIT,alt:'',draggable:false}):root.EvaAIIdentity.avatar(a.kind==='twin'?{...root.__EVA_MY_ASSISTANT_IDENTITY,name:a.name}:store.appearance(a),32,h),h('span',{className:'eva-usage__identity'},h('strong',null,a.name),h('small',null,a.one||a.tagline||'')),h('span',{className:'eva-usage__heat'},dd.map((v,i)=>h('i',{key:i,'data-level':v>75?4:v>50?3:v>25?2:v>8?1:0,title:v>8?Math.round(v*F/3)+' 轮':'没用'}))),h('span',{className:'eva-usage__number'},n(u)),h('small',null,Math.max(1,Math.round(u/total*100))+'%'),h(icons.ChevronDown,{size:16,style:{transform:open?'rotate(180deg)':undefined}})),open&&h('div',{className:'eva-usage__detail'},h('strong',null,'最近 14 天'),h('div',{className:'eva-usage__days'},dd.map((v,i)=>h('div',{key:i,title:Math.round(v*F/3)+' 轮'},h('i',{style:{height:Math.round(v/Math.max(...dd)*90)+6}}),h('small',null,19+i>31?19+i-31:19+i)))),h('div',{className:'eva-usage__breakdown'},[[n(Math.round(u*.62)),'对话'],[n(Math.round(u*.28)),'自动任务'],[n(Math.round(u*.1)),'被别人 @'],[seed(a.id)%40+8,'个产物']].map(([value,label])=>h('span',{key:label},h('strong',null,value),label))),h(Button,{icon:h(icons.MessageSquare,{size:16}),onClick:()=>onOpen(a.id,a.kind)},'去跟它说话')));})),!shown.length&&h('p',null,'这个业务域下这个月没人用'));
}
return function Settings({visible,onClose,navigate}){
const [tab,setTab]=R.useState('general');
const [popupHost,setPopupHost]=R.useState(null);
R.useLayoutEffect(()=>{const host=document.createElement('div');host.className='eva-settings-portal';document.body.appendChild(host);setPopupHost(host);return()=>host.remove();},[]);
const menus=[['general','通用'],['appearance','外观'],['engine','助理引擎'],['im','IM 机器人'],['browser','浏览器'],['mail','邮箱'],['memory','记忆'],['shortcuts','快捷键'],['usage','用量看板'],['about','关于']];
// 标题栏由本组件接管（Modal 传 header:null 抑制自带头部），使左栏能从模态顶边通栏到底。
// id 沿用 Semi 的 aria-labelledby 目标（semi-modal-title），换掉头部后对话框仍有可访问名。
const title=(menus.find(([id])=>id===tab)||[,'设置'])[1];
return h(R.Fragment,null,popupHost&&h(Modal,{visible,header:null,getPopupContainer:()=>popupHost,className:'eva-settings-dialog',width:'min(1080px, calc(100vw - 48px))',footer:null,onCancel:onClose,closeOnEsc:true,maskClosable:false},h('div',{className:'eva-settings-dialog__layout'},h('div',{className:'eva-settings-dialog__side'},h('h1',{className:'eva-settings-dialog__brand'},'设置'),h('nav',{'aria-label':'设置菜单'},menus.map(([id,label])=>h(Button,{key:id,icon:h(icons[id],{size:16,strokeWidth:1.5}),theme:tab===id?'light':'borderless',block:true,onClick:()=>setTab(id),'aria-current':tab===id?'page':undefined},label)))),h('div',{className:'eva-settings-dialog__main'},h('header',{className:'eva-settings-dialog__titlebar'},h('h2',{className:'eva-settings-dialog__title',id:'semi-modal-title'},title),h(Button,{className:'eva-settings-dialog__close',theme:'borderless',icon:h(CloseIcon),'aria-label':'关闭设置',onClick:onClose})),h('div',{className:'eva-settings-dialog__content'},tab==='usage'?h(Usage,{onOpen:(id,kind)=>{onClose();navigate(id==='a_eva'?'/guid':kind==='twin'?'/messages?evaIM=my-ai&evaIdentity='+encodeURIComponent(id):'/messages?evaEmployee='+encodeURIComponent(id));}}):h(R.Suspense,{fallback:h('p',null,'加载中…')},h(pages[tab],{key:tab})))))));
};
}
})(window);
