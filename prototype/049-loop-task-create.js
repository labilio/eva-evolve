(function(root){
  'use strict';
  let Component;
  root.EvaLoopTaskCreateUI={render(props,deps){Component||=create(deps.React);return deps.React.createElement(Component,{...props,deps});}};
  function create(R){
    const h=R.createElement;
    return function LoopTaskCreate({visible,onClose,onCreated,parentIssueId,deps}){
      const {Modal,Button,LoopButton,Input,AutoGrowTextarea,Select,Popover,LoopPropertyPill,statusOptions,priorityOptions,icons,members,createIssue,uploadAttachment,listLabels,createLabel,attachLabel}=deps;
      const project=typeof deps.project==='function'?deps.project():deps.project;
      R.useSyncExternalStore(members.subscribe,members.getSnapshot,members.getSnapshot);
      const snapshot=members.snapshot(),pid=project?.collaborationId||(project?.id==='p-supply'?'prod':project?.id),scope=snapshot.projects[pid];
      const empty=()=>({title:'',description:'',status:'todo',priority:'none',assignee:'',labels:[]});
      const [form,setForm]=R.useState(empty),[labels,setLabels]=R.useState([]),[tagQuery,setTagQuery]=R.useState(''),[tagMenuOpen,setTagMenuOpen]=R.useState(false),[files,setFiles]=R.useState([]),[busy,setBusy]=R.useState(false),[error,setError]=R.useState('');
      const lock=R.useRef(false),host=R.useRef(null),fileInput=R.useRef(null),generation=R.useRef(0),created=R.useRef(null),uploaded=R.useRef(new Map()),attached=R.useRef(new Set());
      R.useEffect(()=>{
        const token=++generation.current;
        setForm(empty());setTagQuery('');setTagMenuOpen(false);setFiles([]);setError('');setBusy(false);lock.current=false;created.current=null;uploaded.current.clear();attached.current.clear();setLabels([]);
        if(visible)Promise.resolve().then(()=>listLabels()).then(rows=>{if(generation.current===token)setLabels(Array.isArray(rows)?rows:rows?.items||[]);}).catch(()=>{if(generation.current===token)setError('标签暂时无法加载，其他内容仍可填写。');});
        return()=>{generation.current++;};
      },[visible,project?.id,parentIssueId,snapshot.actorId]);
      const humans=(scope?.humans||[]).map(row=>snapshot.people.find(p=>p.id===row.id)).filter(Boolean);
      const clones=(scope?.cloneIds||[]).map(id=>snapshot.clones.find(c=>c.id===id)).filter(Boolean);
      const employees=(scope?.employeeIds||[]).map(id=>members.employee(id)).filter(Boolean);
      const projectAgent=scope?members.projectAgent(pid):null;
      const candidates=[...humans.map(p=>({...p,type:'member'})),...clones.map(p=>({...p,type:'agent'})),...employees.map(p=>({...p,type:'agent'})),...(projectAgent?[{...projectAgent,type:'agent'}]:[])];
      const selected=candidates.find(p=>p.id===form.assignee),patch=(key,value)=>setForm(old=>({...old,[key]:value}));
      const popup=()=>host.current;
      function identity(person){
        if(person.type!=='agent'&&deps.HumanIdentity)return h(deps.HumanIdentity,{id:person.id,compact:true});
        const ai=person.type==='agent';
        const appearance=person.identityAppearance||(person.kind==='project-agent'?root.EvaAIIdentity.projectAgentAppearance():{name:person.name,avatar:person.avatar||root.__EVA_COLLEAGUE_PORTRAIT,logo:root.__EVA_COLLEAGUE_PORTRAIT});
        return h('span',{className:'eva-loop-task-create__identity'},ai?root.EvaAIIdentity.avatar(appearance,24,h):h('img',{src:root.EvaAvatar.personUri(person.id),alt:'',width:24,height:24}),h('span',null,person.name),ai&&root.EvaAIIdentity.badge(h));
      }
      const close=()=>{if(!lock.current)onClose();};
      async function submit(){
        if(lock.current)return;
        if(!scope||!project?.id||!members.canRead(pid,snapshot.actorId)){setError('请从具体项目中创建任务。');return;}
        if(!form.title.trim()){setError('请填写任务标题。');return;}
        if(form.assignee&&!selected){setError('负责人已不在当前项目，请重新选择。');return;}
        lock.current=true;setBusy(true);setError('');const token=generation.current;
        try{
          const attachmentIds=[];
          for(const file of files){if(!uploaded.current.has(file)){const result=await uploadAttachment(file);if(token!==generation.current)return;if(!result?.id)throw new Error('附件上传失败');uploaded.current.set(file,result.id);}attachmentIds.push(uploaded.current.get(file));}
          if(token!==generation.current)return;
          if(!created.current){const result=await createIssue({title:form.title.trim(),description:form.description.trim(),status:form.status,priority:form.priority,project_id:project.id,workspace_id:pid,assignee_id:selected?.id||null,assignee_type:selected?.type||null,assignee_name:selected?.name||null,attachment_ids:attachmentIds,parent_issue_id:parentIssueId});if(token!==generation.current)return;created.current=result;}
          if(!created.current?.id)throw new Error('任务创建未返回任务编号，请重试。');
          for(const id of form.labels){if(!attached.current.has(id)){await attachLabel(created.current.id,id);if(token!==generation.current)return;attached.current.add(id);}}
          if(token===generation.current){onCreated?.(created.current);onClose();}
        }catch(e){if(token===generation.current)setError((created.current?'任务已创建，标签未全部保存。再次点击仅补存标签。':'')+(e?.message||'保存失败，请重试。'));}
        finally{if(token===generation.current){lock.current=false;setBusy(false);}}
      }
      const disabled=busy||!!created.current;
      async function addTaskLabel(value){
        const name=String(value||'').trim();if(!name||disabled)return;const token=generation.current;
        const existing=labels.find(label=>label.name===name);
        try{
          const label=existing||await createLabel(name);if(token!==generation.current)return;if(!label?.id)throw new Error('标签创建失败，请重试。');
          setLabels(rows=>rows.some(row=>row.id===label.id)?rows:[...rows,label]);setForm(old=>({...old,labels:[...new Set([...old.labels,label.id])]}));setTagQuery('');
        }catch(e){if(token===generation.current)setError(e?.message||'标签创建失败，请重试。');}
      }
      function selectTaskLabel(id){patch('labels',[...new Set([...form.labels,id])]);setTagQuery('');}
      const attachmentButton=h(R.Fragment,null,
        h('input',{type:'file',multiple:true,hidden:true,ref:fileInput,onChange:e=>{setFiles(old=>[...old,...Array.from(e.target.files||[])]);e.target.value='';}}),
        h('button',{type:'button',className:'loop-ci__attach','aria-label':'添加附件',title:'添加附件',disabled,onClick:()=>fileInput.current?.click()},h(icons.Paperclip,{size:18}))
      );
      const normalizedTagQuery=tagQuery.trim().toLowerCase(),tagOptions=labels.filter(label=>!normalizedTagQuery||label.name.toLowerCase().includes(normalizedTagQuery)),hasExactTag=labels.some(label=>label.name.toLowerCase()===normalizedTagQuery);
      const taskLabels=h('div',{className:'eva-loop-task-create__tag-combobox'},
        form.labels.length?h('div',{className:'eva-loop-task-create__tag-selected'},form.labels.map(id=>{const label=labels.find(item=>item.id===id);return label&&h('button',{type:'button',className:'eva-loop-task-create__tag-chip',key:id,'aria-label':'移除标签 '+label.name,disabled,onClick:()=>patch('labels',form.labels.filter(item=>item!==id))},label.name,h(icons.X,{size:12}));})):null,
        h(Popover,{trigger:'custom',visible:tagMenuOpen&&!disabled,position:'bottomLeft',getPopupContainer:popup,onClickOutSide:()=>setTagMenuOpen(false),content:h('div',{className:'eva-loop-task-create__tag-menu',role:'listbox'},tagOptions.map(label=>h('button',{type:'button',key:label.id,role:'option','aria-selected':form.labels.includes(label.id),onMouseDown:event=>event.preventDefault(),onClick:()=>selectTaskLabel(label.id)},label.name)),normalizedTagQuery&&!hasExactTag&&h('button',{type:'button',className:'eva-loop-task-create__tag-create-option','aria-label':'新建标签：'+tagQuery,onMouseDown:event=>event.preventDefault(),onClick:()=>addTaskLabel(tagQuery)},'新建“'+tagQuery.trim()+'”'),!tagOptions.length&&!normalizedTagQuery&&h('p',null,'暂无任务标签'))},h(Input,{value:tagQuery,onChange:setTagQuery,onFocus:()=>setTagMenuOpen(true),onBlur:()=>setTimeout(()=>setTagMenuOpen(false),120),onEnterPress:()=>addTaskLabel(tagQuery),placeholder:'选择或输入任务标签',maxLength:20,disabled,'aria-label':'添加或编辑任务标签'}))
      );
      // Layout restored from the pre-7da18d9 Loop CreateIssueModal.
      // The outer collaboration project is fixed; there is no Loop project picker.
      return h(R.Fragment,null,
        h('div',{className:'eva-loop-task-create-portal',ref:host}),
        h(Modal,{visible,className:'loop-modal loop-ci-modal eva-loop-task-create',width:600,title:null,header:null,footer:null,closable:false,getPopupContainer:popup,onCancel:close,maskClosable:!busy,closeOnEsc:!busy},
          h('div',{className:'loop-ci'},
            h('div',{className:'loop-ci__head'},h('div',{className:'loop-ci__crumb'},
              h('span',{className:'loop-ci__crumb-ws'},project?.name||project?.title||''),
              h(icons.ChevronRight,{size:13,className:'loop-ci__crumb-sep'}),
              h('span',{className:'loop-ci__crumb-cur'},parentIssueId?'新建子任务':'新建任务')),
              h('button',{type:'button',className:'loop-ci__close',onClick:close,disabled:busy,'aria-label':'关闭'},h(icons.X,{size:16}))),
            h('input',{autoFocus:true,className:'loop-ci__title',value:form.title,maxLength:200,disabled,'aria-label':'任务标题',placeholder:'输入标题…',onChange:e=>patch('title',e.target.value),onKeyDown:e=>{if(e.key==='Enter'&&!e.nativeEvent.isComposing){e.preventDefault();submit();}}}),
            h(AutoGrowTextarea,{className:'loop-ci__desc',value:form.description,disabled,'aria-label':'任务描述',placeholder:'补充描述…',onChange:value=>patch('description',value)}),
            selected?.type==='agent'&&h('div',{className:'loop-ci__hint'},identity(selected),h('span',null,'分派给 AI 不会立即启动执行')),
            h('div',{className:'loop-ci__toolbar'},
              h(LoopPropertyPill,{value:form.status,options:statusOptions,onChange:value=>{if(!disabled)patch('status',value)},ariaLabel:'状态',disabled,getPopupContainer:popup}),
              h(LoopPropertyPill,{value:form.priority,options:priorityOptions,onChange:value=>{if(!disabled)patch('priority',value)},ariaLabel:'优先级',disabled,getPopupContainer:popup}),
              h(Select,{className:'eva-loop-task-create__assignee',value:form.assignee||undefined,optionList:candidates.map(person=>({value:person.id,label:identity(person)})),placeholder:'未指派','aria-label':'执行负责人',showClear:true,disabled,getPopupContainer:popup,onChange:value=>patch('assignee',value||'')})),
            h('div',{className:'loop-ci__labels'},taskLabels),
            files.length>0&&h('div',{className:'eva-loop-task-create__attachments'},files.map((file,index)=>h('div',{className:'eva-loop-task-create__attachment',key:index},h('span',null,file.name),h(Button,{theme:'borderless',icon:h(icons.Trash2,{size:14}),'aria-label':'移除 '+file.name,disabled,onClick:()=>setFiles(old=>old.filter((_,i)=>i!==index))})))),
            error&&h('p',{className:'eva-loop-task-create__error',role:'alert'},error),
            h('div',{className:'loop-ci__footer'},attachmentButton,h('div',{className:'loop-ci__footer-right'},
              h(LoopButton,{variant:'ghost',onClick:close,disabled:busy},'取消'),
              h(LoopButton,{onClick:submit,loading:busy,disabled:busy||!form.title.trim()||!scope||!members.canRead(pid,snapshot.actorId)},created.current?'补存标签':'创建'))))));
    };
  }
})(window);
