(function(root){
  'use strict';
  // Review-only composition. No membership mutations or persisted selection.
  root.EvaPickerPreview={create({React:R,Button,Select,Modal,Input,Tag,Checkbox,Radio},store){
    const h=R.createElement;
    const modes={
      add:{label:'添加人类',title:'添加项目成员',hint:'选择要添加到供应链运营协同的成员。',kinds:['human'],submit:'确认添加'},
      create:{label:'建群选成员',title:'新建群聊',hint:'',kinds:['human','clone'],submit:'创建群聊'},
      clone:{label:'选择分身',title:'带入我的分身',hint:'选择随你加入供应链运营协同的分身，不选即可直接加入。',kinds:['clone'],submit:'确认加入'},
      transfer:{label:'转让职责',title:'转让项目负责人',hint:'选择项目内另一位人类接任负责人。',kinds:['human'],single:true,submit:'确认转让'}
    };
    function SelectionBody({items,selected,onChange,single,showProjectFilter,humanHint,humanLabel='人类成员',emptyTitle='暂无可选成员',emptyDescription='当前范围内没有可选择的人类或分身。',renderIdentity,search,searchPlaceholder='搜索可选成员',searchLabel='搜索可选成员',searchIcon,noResultsText='没有匹配的成员'}){
      const [project,setProject]=R.useState('all');
      const [query,setQuery]=R.useState('');
      R.useEffect(()=>{if(!single)return;setQuery('');},[]);
      const normalized=query.trim().normalize('NFKC').toLocaleLowerCase();
      const visible=items.filter(p=>project==='all'||p.project===project).filter(p=>!normalized||String(p.name||'').normalize('NFKC').toLocaleLowerCase().includes(normalized));
      const searchEnabled=search!==false;
      const toggle=id=>onChange(single?[id]:selected.includes(id)?selected.filter(x=>x!==id):[...selected,id]);
      return h('div',{className:'eva-picker-body'},
        searchEnabled&&h('div',{className:'eva-picker-toolbar'},h(Input,{value:query,onChange:setQuery,showClear:true,prefix:searchIcon||null,placeholder:searchPlaceholder,'aria-label':searchLabel})),
        showProjectFilter&&h('div',{className:'eva-picker-filter'},h(Select,{'aria-label':'按项目筛选',value:project,onChange:setProject,optionList:[{value:'all',label:'全部可选人员'},{value:'供应链运营协同',label:'供应链运营协同'}]})),
        h('div',{className:'eva-picker-list'},
          !visible.length&&h('div',{className:'eva-picker-empty'},h('strong',null,query.trim()?noResultsText:emptyTitle),!query.trim()&&h('p',null,emptyDescription)),
          (()=>{const kinds=['human','clone'].filter(k=>visible.some(p=>p.kind===k));const flat=kinds.length<2;return (flat?[null]:kinds);})().map(kind=>{const rows=kind?visible.filter(p=>p.kind===kind):visible;const flat=!kind;return rows.length>0&&h('section',{key:kind||'all',className:flat?'eva-picker-section--flat':undefined},!flat&&h('div',{className:'eva-picker-group'},h('strong',null,kind==='human'?humanLabel:'我的 AI 分身'),h('span',null,rows.length),(()=>{const hint=kind==='clone'?'仅可带入自己的分身，确认后直接加入。':humanHint||humanLabel+'可多选，确认后直接加入。';return hint?h('small',null,hint):null;})()),rows.map(p=>h('label',{key:p.id,className:'eva-picker-row'+(selected.includes(p.id)?' is-selected':'')},h(single?Radio:Checkbox,{'aria-label':'选择'+p.name,name:'eva-picker-choice',checked:selected.includes(p.id),disabled:!!p.disabled,onChange:()=>{if(!p.disabled)toggle(p.id);}}),renderIdentity?renderIdentity(p):(p.kind==='clone'?root.EvaAIIdentity.avatar(root.EvaAIIdentity.cloneAppearance(store.person(p.ownerId)),28,h):h('span',{className:'eva-picker-avatar'},h('img',{alt:'',src:root.EvaAvatar.personUri(p.id)}))),!renderIdentity&&h('span',{className:'eva-picker-person'},h('span',{className:'eva-picker-name'},h('span',{className:'eva-picker-name-text',title:p.name},p.name),p.kind==='clone'&&root.EvaAIIdentity.badge(h)),p.detail&&h('span',{className:'eva-picker-detail'},p.detail)),p.selectionHint&&h('span',{className:'eva-picker-selection-hint'},p.selectionHint))))})));
    }
    function Preview({MemberPicker}){
      const [open,setOpen]=R.useState(true),[mode]=R.useState(()=>{const value=new URLSearchParams(root.location.search).get('picker-preview');return modes[value]?value:'create';}),[selected,setSelected]=R.useState([]),[name,setName]=R.useState('供应商整改协同'),[result,setResult]=R.useState(null);
      const config=modes[mode],s=store.snapshot();
      const roleOrder={owner:0,admin:1,member:2};
      const humans=['u-hejing','u-suhang','u-linxiao','u-zhouyuan'].map(id=>{const member=s.projects.prod.humans.find(p=>p.id===id),projectRoles=store.memberRoles('prod',id).map(item=>item.name);return {...s.people.find(p=>p.id===id),id,kind:'human',projectRole:member?.role,detail:projectRoles.join('、'),selectionHint:mode==='create'?(member?.role==='owner'?'项目负责人':member?.role==='admin'?'项目管理员':''):'',project:'供应链运营协同'};}).sort((a,b)=>(roleOrder[a.projectRole]??3)-(roleOrder[b.projectRole]??3));
      const items=[...(config.kinds.includes('human')?humans.filter(p=>mode==='add'?!s.projects.prod.humans.some(m=>m.id===p.id):s.projects.prod.humans.some(m=>m.id===p.id)):[]),...(config.kinds.includes('clone')?s.clones.filter(p=>p.ownerId==='u-wangyilin').map(p=>({...p,kind:'clone',detail:'',project:'供应链运营协同'})):[])];
      return h(R.Fragment,null,h(Button,{onClick:()=>setOpen(true)},'查看成员选择器模板'),h(MemberPicker,{visible:open,title:config.title,items,onCancel:()=>setOpen(false),single:config.single,allowEmpty:mode==='clone',submit:config.submit,nameField:mode==='create'?{label:'群聊名称',placeholder:'输入群聊名称',initialValue:name,required:true,maxLength:50}:null,search:!config.single,groups:[{kind:'human',label:'人类成员'},{kind:'clone',label:'我的 AI 分身'}],onSubmit:(chosen,nextName)=>{setSelected(chosen.map(item=>item.id));setName(nextName);setResult('预览结果：'+(chosen.map(p=>p.name).join('、')||'不带入分身')+'。未执行实际业务操作。');}}),result&&h('div',{role:'status',className:'eva-picker-result'},result));
    }
    Preview.SelectionBody=SelectionBody;
    return Preview;
  }};
})(window);
