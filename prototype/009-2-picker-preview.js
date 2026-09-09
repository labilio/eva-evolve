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
    function SelectionBody({items,selected,onChange,single,showProjectFilter,humanHint}){
      const [project,setProject]=R.useState('all');
      const visible=items.filter(p=>project==='all'||p.project===project);
      const toggle=id=>onChange(single?[id]:selected.includes(id)?selected.filter(x=>x!==id):[...selected,id]);
      return h('div',{className:'eva-picker-body'},showProjectFilter&&h('div',{className:'eva-picker-filter'},h(Select,{'aria-label':'按项目筛选',value:project,onChange:setProject,optionList:[{value:'all',label:'全部可选人员'},{value:'供应链运营协同',label:'供应链运营协同'}]})),
        h('div',{className:'eva-picker-list'},
          !visible.length&&h('div',{className:'eva-picker-empty'},h('strong',null,'暂无可选成员'),h('p',null,'当前范围内没有可选择的人类或分身。')),
          ['human','clone'].map(kind=>{const rows=visible.filter(p=>p.kind===kind);return rows.length>0&&h('section',{key:kind},h('div',{className:'eva-picker-group'},h('strong',null,kind==='human'?'同事':'我的 AI 分身'),h('span',null,rows.length),h('small',null,kind==='clone'?'仅可带入自己的分身，确认后直接加入。':humanHint||(single?'仅可选择一位人类，分身不能承担治理职责。':'确认后直接加入。'))),rows.map(p=>h('div',{key:p.id,className:'eva-picker-row'+(selected.includes(p.id)?' is-selected':'')},h(single?Radio:Checkbox,{'aria-label':'选择'+p.name,name:'eva-picker-choice',checked:selected.includes(p.id),disabled:!!p.disabled,onChange:()=>{if(!p.disabled)toggle(p.id);}}),p.kind==='clone'?root.EvaAIIdentity.avatar(root.EvaAIIdentity.cloneAppearance(store.person(p.ownerId)),36,h):h('span',{className:'eva-picker-avatar'},h('img',{alt:'',src:p.id==='u-wangyilin'?root.__EVA_CURRENT_USER_PORTRAIT:root.EvaAvatar.personUri(p.id)})),h('span',{className:'eva-picker-person'},h('span',{className:'eva-picker-name'},h('span',{className:'eva-picker-name-text',title:p.name},p.name),p.kind==='clone'&&root.EvaAIIdentity.badge(h)),p.detail&&h('span',{className:'eva-picker-detail'},p.detail)),p.selectionHint&&h('span',{className:'eva-picker-selection-hint'},p.selectionHint))))})));
    }
    function Preview(){
      const [open,setOpen]=R.useState(true),[mode]=R.useState(()=>{const value=new URLSearchParams(root.location.search).get('picker-preview');return modes[value]?value:'create';}),[selected,setSelected]=R.useState([]),[name,setName]=R.useState('供应商整改协同'),[result,setResult]=R.useState(null);
      const config=modes[mode],s=store.snapshot();
      const roleNames={owner:'负责人',admin:'管理员',member:'成员'};
      const roleOrder={owner:0,admin:1,member:2};
      const humans=['u-hejing','u-suhang','u-linxiao','u-zhouyuan'].map(id=>{const member=s.projects.prod.humans.find(p=>p.id===id);return {...s.people.find(p=>p.id===id),id,kind:'human',projectRole:member?.role,detail:member?roleNames[member.role]||'成员':'',selectionHint:mode==='create'&&member&&['owner','admin'].includes(member.role)?'加入后拥有群管理权限':'',project:'供应链运营协同'};}).sort((a,b)=>(roleOrder[a.projectRole]??3)-(roleOrder[b.projectRole]??3));
      const items=[...(config.kinds.includes('human')?humans.filter(p=>mode==='add'?!s.projects.prod.humans.some(m=>m.id===p.id):s.projects.prod.humans.some(m=>m.id===p.id)):[]),...(config.kinds.includes('clone')?s.clones.filter(p=>p.ownerId==='u-wangyilin').map(p=>({...p,kind:'clone',detail:'',project:'供应链运营协同'})):[])];
      const chosen=items.filter(p=>selected.includes(p.id)),humanCount=chosen.filter(p=>p.kind==='human').length,cloneCount=chosen.length-humanCount;
      
      const valid=mode==='clone'||(chosen.length>0&&(mode!=='create'||!!name.trim()));
      const summary=[humanCount&&`${humanCount} 位人类`,cloneCount&&`${cloneCount} 个分身`].filter(Boolean).join(' · ');
      return h(R.Fragment,null,h(Button,{onClick:()=>setOpen(true)},'查看成员选择器模板'),h(Modal,{className:'eva-members-modal eva-picker-modal',width:640,visible:open,title:config.title,footer:null,onCancel:()=>setOpen(false)},h('div',{className:'eva-picker-heading'},config.hint&&h('p',null,config.hint),mode==='create'&&h(Input,{'aria-label':'群聊名称',value:name,onChange:setName,placeholder:'群聊名称'})),
        h(SelectionBody,{key:mode,items,selected,onChange:ids=>{setSelected(ids);setResult(null);},single:config.single,showProjectFilter:mode==='add'}),
        chosen.length>0&&h('div',{className:'eva-picker-selected'},h('div',{className:'eva-picker-selection-title'},h('strong',null,summary),selected.length>0&&h(Button,{size:'small',theme:'borderless',type:'tertiary',onClick:()=>{setSelected([]);setResult(null);}},'清空')),chosen.length>0&&h('div',{className:'eva-picker-chips'},chosen.map(p=>h(Button,{key:p.id,size:'small',theme:'light',type:'tertiary','aria-label':'取消选择'+p.name,onClick:()=>{setSelected(selected.filter(id=>id!==p.id));setResult(null);}},p.name+' · 取消')))),
        result&&h('div',{role:'status',className:'eva-picker-result'},result),h('div',{className:'eva-picker-footer'},h(Button,{onClick:()=>setOpen(false)},'取消'),h(Button,{theme:'solid',disabled:!valid,onClick:()=>setResult('预览结果：'+(chosen.map(p=>p.name).join('、')||'不带入分身')+'。未执行实际业务操作。')},config.submit))));
    }
    Preview.SelectionBody=SelectionBody;
    return Preview;
  }};
})(window);
