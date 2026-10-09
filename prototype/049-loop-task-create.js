(function(root){
  'use strict';
  let Component;
  root.EvaLoopTaskCreateUI={render(props,deps){Component||=create(deps.React);return deps.React.createElement(Component,{...props,deps});}};
  function create(R){
    const h=R.createElement;
    return function LoopTaskCreate({visible,onClose,onCreated,parentIssueId,parentIssue,deps}){
      const {forms,Modal,Button,Input,AssigneePicker,DatePicker,Popover,LoopPropertyPill,statusOptions,priorityOptions,icons,members,createIssue,uploadAttachment,listLabels,createLabel,attachLabel}=deps;
      const project=typeof deps.project==='function'?deps.project():deps.project;
      R.useSyncExternalStore(members.subscribe,members.getSnapshot,members.getSnapshot);
      const actor=members.actorId(),pid=project?.collaborationId||(project?.id==='p-supply'?'prod':project?.id),scope=members.projectRecord(pid);
      const empty=()=>({title:'',description:'',status:'todo',priority:'none',assignee:'',dueDate:'',labels:[]});
      const {Form,useSubmission,SubmissionError,Actions}=forms;
      const [formApi,,values]=Form.useForm(),form={...empty(),...values};
      const [labels,setLabels]=R.useState([]),[tagQuery,setTagQuery]=R.useState(''),[tagMenuOpen,setTagMenuOpen]=R.useState(false),[files,setFiles]=R.useState([]),[error,setError]=R.useState('');
      const host=R.useRef(null),fileInput=R.useRef(null),generation=R.useRef(0),created=R.useRef(null),uploaded=R.useRef(new Map()),attached=R.useRef(new Set());
      const submission=useSubmission({active:visible,resetKey:[project?.id,parentIssueId,actor].join(':'),onSubmit:save});
      const busy=submission.busy;
      R.useEffect(()=>{
        const token=++generation.current;
        if(visible){formApi.reset();formApi.setValues(empty());}setTagQuery('');setTagMenuOpen(false);setFiles([]);setError('');created.current=null;uploaded.current.clear();attached.current.clear();setLabels([]);
        if(visible)Promise.resolve().then(()=>listLabels()).then(rows=>{if(generation.current===token)setLabels(Array.isArray(rows)?rows:rows?.items||[]);}).catch(()=>{if(generation.current===token)setError('标签暂时无法加载，其他内容仍可填写。');});
        return()=>{generation.current++;};
      },[visible,project?.id,parentIssueId,actor]);
      // 负责人只能是本项目联系人；来源者与创建者不提供选项，提交时固定为当前操作人本人。
      const humans=(scope?.humans||[]).map(row=>members.personRecord(row.id)).filter(Boolean);
      const candidates=humans.map(p=>({...p,type:'member'}));
      const selected=candidates.find(p=>p.id===form.assignee),patch=(key,value)=>formApi.setValue(key,value);
      const popup=()=>host.current;
      function identity(person){
        if(person.type!=='agent'&&deps.HumanIdentity)return h(deps.HumanIdentity,{id:person.id,compact:true});
        const ai=person.type==='agent';
        const appearance=person.identityAppearance||(person.kind==='project-agent'?root.EvaAIIdentity.projectAgentAppearance():{name:person.name,avatar:person.avatar||root.__EVA_COLLEAGUE_PORTRAIT,logo:root.__EVA_COLLEAGUE_PORTRAIT});
        return h('span',{className:'eva-loop-task-create__identity'},ai?root.EvaAIIdentity.avatar(appearance,24,h):h('img',{src:root.EvaAvatar.personUri(person.id),alt:'',width:24,height:24}),h('span',null,person.name),ai&&root.EvaAIIdentity.badge(h));
      }
      const close=()=>onClose();
      async function save(values,{isCurrent}){
        if(!scope||!project?.id||!members.canRead(pid,actor))throw new Error('请从具体项目中创建任务。');
        const data={...empty(),...values},assignee=candidates.find(p=>p.id===data.assignee);
        if(data.assignee&&!assignee)throw new Error('负责人已不在当前项目，请重新选择。');
        setError('');
        let issue=created.current;const attachedIds=new Set(attached.current);
        try{
          const attachmentIds=[];
          for(const file of files){if(!uploaded.current.has(file)){const result=await uploadAttachment(file);if(!isCurrent())return;if(!result?.id)throw new Error('附件上传失败');uploaded.current.set(file,result.id);}attachmentIds.push(uploaded.current.get(file));}
          if(!isCurrent())return;
          if(!issue){const result=await createIssue({title:data.title.trim(),description:data.description.trim(),status:data.status,priority:data.priority,due_date:data.dueDate||null,project_id:project.id,workspace_id:pid,assignee_id:assignee?.id||null,assignee_type:assignee?.type||null,assignee_name:assignee?.name||null,source_id:actor,creator_id:actor,attachment_ids:attachmentIds,parent_issue_id:parentIssueId});issue=result;if(isCurrent())created.current=result;}
          if(!issue?.id)throw new Error('任务创建未返回任务编号，请重试。');
          // Once creation has committed, finish its business transaction even when
          // the dialog closed. Only the current instance may receive UI/ref updates.
          for(const id of data.labels){if(!attachedIds.has(id)){await attachLabel(issue.id,id);attachedIds.add(id);if(isCurrent())attached.current=new Set(attachedIds);}}
          if(isCurrent()){onCreated?.(issue);onClose();}
        }catch(e){throw new Error((issue?'任务已创建，标签未全部保存。再次点击仅补存标签。':'')+(e?.message||'保存失败，请重试。'));}
      }
      const disabled=busy||!!created.current;
      async function addTaskLabel(value){
        const name=String(value||'').trim();if(!name||disabled)return;const token=generation.current;
        const existing=labels.find(label=>label.name===name);
        try{
          const label=existing||await createLabel(name);if(token!==generation.current)return;if(!label?.id)throw new Error('标签创建失败，请重试。');
          setLabels(rows=>rows.some(row=>row.id===label.id)?rows:[...rows,label]);patch('labels',[...new Set([...(formApi.getValue('labels')||[]),label.id])]);setTagQuery('');
        }catch(e){if(token===generation.current)setError(e?.message||'标签创建失败，请重试。');}
      }
      function selectTaskLabel(id){patch('labels',[...new Set([...form.labels,id])]);setTagQuery('');}
      const attachmentButton=h(R.Fragment,null,
        h('input',{type:'file',multiple:true,hidden:true,ref:fileInput,onChange:e=>{setFiles(old=>[...old,...Array.from(e.target.files||[])]);e.target.value='';}}),
        h('button',{type:'button',className:'loop-ci__attach','aria-label':'添加附件',title:'添加附件',disabled,onClick:()=>fileInput.current?.click()},h(icons.Paperclip,{size:18}))
      );
      const normalizedTagQuery=tagQuery.trim().toLowerCase(),tagOptions=labels.filter(label=>!normalizedTagQuery||label.name.toLowerCase().includes(normalizedTagQuery)),hasExactTag=labels.some(label=>label.name.toLowerCase()===normalizedTagQuery);
      const taskLabels=h('div',{className:'eva-loop-task-create__tag-combobox'},
        form.labels.length?h('div',{className:'eva-loop-task-create__tag-selected'},form.labels.map(id=>{const label=labels.find(item=>item.id===id);return label&&h('button',{type:'button',className:'eva-loop-task-create__tag-chip',key:id,'aria-label':'移除标签 '+label.name,disabled,onClick:()=>patch('labels',form.labels.filter(item=>item!==id))},root.EvaLoopTaskComponents.labelChip(R,label,{suffix:h(icons.X,{size:12,'aria-hidden':true})}));})):null,
        h(Popover,{trigger:'custom',visible:tagMenuOpen&&!disabled,onEscKeyDown:event=>{if(tagMenuOpen){event.preventDefault();event.stopPropagation();setTagMenuOpen(false);}},position:'bottomLeft',getPopupContainer:popup,onClickOutSide:()=>setTagMenuOpen(false),content:h('div',{className:'eva-loop-task-create__tag-menu',role:'listbox'},tagOptions.map((label,index)=>h('button',{type:'button',key:label.id,className:normalizedTagQuery&&index===0?'is-active':'',role:'option','aria-selected':form.labels.includes(label.id),onMouseDown:event=>event.preventDefault(),onClick:()=>selectTaskLabel(label.id)},root.EvaLoopTaskComponents.labelChip(R,label),form.labels.includes(label.id)?h(icons.Check,{size:14,className:'eva-loop-task-create__tag-check','aria-hidden':true}):null)),normalizedTagQuery&&!hasExactTag&&h('button',{type:'button',className:'eva-loop-task-create__tag-create-option','aria-label':'新建标签：'+tagQuery,onMouseDown:event=>event.preventDefault(),onClick:()=>addTaskLabel(tagQuery)},root.EvaLoopTaskComponents.labelCreateOption(R,icons.Plus,tagQuery)),!tagOptions.length&&!normalizedTagQuery&&h('p',null,'暂无任务标签'))},h(Input,{value:tagQuery,onChange:setTagQuery,onFocus:()=>setTagMenuOpen(true),onBlur:()=>setTimeout(()=>setTagMenuOpen(false),120),onEnterPress:()=>normalizedTagQuery?(tagOptions.length?selectTaskLabel(tagOptions[0].id):addTaskLabel(tagQuery)):undefined,placeholder:'选择或输入任务标签',maxLength:20,disabled,'aria-label':'添加或编辑任务标签'}))
      );
      // Layout restored from the pre-7da18d9 Loop CreateIssueModal.
      // The outer collaboration project is fixed; there is no Loop project picker.
      return h(R.Fragment,null,
        h('div',{className:'eva-loop-task-create-portal',ref:host}),
        h(Modal,{visible,className:'loop-modal loop-ci-modal eva-loop-task-create',width:600,accessibleName:parentIssueId?'新建子任务':'新建任务',title:null,header:null,footer:null,closable:false,getPopupContainer:popup,onCancel:close,maskClosable:true,closeOnEsc:true},
          h(Form,{...submission.formProps,form:formApi,initValues:empty(),className:'loop-ci'},
            h('div',{className:'loop-ci__head'},h('div',{className:'loop-ci__crumb'},
              h('span',{className:'loop-ci__crumb-ws'},project?.name||project?.title||''),
              h(icons.ChevronRight,{size:13,className:'loop-ci__crumb-sep'}),
              parentIssueId&&h('span',{className:'loop-ci__crumb-parent',title:parentIssue?.title||parentIssue?.identifier||''},parentIssue?.identifier||'父任务'),
              parentIssueId&&h(icons.ChevronRight,{size:13,className:'loop-ci__crumb-sep'}),
              h('span',{className:'loop-ci__crumb-cur'},parentIssueId?'新建子任务':'新建任务')),
              h('button',{type:'button',className:'loop-ci__close',onClick:close,disabled:busy,'aria-label':'关闭'},h(icons.X,{size:16}))),
            h(Form.TextArea,{autosize:{minRows:1},field:'title',noLabel:true,rules:[{required:true,whitespace:true,message:'请填写任务标题'}],autoFocus:true,className:'loop-ci__title',rows:1,maxLength:200,disabled,'aria-label':'任务标题',placeholder:'输入标题…',convert:value=>value.replace(/[\r\n]+/g,' '),onKeyDown:e=>{if(e.key==='Enter'&&!e.nativeEvent.isComposing){e.preventDefault();submission.submit();}}}),
            h(Form.TextArea,{autosize:{minRows:1},field:'description',noLabel:true,className:'loop-ci__desc',disabled,'aria-label':'任务描述',placeholder:'补充描述…'}),
            selected?.type==='agent'&&h('div',{className:'loop-ci__hint'},identity(selected),h('span',null,'分派给 AI 不会立即启动执行')),
            // 创建弹窗选项区（父容器）固定顺序：状态 → 优先级 → 执行负责人 → 截止日期。
            // 每个胶囊都是自闭合子节点，父容器单独收口，禁止把父容器的收尾括号挂在某个子节点上。
            h('div',{className:'loop-ci__toolbar'},
              h(LoopPropertyPill,{value:form.status,options:statusOptions,onChange:value=>{if(!disabled)patch('status',value)},ariaLabel:'状态',disabled,getPopupContainer:popup}),
              h(LoopPropertyPill,{value:form.priority,options:priorityOptions,onChange:value=>{if(!disabled)patch('priority',value)},ariaLabel:'优先级',disabled,getPopupContainer:popup}),
              h('span',{className:'eva-loop-task-create__assignee','aria-label':'执行负责人'},h(AssigneePicker,{size:'default',candidates,value:selected?.id??null,valueName:selected?.name??null,onChange:value=>patch('assignee',value||'')})),
              root.EvaLoopTaskComponents.dateField(R,DatePicker,{className:'eva-loop-task-create__due',value:form.dueDate||undefined,placeholder:'截止日期','aria-label':'截止日期',showClear:true,disabled,getPopupContainer:popup,onChange:value=>patch('dueDate',value||''),topSlot:null,triggerRender:()=>h('span',{className:'loop-pill eva-loop-task-create__due-pill'+(form.dueDate?' has-value':'')},h(icons.CalendarClock,{size:14,className:'eva-loop-task-create__pill-icon','aria-hidden':true}),h('button',{type:'button',className:'eva-loop-task-create__due-trigger','aria-label':'截止日期'+(form.dueDate?'：'+root.EvaTaskTime.fullDate(form.dueDate):''),disabled},(form.dueDate?root.EvaTaskTime.fullDate(form.dueDate):'截止日期')),form.dueDate?h('button',{type:'button',className:'eva-loop-task-create__due-clear','aria-label':'清除截止日期',disabled,onClick:event=>{event.stopPropagation();patch('dueDate','');}},h(icons.X,{size:12})):null,h(icons.ChevronDown,{size:12,className:'loop-pill__caret','aria-hidden':true}))}),
            ),
            h('div',{className:'loop-ci__labels'},taskLabels),
            files.length>0&&h('div',{className:'eva-loop-task-create__attachments'},files.map((file,index)=>h('div',{className:'eva-loop-task-create__attachment',key:index},h('span',null,file.name),h(Button,{theme:'borderless',icon:h(icons.Trash2,{size:14}),'aria-label':'移除 '+file.name,disabled,onClick:()=>setFiles(old=>old.filter((_,i)=>i!==index))})))),
            h('div',{className:'eva-loop-task-create__feedback'},h(SubmissionError,{error}),h(SubmissionError,{submission})),
            h('div',{className:'loop-ci__footer'},attachmentButton,h(Actions,{onCancel:close,form:submission.formProps.id,busy,disabled:!scope||!members.canRead(pid,actor),submitLabel:created.current?'补存标签':'创建'})))));
    };
  }
})(window);
