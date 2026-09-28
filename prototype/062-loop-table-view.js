/* Eva Loop 项目任务「表格」视图。
 * 行为对齐 Multica Issues Table（列模型、排序、分组、层级、内联编辑、
 * 列显示/隐藏、列拖拽排序、列宽拖拽、搜索、CSV 导出）。
 * 数据与编辑器走 Eva 本地 Loop 数据层与公共身份组件，不做第二套实现。 */
(function(root){
  'use strict';
  let Component;
  root.EvaLoopTableView={render(props,deps){Component||=create(deps);return deps.React.createElement(Component,{...props,deps});}};

  function create(deps){
    const {
      React,useI18n,Popover,Dropdown,Checkbox,Switch,Toast,DatePicker,Input,
      AssigneePicker,LabelManagementModal,RunningChip,useRunConfirm,
      EvaLoopIdentityAvatar,EvaLoopIdentityName,
      updateIssue,batchUpdateIssues,restoreIssues,batchDeleteIssues,confirmDelete,evaIssueChildrenOf,evaIssueDescendantIds,
      evaCurrentTaskProject,evaTaskProjectId,evaTaskProjectIdentities,evaTaskLabels,evaAttachTaskLabel,evaDetachTaskLabel,evaCreateTaskLabel,
      ISSUE_STATUS_ORDER,ISSUE_STATUS_ICON,ISSUE_STATUS_HEX,
      PRIORITY_ORDER,PRIORITY_ICON,
      DndContext,SortableContext,useSortable,useDndContext,
      useSensors,useSensor,PointerSensor,KeyboardSensor,sortableKeyboardCoordinates,
      closestCenter,restrictToHorizontalAxis,horizontalListSortingStrategy,
      icons,
    }=deps;
    const h=React.createElement;

    /* ---------- 弹层菜单公共合同（复用 049 创建任务的选择器模式）：
       Popover trigger:'custom' 受控开关 + onClickOutSide 收起 + 普通 button 列表项。
       触发器只负责打开；关闭统一走外部 mousedown（含再次点触发器：React 根监听
       先于 Semi 绑定在 document 上的 mousedown 关闭器，时序确定）、Escape 与选项点击。 ---------- */
    const menuTrigger=setOpen=>({
      onMouseDown:event=>{if(event.button===0){event.preventDefault();setOpen(true);}},
      onKeyDown:event=>{if(event.key==='Enter'||event.key===' '){event.preventDefault();setOpen(true);}}
    });
    function PopMenu(props){
      const {open,setOpen,position='bottomLeft',role='menu',trigger,children,menuClassName=''}=props;
      React.useEffect(()=>{
        if(!open)return;
        const onKey=event=>{if(event.key==='Escape')setOpen(false);};
        document.addEventListener('keydown',onKey);
        return()=>document.removeEventListener('keydown',onKey);
      },[open,setOpen]);
      return h(Popover,{trigger:'custom',visible:open,position,onClickOutSide:()=>setOpen(false),motion:false,
        content:h('div',{className:'eva-task-table__menu'+(menuClassName?' '+menuClassName:''),role,
          onKeyDown:event=>{if(event.key==='Escape')setOpen(false);}},children)},trigger);
    }
    function MenuItem(props){
      const {role='menuitem',selected,disabled,icon,label,onClick,content,variant}=props;
      const extra=role==='option'?{'aria-selected':!!selected}:{'aria-current':selected?'true':undefined};
      return h('button',{type:'button',role,disabled,...extra,
        className:'eva-task-table__menu-item'+(selected?' is-selected':'')+(variant==='action'?' is-action':''),
        onMouseDown:event=>event.preventDefault(),onClick},
        variant==='action'?null:h('span',{className:'eva-task-table__menu-check'},selected?h(icons.Check,{size:13}):null),
        content||h(React.Fragment,null,icon||null,h('span',{className:'eva-task-table__menu-label'},label)),
        variant==='action'&&selected?h('span',{className:'eva-task-table__menu-check'},h(icons.Check,{size:13})):null);
    }

    /* ---------- Multica 表格列模型 ---------- */
    const COLUMN_LABELS={
      title:'任务',identifier:'编号',status:'状态',priority:'优先级',assignee:'负责人',
      labels:'标签',start_date:'开始日期',due_date:'截止日期',
      created_at:'创建时间',updated_at:'更新时间',child_progress:'子任务进度',creator:'创建者'
    };
    const SYSTEM_COLUMNS=Object.keys(COLUMN_LABELS);
    const DEFAULT_COLUMNS=[
      {key:'title',width:360},{key:'status',width:150},{key:'priority',width:130},
      {key:'assignee',width:180},{key:'due_date',width:140},{key:'labels',width:180}
    ];
    /* 与 Multica SORTABLE_COLUMNS 一致：title 可经菜单排序，但不可拖拽重排。 */
    const SORTABLE_COLUMNS={title:'title',status:'status',priority:'priority',start_date:'start_date',due_date:'due_date',created_at:'created_at',updated_at:'updated_at'};
    const GROUP_OPTIONS=[
      {value:'none',label:'不分组'},{value:'status',label:'状态'},
      {value:'assignee',label:'负责人'},{value:'due_date',label:'截止日期'}
    ];

    /* ---------- 视图状态持久化（本地约定同 readView/writeView） ---------- */
    function storageKey(viewKey){return 'eva-loop-table:'+(viewKey||'collab-tasks');}
    function loadState(viewKey){
      try{
        const raw=localStorage.getItem(storageKey(viewKey));
        if(!raw)return null;
        const parsed=JSON.parse(raw);
        return parsed&&typeof parsed==='object'?parsed:null;
      }catch{return null;}
    }
    function saveState(viewKey,state){
      try{localStorage.setItem(storageKey(viewKey),JSON.stringify(state));}catch{}
    }
    function normalizeColumns(raw){
      const seen=new Set();
      const list=(Array.isArray(raw)?raw:[]).filter(item=>item&&SYSTEM_COLUMNS.includes(item.key)&&!seen.has(item.key)&&(seen.add(item.key),true));
      return list.length?list:DEFAULT_COLUMNS.map(item=>({...item}));
    }
    function clampWidth(key,width){
      const min=key==='title'?260:96,max=640;
      const fallback=key==='title'?360:160;
      const parsed=Math.round(Number(width));
      return Math.max(min,Math.min(max,Number.isFinite(parsed)?parsed:fallback));
    }
    function formatAbsoluteDate(value){
      if(!value)return '';
      try{return new Intl.DateTimeFormat('zh-CN',{month:'short',day:'numeric',year:'numeric'}).format(new Date(value));}
      catch{return String(value);}
    }

    /* ---------- CSV（移植 Multica table-view-model 的转义与拼装） ---------- */
    function escapeCsvCell(value){
      const raw=value==null?'':String(value);
      const text=typeof value==='string'&&/^[=+\-@\t\r]/.test(raw)?`'${raw}`:raw;
      return /[",\n\r]/.test(text)?`"${text.replaceAll('"','""')}"`:text;
    }
    function buildIssueTableCsv(headers,rows){
      return [headers,...rows].map(row=>row.map(escapeCsvCell).join(',')).join('\r\n');
    }
    function downloadCsv(filename,csv){
      const blob=new Blob(['\uFEFF',csv],{type:'text/csv;charset=utf-8'});
      const url=URL.createObjectURL(blob);
      const anchor=document.createElement('a');
      anchor.href=url;anchor.download=filename;anchor.click();
      URL.revokeObjectURL(url);
    }
    function selectionRange(issueIds,anchorId,targetId){
      if(!anchorId)return null;
      const start=issueIds.indexOf(anchorId),end=issueIds.indexOf(targetId);
      if(start<0||end<0)return null;
      return issueIds.slice(Math.min(start,end),Math.max(start,end)+1);
    }

    /* 表格仅适配尺寸与类名，任务属性图形和颜色由公共组件决定。 */
    function StatusGlyph({status,size=14}){
      const Icon=ISSUE_STATUS_ICON[status]||ISSUE_STATUS_ICON.todo;
      return h(Icon,{size,'aria-hidden':true,className:'eva-task-table__glyph'});
    }
    function PriorityGlyph({priority,size=14}){
      const Icon=PRIORITY_ICON[priority]||PRIORITY_ICON.none;
      return h(Icon,{size,'aria-hidden':true,className:'eva-task-table__glyph'});
    }
    /* 菜单展示顺序由项目任务公共组件维护，排序权重仍使用业务域配置。 */
    const PRIORITY_DISPLAY_ORDER=root.EvaLoopTaskComponents.priorityDisplayOrder;

    /* ---------- 枚举单元格：幽灵触发器 + 049 菜单（对齐 Multica PropertyPicker） ---------- */
    function CellMenu({ariaLabel,options,current,trigger,onPick}){
      return root.EvaLoopTaskComponents.enumDropdown(React,Dropdown,{
        ariaLabel,options,value:current,onChange:onPick,trigger,triggerClassName:'eva-task-table__cell-trigger'
      });
    }

    /* ---------- 排序 / 分组 / 层级行构建 ---------- */
    function statusRank(value){const index=ISSUE_STATUS_ORDER.indexOf(value);return index<0?ISSUE_STATUS_ORDER.length:index;}
    function priorityRank(value){const index=PRIORITY_ORDER.indexOf(value);return index<0?PRIORITY_ORDER.length:index;}
    function compareIssues(a,b,sortBy,direction){
      let result=0;
      if(sortBy==='title')result=String(a.title||'').localeCompare(String(b.title||''),'zh-CN');
      else if(sortBy==='status')result=statusRank(a.status)-statusRank(b.status);
      else if(sortBy==='priority')result=priorityRank(a.priority)-priorityRank(b.priority);
      else if(sortBy==='start_date'||sortBy==='due_date'){
        const av=a[sortBy]||null,bv=b[sortBy]||null;
        if(!av&&!bv)result=0;
        else if(!av)result=1;else if(!bv)result=-1;
        else result=av<bv?-1:av>bv?1:0;
      }else{
        const av=a[sortBy]||'',bv=b[sortBy]||'';
        result=av<bv?-1:av>bv?1:0;
      }
      if(result===0)result=String(a.id||'').localeCompare(String(b.id||''));
      return direction==='asc'?result:-result;
    }
    function matchKeyword(issue,keyword){
      const needle=String(keyword||'').trim().toLowerCase();
      if(!needle)return true;
      return String(issue.title||'').toLowerCase().includes(needle)||String(issue.identifier||'').toLowerCase().includes(needle);
    }
    function buildRows(options){
      const {issues,allIssues,grouping,hierarchy,sortBy,direction,search,collapsedGroups,collapsedParents,t}=options;
      const filtered=issues.filter(issue=>matchKeyword(issue,search));
      const sorted=[...filtered].sort((a,b)=>compareIssues(a,b,sortBy,direction));
      const childMap=new Map();
      for(const issue of allIssues||[]){
        const parent=issue.parent_issue_id;
        if(!parent)continue;
        if(!childMap.has(parent))childMap.set(parent,[]);
        childMap.get(parent).push(issue);
      }
      const descendantIds=issueId=>{
        const direct=childMap.get(issueId)||[],seen=new Set(direct.map(item=>item.id));
        for(const item of direct)for(const id of descendantIds(item.id))seen.add(id);
        return seen;
      };
      const progressOf=issueId=>{
        const ids=descendantIds(issueId);
        if(!ids.size)return null;
        const all=Array.from(ids).map(id=>(allIssues||[]).find(item=>item.id===id)).filter(Boolean);
        const done=all.filter(item=>item.status==='done').length;
        return {done,total:all.length};
      };
      const hideIds=new Set();
      if(hierarchy){
        const stack=Array.from((allIssues||[]).filter(issue=>collapsedParents.includes(issue.id)));
        while(stack.length){
          const current=stack.pop();
          for(const child of childMap.get(current.id)||[]){
            if(hideIds.has(child.id))continue;
            hideIds.add(child.id);stack.push(child);
          }
        }
      }
      const visible=sorted.filter(issue=>!hideIds.has(issue.id));
      const groups=[];
      if(grouping==='status'){
        for(const status of ISSUE_STATUS_ORDER){
          const rows=visible.filter(issue=>issue.status===status);
          if(rows.length)groups.push({key:'status:'+status,label:t('loop.status.'+status),rows});
        }
      }else if(grouping==='assignee'){
        const map=new Map();
        for(const issue of visible){
          const key=(issue.assignee_type||'_')+'::'+(issue.assignee_id||'_');
          if(!map.has(key))map.set(key,{key,label:issue.assignee_name||'未分配',assigneeId:issue.assignee_id||null,rows:[]});
          map.get(key).rows.push(issue);
        }
        const list=Array.from(map.values());
        list.sort((a,b)=>{
          const aUnassigned=!a.assigneeId,bUnassigned=!b.assigneeId;
          if(aUnassigned!==bUnassigned)return aUnassigned?1:-1;
          return a.label.localeCompare(b.label,'zh-CN');
        });
        groups.push(...list);
      }else if(grouping==='due_date'){
        /* 截止日期按自然周分组（对齐 Linear 的 Due date 分组，中文文案）：
           已逾期 / 今天 / 本周 / 下周 / 更晚 / 无截止日期，周一为周起点。
           日期比较与截止日单元格一致：纯日期、固定 UTC、不看状态；空桶不渲染。
           用真实系统时间，不锚定演示时间。 */
        const DAY=86400000;
        const todayUtc=dateOnlyToUTC(todayDateOnly());
        const todayDow=(new Date(todayUtc).getUTCDay()+6)%7; /* 0=周一 … 6=周日 */
        const weekEndUtc=todayUtc-todayDow*DAY+6*DAY;
        const nextWeekEndUtc=weekEndUtc+7*DAY;
        const buckets=[
          {key:'due_date:overdue',label:'已逾期'},
          {key:'due_date:today',label:'今天'},
          {key:'due_date:week',label:'本周'},
          {key:'due_date:next',label:'下周'},
          {key:'due_date:later',label:'更晚'},
          {key:'due_date:none',label:'无截止日期'}
        ];
        const map=new Map(buckets.map(bucket=>[bucket.key,[]]));
        for(const issue of visible){
          const utc=dateOnlyToUTC(issue.due_date);
          const key=utc==null?'due_date:none':utc<todayUtc?'due_date:overdue':utc===todayUtc?'due_date:today':utc<=weekEndUtc?'due_date:week':utc<=nextWeekEndUtc?'due_date:next':'due_date:later';
          map.get(key).push(issue);
        }
        for(const bucket of buckets){
          const rows=map.get(bucket.key);
          if(rows.length)groups.push({key:bucket.key,label:bucket.label,rows});
        }
      }else{
        if(visible.length)groups.push({key:null,label:null,rows:visible});
      }
      const rows=[];const visibleIssueIds=[];
      const pushIssue=(issue,list,depth)=>{
        const children=hierarchy?(childMap.get(issue.id)||[]).filter(child=>list.some(item=>item.id===child.id)):[];
        const collapsed=hierarchy&&collapsedParents.includes(issue.id);
        rows.push({kind:'issue',key:issue.id,issue,depth,hasChildren:children.length>0,collapsed});
        visibleIssueIds.push(issue.id);
        if(hierarchy&&children.length&&!collapsed){
          const ordered=[...children].sort((a,b)=>compareIssues(a,b,sortBy,direction));
          for(const child of ordered)pushIssue(child,list,depth+1);
        }
      };
      for(const group of groups){
        const collapsedGroup=group.key&&collapsedGroups.includes(group.key);
        if(group.key)rows.push({kind:'group',key:group.key,label:group.label,count:group.rows.length,collapsed:collapsedGroup});
        if(collapsedGroup)continue;
        for(const issue of group.rows){
          if(hierarchy&&issue.parent_issue_id&&group.rows.some(item=>item.id===issue.parent_issue_id))continue;
          pushIssue(issue,group.rows,0);
        }
      }
      return {rows,visibleIssueIds,progressOf};
    }

    /* ---------- 表头列（拖拽重排 + 排序/隐藏菜单 + 宽度拖拽） ---------- */
    function HeaderCell(props){
      const {columnKey,label,draggable,sortable,active,direction,onSort,onHide,state}=props;
      const [headerOpen,setHeaderOpen]=React.useState(false);
      const {attributes,listeners,setNodeRef,transform,transition,isDragging}=useSortable({id:columnKey,disabled:!draggable});
      const dragging=useDndContext().active!=null;
      const host=React.useRef(null);
      React.useLayoutEffect(()=>{
        const cell=host.current&&host.current.closest('th');
        if(!cell||!dragging)return;
        cell.style.overflow='visible';
        if(isDragging)cell.style.zIndex='20';
        return()=>{cell.style.removeProperty('overflow');cell.style.removeProperty('z-index');};
      },[isDragging,dragging]);
      const startResize=event=>{
        event.preventDefault();event.stopPropagation();
        /* 表格末尾的 --add 占位列是唯一弹性列（colgroup 不设宽度），固定布局
           把所有剩余空间都给它，数据列一律保留各自的显式宽度。因此拖动某列只
           改这一列的宽度：不会像多列摊派那样把剩余空间重新按比例分给邻列。
           阈值内不提交，单击不会把列钉住。 */
        const cell=host.current&&host.current.closest('th');
        const startX=event.clientX;
        const startWidth=(cell?cell.getBoundingClientRect().width:0)||clampWidth(columnKey,state.columns.find(item=>item.key===columnKey)?.width);
        let committed=false;
        const onMove=moveEvent=>{
          const delta=moveEvent.clientX-startX;
          if(!committed&&Math.abs(delta)<4)return;
          committed=true;
          state.setColumns(list=>list.map(item=>item.key===columnKey
            ?{...item,width:clampWidth(columnKey,startWidth+delta)}
            :item));
        };
        const onUp=()=>{
          window.removeEventListener('pointermove',onMove);
          window.removeEventListener('pointerup',onUp);
          window.removeEventListener('pointercancel',onUp);
          if(committed)state.persist();
        };
        window.addEventListener('pointermove',onMove);
        window.addEventListener('pointerup',onUp);
        window.addEventListener('pointercancel',onUp);
      };
      return h('th',{ref:node=>{host.current=node;setNodeRef(node);},
        'data-column-id':columnKey,
        className:'eva-task-table__th'+(columnKey==='title'?' is-pinned-title':'')},
        h('div',{className:'eva-task-table__th-inner'+(isDragging?' is-dragging':''),
          style:{transform:transform?`translate3d(${transform.x}px,0,0)`:undefined,transition}},
          draggable?h('button',{type:'button','aria-label':'重新排列 '+label+' 列',className:'eva-task-table__grip',
            ...attributes,...listeners},h(icons.GripVertical,{size:12})):null,
          h(PopMenu,{open:headerOpen,setOpen:setHeaderOpen,trigger:
            h('button',{type:'button',className:'eva-task-table__th-btn','aria-haspopup':'menu','aria-expanded':headerOpen,...menuTrigger(setHeaderOpen)},
              h('span',{className:'eva-task-table__th-label'},label),
              active?h(direction==='asc'?icons.ArrowUp:icons.ArrowDown,{size:12,className:'eva-task-table__th-arrow'}):null)},
            sortable?[
              h(MenuItem,{key:'asc',variant:'action',selected:active&&direction==='asc',icon:h(icons.ArrowUp,{size:13}),
                label:'升序',onClick:()=>{onSort(columnKey,'asc');setHeaderOpen(false);}}),
              h(MenuItem,{key:'desc',variant:'action',selected:active&&direction==='desc',icon:h(icons.ArrowDown,{size:13}),
                label:'降序',onClick:()=>{onSort(columnKey,'desc');setHeaderOpen(false);}})
            ]:null,
            sortable&&onHide?h('div',{key:'sep',className:'eva-task-table__menu-sep'}):null,
            onHide?h(MenuItem,{key:'hide',variant:'action',icon:h(icons.EyeOff,{size:13}),label:'隐藏列',
              onClick:()=>{onHide();setHeaderOpen(false);}}):null),
          h('span',{className:'eva-task-table__resizer',onPointerDown:startResize,role:'separator','aria-orientation':'vertical','aria-label':'调整 '+label+' 列宽'})));
    }

    /* ---------- 列选择器（仅工具栏入口，表头不再重复） ---------- */
    function ColumnPicker(props){
      const {state}=props;
      const [open,setOpen]=React.useState(false);
      const [query,setQuery]=React.useState('');
      const needle=query.trim().toLowerCase();
      const list=SYSTEM_COLUMNS.filter(key=>!needle||COLUMN_LABELS[key].toLowerCase().includes(needle));
      return h(PopMenu,{open,setOpen,position:'bottomRight',role:'listbox',menuClassName:'eva-task-table__menu--wide','aria-label':'配置列',trigger:
        h('button',{type:'button',className:'eva-task-table__toolbtn','aria-label':'配置列','aria-haspopup':'listbox','aria-expanded':open,title:'列',...menuTrigger(setOpen)},
          h(icons.Columns3,{size:14}),h('span',null,'列'))},
        h(Input,{value:query,onChange:setQuery,placeholder:'搜索列…','aria-label':'搜索列',
          prefix:h(icons.Search,{size:16}),showClear:true}),
        h('div',{className:'eva-task-table__menu-title'},'任务属性'),
        h('div',{className:'eva-task-table__menu-list',role:'presentation'},
          list.length?list.map(key=>h(MenuItem,{key,role:'option',selected:state.columns.some(item=>item.key===key),
            disabled:key==='title',label:COLUMN_LABELS[key],onClick:()=>state.toggleColumn(key)}))
          :h('div',{className:'eva-task-table__menu-empty'},'没有匹配的列')));
    }

    /* 标签展示与详情、看板共用项目任务标签片。
       按单元格实际可用宽度测量：能放下的标签全部显示，放不下的折成 +N；列宽变化实时重算。
       （Multica 原实现写死前 2 个 + +N，这里按用户要求改为按宽度自适应。） */
    const LABEL_TAG_GAP=4;
    function LabelTagList({labels}){
      const rootRef=React.useRef(null);
      const measureRef=React.useRef(null);
      const total=labels?labels.length:0;
      const [count,setCount]=React.useState(total);
      React.useLayoutEffect(()=>{
        if(!total){setCount(0);return;}
        const measure=()=>{
          const root=rootRef.current,box=measureRef.current;
          if(!root||!box){return;}
          const editor=root.closest('.eva-task-table__cell-editor');
          const host=editor||root.parentElement;
          const available=Math.max(0,(host?host.clientWidth:0)-8-2);
          const widths=Array.from(box.children).slice(0,total).map(el=>el.offsetWidth);
          const probe=box.children[total]?box.children[total].offsetWidth:0;
          const prefix=[];
          let acc=0;
          for(let i=0;i<widths.length;i++){acc+=widths[i]+(i>0?LABEL_TAG_GAP:0);prefix[i]=acc;}
          if(prefix[total-1]<=available){setCount(total);return;}
          let fit=0;
          for(let i=1;i<=total;i++){
            if(prefix[i-1]+LABEL_TAG_GAP+probe<=available)fit=i;else break;
          }
          setCount(fit);
        };
        measure();
        const host=rootRef.current&&(rootRef.current.closest('.eva-task-table__cell-editor')||rootRef.current.parentElement);
        if(host&&typeof ResizeObserver!=='undefined'){
          const observer=new ResizeObserver(measure);
          observer.observe(host);
          return ()=>observer.disconnect();
        }
      },[labels]);
      if(!labels||!labels.length)return null;
      const shown=labels.slice(0,count),rest=labels.length-shown.length;
      return h('span',{className:'eva-task-table__label-tags',ref:rootRef},
        h('span',{className:'eva-task-table__label-tags-measure','aria-hidden':'true',ref:measureRef},
          labels.map(label=>h(React.Fragment,{key:label.id},root.EvaLoopTaskComponents.labelChip(React,label))),
          h('span',{key:'__probe',className:'loop-label-chip eva-task-label-chip eva-task-label-chip--overflow'},'+'+Math.max(1,labels.length-1))),
        shown.map(label=>h(React.Fragment,{key:label.id},root.EvaLoopTaskComponents.labelChip(React,label))),
        rest>0?h('span',{className:'loop-label-chip eva-task-label-chip eva-task-label-chip--overflow'},'+'+rest):null);
    }

    /* ---------- 标签单元格：展示 + 编辑（对齐 Multica LabelPicker） ---------- */
    function LabelsCell({issue,project,onChanged}){
      const [open,setOpen]=React.useState(false);
      const [labels,setLabels]=React.useState(()=>evaTaskLabels(project));
      const [creating,setCreating]=React.useState('');
      const [managerOpen,setManagerOpen]=React.useState(false);
      React.useEffect(()=>{if(open)setLabels(evaTaskLabels(project));},[open,project]);
      const attached=issue.labels||[];
      const toggle=async labelId=>{
        const has=attached.some(item=>item.id===labelId);
        try{
          if(has)await evaDetachTaskLabel(project,evaTaskProjectId(project),issue.id,labelId);
          else await evaAttachTaskLabel(project,evaTaskProjectId(project),issue.id,labelId);
          const next=has?attached.filter(item=>item.id!==labelId):[...attached,labels.find(item=>item.id===labelId)].filter(Boolean);
          issue.labels=next;onChanged&&onChanged();
        }catch(error){Toast.error(error?.message||'标签保存失败');}
      };
      const create=async()=>{
        const name=creating.trim();
        if(!name)return;
        try{
          const existing=labels.find(item=>item.name.toLowerCase()===name.toLowerCase());
          if(existing){if(!attached.some(item=>item.id===existing.id))await toggle(existing.id);setCreating('');return;}
          const label=evaCreateTaskLabel(project,name);
          setLabels(evaTaskLabels(project));setCreating('');
          if(!attached.some(item=>item.id===label.id)){
            await evaAttachTaskLabel(project,evaTaskProjectId(project),issue.id,label.id);
            issue.labels=[...attached,label];onChanged&&onChanged();
          }
        }catch(error){Toast.error(error?.message||'标签创建失败');}
      };
      const needle=creating.trim().toLowerCase();
      const filtered=labels.filter(label=>!needle||label.name.toLowerCase().includes(needle));
      const exact=labels.some(label=>label.name.toLowerCase()===needle);
      return h('div',{className:'eva-task-table__cell-editor',onClick:event=>event.stopPropagation()},
        h(PopMenu,{open,setOpen,position:'bottomLeft',role:'listbox',menuClassName:'eva-task-table__menu--wide eva-task-table__menu--labels',trigger:
          attached.length?h('span',{className:'eva-task-table__cell-trigger',role:'button',tabIndex:0,title:'编辑标签','aria-haspopup':'listbox','aria-expanded':open,...menuTrigger(setOpen)},h(LabelTagList,{labels:attached}))
            :h('button',{type:'button',className:'eva-task-table__cell-trigger','aria-label':'添加标签','aria-haspopup':'listbox','aria-expanded':open,...menuTrigger(setOpen)},
              h('span',{className:'eva-task-table__cell-label is-empty'},'空'))},
          h('div',{className:'eva-task-picker-search eva-task-table__label-search'},
            h(Input,{value:creating,onChange:setCreating,placeholder:'搜索标签',maxLength:20,'aria-label':'搜索或新建标签',
              onKeyDown:event=>{if(event.key==='Enter'&&needle&&!exact)create();}})),
          h('div',{className:'eva-task-table__menu-list'},
            filtered.length?filtered.map(label=>h(MenuItem,{key:label.id,role:'option',variant:'action',
              selected:attached.some(item=>item.id===label.id),
              content:root.EvaLoopTaskComponents.labelChip(React,label),onClick:()=>toggle(label.id)}))
            :!needle?h('div',{className:'eva-task-table__menu-empty'},'暂无任务标签'):null,
            needle&&!exact?h(MenuItem,{variant:'action',icon:h(icons.Plus,{size:14}),label:'创建标签“'+creating.trim()+'”',onClick:create}):null),
          h('div',{className:'eva-task-table__menu-sep'}),
          h(MenuItem,{variant:'action',label:'管理标签…',onClick:()=>{setOpen(false);setManagerOpen(true);}})),
        h(LabelManagementModal,{visible:managerOpen,onClose:()=>setManagerOpen(false),onChanged:()=>{setLabels(evaTaskLabels(project));onChanged&&onChanged();}}));
    }

    /* ---------- 标题单元格：层级缩进、子任务折叠；单击打开任务详情，无就地重命名 ---------- */
    function TitleCell({row,state,onOpen}){
      const {issue,depth,hasChildren,collapsed}=row;
      return h('div',{className:'eva-task-table__title',style:{paddingLeft:depth*18}},
        hasChildren?h('button',{type:'button','aria-label':'展开或折叠子任务',className:'eva-task-table__toggle',
          onClick:event=>{event.stopPropagation();state.toggleParent(issue.id);}},
          h(collapsed?icons.ChevronRight:icons.ChevronDown,{size:14})):h('span',{className:'eva-task-table__toggle-spacer'}),
        h('span',{className:'eva-task-table__title-id'},issue.identifier),
        state.running&&state.running.has&&state.running.has(issue.id)?h(RunningChip,null):null,
        h('button',{type:'button',className:'eva-task-table__title-btn',title:issue.title,
          onClick:event=>{event.stopPropagation();onOpen&&onOpen(issue.id);}},issue.title));
    }

    /* ---------- 日历日工具（一比一移植 Multica @multica/core/issues/date） ----------
       日历日无时区漂移：解析容忍 ISO 全时间戳并读取其 UTC 日；格式化强制 timeZone:'UTC'。 */
    const DATE_ONLY_RE=/^(\d{4})-(\d{2})-(\d{2})/;
    function parseDateParts(value){
      const str=String(value||'');
      const match=DATE_ONLY_RE.exec(str);
      if(match)return [Number(match[1]),Number(match[2]),Number(match[3])];
      const parsed=new Date(str);
      if(!Number.isNaN(parsed.getTime()))return [parsed.getUTCFullYear(),parsed.getUTCMonth()+1,parsed.getUTCDate()];
      return null;
    }
    function dateOnlyToUTC(value){
      const parts=parseDateParts(value);
      return parts?Date.UTC(parts[0],parts[1]-1,parts[2]):null;
    }
    /** 严格早于今天（查看者本地日历日）。 */
    function isPastDateOnly(value){
      const utc=dateOnlyToUTC(value);
      if(utc==null)return false;
      const now=new Date();
      return utc<Date.UTC(now.getFullYear(),now.getMonth(),now.getDate());
    }
    /** 本地今天是哪一天（查看者日历日），与 Multica todayDateOnly 一致。 */
    function todayDateOnly(){
      const now=new Date();
      const pad=value=>String(value).padStart(2,'0');
      return now.getFullYear()+'-'+pad(now.getMonth()+1)+'-'+pad(now.getDate());
    }
    /* ---------- 日期单元格（开始/截止）：统一 Semi 日期面板 ----------
       幽灵触发器「图标 + 短格式日期 / 占位文案」，截止日期早于今天标红（纯日期比较，不看状态）。
       顶部保留「无日期」空值行；日历与创建、详情使用同一 Semi 面板配置。 */
    function DateCell({issue,field,label,applyUpdate}){
      const value=issue[field]?String(issue[field]).slice(0,10):undefined;
      const overdue=field==='due_date'&&issue.status!=='done'&&issue.status!=='cancelled'&&isPastDateOnly(value);
      const commit=next=>{
        if(next!==(value||null))applyUpdate(issue,{[field]:next});
      };
      return h('div',{className:'eva-task-table__cell-editor',onClick:event=>event.stopPropagation()},
        root.EvaLoopTaskComponents.dateField(React,DatePicker,{
          className:'eva-task-table__date-picker',value,label,onChange:commit,overdue,
          icon:field==='start_date'?icons.CalendarClock:icons.CalendarDays,
          triggerClassName:'eva-task-table__cell-trigger',textClassName:'eva-task-table__cell-label',iconClassName:'eva-task-table__glyph'}));
    }

    /* ---------- 主组件 ---------- */
    function EvaIssueTable(props){
      const {issues,allIssues,onOpen,onChanged,running,viewKey,projectId}=props;
      const {t}=useI18n();
      const {requestStatus,requestAssign,runConfirmModal}=useRunConfirm();
      const saved=React.useMemo(()=>loadState(viewKey),[]);
      const [columns,setColumns]=React.useState(()=>normalizeColumns(saved&&saved.columns));
      const [grouping,setGrouping]=React.useState((saved&&saved.grouping)||'status');
      /* 新视图默认按状态分组并展示层级；持久化里的显式选择优先。 */
      const [hierarchy,setHierarchy]=React.useState(saved&&typeof saved.hierarchy==='boolean'?saved.hierarchy:true);
      const [collapsedGroups,setCollapsedGroups]=React.useState((saved&&saved.collapsedGroups)||[]);
      const [collapsedParents,setCollapsedParents]=React.useState((saved&&saved.collapsedParents)||[]);
      const [sortBy,setSortBy]=React.useState((saved&&saved.sortBy)||'created_at');
      const [direction,setDirection]=React.useState((saved&&saved.direction)||'desc');
      const [search,setSearch]=React.useState('');
      const [selection,setSelection]=React.useState([]);
      const anchorRef=React.useRef(null);
      const project=React.useMemo(()=>evaCurrentTaskProject(),[]);
      /* 负责人只能是本项目联系人（对齐详情/列表/新建规则）：候选收敛到 member，不再回退到含 AI 的全局候选。 */
      const assigneeCandidates=React.useMemo(()=>evaTaskProjectIdentities(evaTaskProjectId(project),'member'),[projectId,project]);
      React.useEffect(()=>{setSelection([]);setCollapsedParents([]);setCollapsedGroups([]);},[projectId]);
      React.useEffect(()=>{if(selection.length===0)anchorRef.current=null;},[selection.length]);
      const persist=React.useCallback(()=>{
        saveState(viewKey,{columns,grouping,hierarchy,collapsedGroups,collapsedParents,sortBy,direction});
      },[viewKey,columns,grouping,hierarchy,collapsedGroups,collapsedParents,sortBy,direction]);
      React.useEffect(()=>{persist();},[persist]);

      const built=React.useMemo(()=>buildRows({
        issues,allIssues,grouping,hierarchy,sortBy,direction,search,
        collapsedGroups,collapsedParents,t
      }),[issues,allIssues,grouping,hierarchy,sortBy,direction,search,collapsedGroups,collapsedParents]);
      const visibleIssueIds=built.visibleIssueIds;
      const selectedSet=React.useMemo(()=>new Set(selection),[selection]);
      const selectedIssues=React.useMemo(()=>issues.filter(issue=>selectedSet.has(issue.id)),[issues,selection]);

      const applyUpdate=React.useCallback(async(issue,updates)=>{
        try{await updateIssue(issue.id,updates);onChanged&&onChanged();}
        catch(error){Toast.error(error?.message||'保存失败');}
      },[onChanged]);
      const changeStatus=React.useCallback((issue,status)=>{
        requestStatus(issue,status,async extra=>{
          await updateIssue(issue.id,{status,...extra});onChanged&&onChanged();
        });
      },[onChanged]);
      const changeAssignee=React.useCallback((issue,assigneeId,assigneeType,assigneeName)=>{
        requestAssign(issue,assigneeType,assigneeId,assigneeName,async extra=>{
          await updateIssue(issue.id,{...extra});onChanged&&onChanged();
        });
      },[onChanged]);

      /* 显示/隐藏列：隐藏移除，重新添加按 Multica 行为追加到末尾。 */
      const toggleColumn=key=>setColumns(list=>{
        if(list.some(item=>item.key===key))return list.filter(item=>item.key!==key);
        return [...list,{key,width:key==='title'?360:160}];
      });
      const reorderColumns=(fromKey,toKey)=>{
        setColumns(list=>{
          const from=list.findIndex(item=>item.key===fromKey),to=list.findIndex(item=>item.key===toKey);
          if(from<0||to<0||from===to)return list;
          const next=[...list];const [moved]=next.splice(from,1);
          next.splice(to,0,moved);return next;
        });
      };
      const onSort=(key,dir)=>{setSortBy(key);setDirection(dir);};
      const toggleGroup=key=>setCollapsedGroups(list=>list.includes(key)?list.filter(item=>item!==key):[...list,key]);
      const toggleParent=id=>setCollapsedParents(list=>list.includes(id)?list.filter(item=>item!==id):[...list,id]);
      const handleSelection=(issueId,shiftKey)=>{
        if(shiftKey){
          const range=selectionRange(visibleIssueIds,anchorRef.current,issueId);
          if(range){
            setSelection(list=>{
              const set=new Set(list);
              const remove=range.every(id=>set.has(id));
              for(const id of range){if(remove)set.delete(id);else set.add(id);}
              return Array.from(set);
            });
            return;
          }
        }
        setSelection(list=>list.includes(issueId)?list.filter(id=>id!==issueId):[...list,issueId]);
        anchorRef.current=issueId;
      };
      const toggleSelectAll=()=>{
        setSelection(list=>list.length===visibleIssueIds.length?[]:[...visibleIssueIds]);
      };

      /* ---------- 批量操作（对齐 Multica BatchActionToolbar） ----------
         多选时整条工具栏换态：左「已选择 N 个 ×」，右 状态/优先级/负责人/导出/删除。
         共同值只决定弹层勾选态：全同勾选、mixed 无勾选（commonIssueFields 合同）。 */
      const shared=values=>{
        if(!values.length)return null;
        const first=values[0];
        return values.every(value=>value===first)?first:null;
      };
      const commonStatus=shared(selectedIssues.map(issue=>issue.status));
      const commonPriority=shared(selectedIssues.map(issue=>issue.priority));
      const commonAssigneeId=shared(selectedIssues.map(issue=>issue.assignee_id||null));
      const commonAssigneeName=commonAssigneeId
        ?(selectedIssues.find(issue=>(issue.assignee_id||null)===commonAssigneeId)||{}).assignee_name||null
        :null;
      const [batchBusy,setBatchBusy]=React.useState(false);
      const [batchStatusOpen,setBatchStatusOpen]=React.useState(false);
      const [batchPriorityOpen,setBatchPriorityOpen]=React.useState(false);
      /* 完成 toast 右侧固定「撤回」：Semi Toast 无 action 槽，撤回按钮内嵌在 content 里。
         执行前先快照原值，撤回时逐条写回；撤回成功再用轻提示确认。 */
      const toastWithUndo=(text,onUndo)=>{
        const toastId=Toast.success({
          content:h('span',{className:'eva-task-table__toast'},
            h('span',null,text),
            h('button',{type:'button',className:'eva-task-table__toast-undo',
              onClick:()=>{
                Promise.resolve().then(onUndo)
                  .then(()=>{if(toastId&&Toast.close)Toast.close(toastId);
                    Toast.success('已撤回');onChanged&&onChanged();})
                  .catch(error=>Toast.error(error&&error.message?error.message:'撤回失败'));
              }},'撤回')),
          duration:5});
      };
      const snapshotFields=(ids,fields)=>ids.map(id=>{
        const issue=issues.find(item=>item.id===id);
        const snap={id};
        for(const field of fields)snap[field]=issue?(issue[field]===undefined?null:issue[field]):null;
        return snap;
      });
      const batchApply=async updates=>{
        if(batchBusy||!selection.length)return;
        setBatchBusy(true);
        const ids=[...selection];
        const fields=Object.keys(updates).filter(key=>key!=='suppress_run');
        const before=snapshotFields(ids,fields);
        try{
          await batchUpdateIssues(ids,{...updates,suppress_run:!0});
          toastWithUndo('已更新 '+ids.length+' 个任务',async()=>{
            for(const snap of before){
              const patch={suppress_run:!0};
              for(const field of fields)patch[field]=snap[field];
              await updateIssue(snap.id,patch);
            }
          });
          setSelection([]);onChanged&&onChanged();
        }catch(error){Toast.error(error&&error.message?error.message:'保存失败');}
        finally{setBatchBusy(false);}
      };
      const handleBatchDelete=()=>{
        if(batchBusy||!selection.length)return;
        const ids=[...selection];
        confirmDelete({title:'删除 '+ids.length+' 个任务？',
          content:'此操作无法撤销，所选任务会被永久删除。',
          okText:'删除',cancelText:'取消',
          onOk:async()=>{
            setBatchBusy(true);
            const snapshot=ids.map(id=>{
              const index=issues.findIndex(item=>item.id===id);
              return index>=0?{issue:issues[index],index}:null;
            }).filter(Boolean);
            try{
              await batchDeleteIssues(ids);
              toastWithUndo('已删除 '+ids.length+' 个任务',()=>restoreIssues(snapshot));
              setSelection([]);onChanged&&onChanged();
            }catch(error){Toast.error(error&&error.message?error.message:'删除失败');}
            finally{setBatchBusy(false);}
          }});
      };

      const statusOptions=React.useMemo(()=>ISSUE_STATUS_ORDER.map(value=>({
        value,label:t('loop.status.'+value),
        icon:h(StatusGlyph,{status:value,size:14})
      })),[t]);
      const priorityOptions=React.useMemo(()=>PRIORITY_DISPLAY_ORDER.map(value=>({
        value,label:t('loop.priority.'+value),icon:h(PriorityGlyph,{priority:value,size:14})
      })),[t]);

      const sensors=useSensors(
        useSensor(PointerSensor,{activationConstraint:{distance:4}}),
        useSensor(KeyboardSensor,{coordinateGetter:sortableKeyboardCoordinates})
      );
      const onDragEnd=event=>{
        if(!event.over||event.active.id===event.over.id)return;
        reorderColumns(event.active.id,event.over.id);
      };
      const handleExport=mode=>{
        try{
          const rows=mode==='selected'?selectedIssues:built.rows.filter(item=>item.kind==='issue').map(item=>item.issue);
          if(!rows.length){Toast.warning('没有可导出的任务');return;}
          const headers=columns.map(item=>COLUMN_LABELS[item.key]);
          const csvRows=rows.map(issue=>columns.map(item=>{
            switch(item.key){
              case 'title':return issue.title||'';
              case 'identifier':return issue.identifier||'';
              case 'status':return t('loop.status.'+issue.status)||String(issue.status||'');
              case 'priority':return t('loop.priority.'+issue.priority)||String(issue.priority||'');
              case 'assignee':return issue.assignee_name||'';
              case 'labels':return (issue.labels||[]).map(label=>label.name).join(', ');
              case 'start_date':return issue.start_date||'';
              case 'due_date':return issue.due_date||'';
              case 'created_at':return formatAbsoluteDate(issue.created_at);
              case 'updated_at':return formatAbsoluteDate(issue.updated_at);
              case 'child_progress':{
                const progress=built.progressOf(issue.id);
                return progress?progress.done+'/'+progress.total:'';
              }
              case 'creator':return issue.creator_name||'';
              default:return '';
            }
          }));
          const csv=buildIssueTableCsv(headers,csvRows);
          const prefix=mode==='selected'?'issues-selected':'issues';
          downloadCsv(prefix+'-'+new Date().toISOString().slice(0,10)+'.csv',csv);
          Toast.success('已导出 '+rows.length+' 个任务');
        }catch(error){Toast.error(error?.message||'导出任务失败');}
      };

      const allChecked=visibleIssueIds.length>0&&selection.length===visibleIssueIds.length;
      const someChecked=selection.length>0&&!allChecked;
      const groupLabel=grouping==='none'?'不分组':(GROUP_OPTIONS.find(item=>item.value===grouping)||{}).label||'';

      const renderCell=(row,columnKey)=>{
        const issue=row.issue;
        switch(columnKey){
          case 'title':return h(TitleCell,{row,state:{toggleParent,running},onOpen});
          case 'identifier':return h('span',{className:'eva-task-table__mono'},issue.identifier);
          case 'status':return h('div',{className:'eva-task-table__cell-editor',onClick:event=>event.stopPropagation()},
            h(CellMenu,{ariaLabel:'状态',options:statusOptions,current:issue.status,
              onPick:value=>changeStatus(issue,value),
              trigger:[
                h(StatusGlyph,{key:'glyph',status:issue.status,size:14}),
                h('span',{key:'label',className:'eva-task-table__status-label'},t('loop.status.'+issue.status))
              ]}));
          case 'priority':return h('div',{className:'eva-task-table__cell-editor',onClick:event=>event.stopPropagation()},
            h(CellMenu,{ariaLabel:'优先级',options:priorityOptions,current:issue.priority||'none',
              onPick:value=>applyUpdate(issue,{priority:value}),
              trigger:[
                h(PriorityGlyph,{key:'glyph',priority:issue.priority||'none',size:14}),
                h('span',{key:'label',className:'eva-task-table__priority-label'},t('loop.priority.'+(issue.priority||'none')))
              ]}));
          case 'assignee':return h('div',{className:'eva-task-table__cell-editor',onClick:event=>event.stopPropagation()},
            h(AssigneePicker,{value:issue.assignee_id||null,valueName:issue.assignee_name||null,candidates:assigneeCandidates,
              onChange:(assigneeId,assigneeType,assigneeName)=>changeAssignee(issue,assigneeId,assigneeType,assigneeName)}));
          case 'labels':return h(LabelsCell,{issue,project,onChanged});
          case 'start_date':return h(DateCell,{issue,field:'start_date',label:'开始日期',applyUpdate});
          case 'due_date':return h(DateCell,{issue,field:'due_date',label:'截止日期',applyUpdate});
          case 'created_at':case 'updated_at':
            return h('span',{className:'eva-task-table__timestamp'},formatAbsoluteDate(issue[columnKey])||'—');
          case 'child_progress':{
            const progress=built.progressOf(issue.id);
            if(!progress)return h('span',{className:'eva-task-table__muted'},'空');
            return h('span',{className:'eva-task-table__progress'},
              h('span',{className:'eva-task-table__progress-track','aria-hidden':true},
                h('span',{className:'eva-task-table__progress-fill',style:{width:(progress.total?progress.done/progress.total*100:0)+'%'}})),
              progress.done+'/'+progress.total);
          }
          case 'creator':{
            const person={id:issue.creator_id,name:issue.creator_name,type:issue.creator_type||'member',avatar:issue.creator_avatar};
            return h('span',{className:'eva-task-table__person'},
              h(EvaLoopIdentityAvatar,{person,size:20}),
              h(EvaLoopIdentityName,{person}));
          }
          default:return null;
        }
      };

      /* 多选换态隐藏搜索框，选择期间搜索词不可编辑，天然满足「成员变化即重置选择」。 */
      const searchBox=h('div',{className:'eva-task-table__search'},
        h(icons.Search,{size:16}),
        h('input',{value:search,onChange:event=>setSearch(event.target.value),
          placeholder:'搜索标题或任务编号…','aria-label':'搜索任务'}),
        search?h('button',{type:'button',className:'eva-task-table__search-clear','aria-label':'清除搜索',
          onClick:()=>setSearch('')},h(icons.X,{size:13})):null);
      const [groupOpen,setGroupOpen]=React.useState(false);
      const groupMenu=h(PopMenu,{open:groupOpen,setOpen:setGroupOpen,position:'bottomRight',role:'listbox',trigger:
        h('button',{type:'button',className:'eva-task-table__toolbtn','aria-label':'分组：'+groupLabel,'aria-haspopup':'listbox','aria-expanded':groupOpen,...menuTrigger(setGroupOpen)},
          h(icons.Rows3,{size:14}),h('span',null,grouping==='none'?'分组':'分组：'+groupLabel))},
        GROUP_OPTIONS.map(option=>h(MenuItem,{key:option.value,role:'option',selected:grouping===option.value,
          label:option.label,onClick:()=>{setGrouping(option.value);setGroupOpen(false);}})));
      const hierarchyToggle=h('span',{className:'eva-task-table__toolbtn eva-task-table__hierarchy',role:'button',tabIndex:0,
        'aria-pressed':hierarchy,'aria-label':'层级：将子任务嵌套显示在父任务下方',
        onClick:event=>{if(!event.target.closest('.semi-switch'))setHierarchy(value=>!value);},
        onKeyDown:event=>{if(event.key==='Enter'||event.key===' '){event.preventDefault();setHierarchy(value=>!value);}}},
        h(Switch,{size:'small',checked:hierarchy,onChange:()=>setHierarchy(value=>!value)}),
        h('span',null,'层级'));
      /* 常态工具栏只保留「导出全部」直出按钮；「导出已选择」由批量模式的导出按钮承担。 */
      const exportButton=h('button',{type:'button',className:'eva-task-table__toolbtn','aria-label':'导出全部任务',
        onClick:()=>handleExport('all')},
        h(icons.Download,{size:14}),h('span',null,'导出'));
      const toolbar=selection.length>0
        ?h('div',{className:'eva-task-table__toolbar eva-task-table__toolbar--batch'},
          h('span',{className:'eva-task-table__selected'},
            h('strong',null,'已选择 '+selection.length+' 个'),
            h('button',{type:'button',className:'eva-task-table__selected-clear','aria-label':'清除选择',
              onClick:()=>setSelection([])},h(icons.X,{size:13}))),
          h('span',{className:'eva-task-table__batch-divider','aria-hidden':true}),
          h(PopMenu,{open:batchStatusOpen,setOpen:setBatchStatusOpen,role:'listbox',trigger:
            h('button',{type:'button',className:'eva-task-table__toolbtn',disabled:batchBusy,
              'aria-label':'批量修改状态','aria-haspopup':'listbox','aria-expanded':batchStatusOpen,
              ...menuTrigger(setBatchStatusOpen)},'状态')},
            statusOptions.map(option=>h(MenuItem,{key:option.value,role:'option',selected:commonStatus===option.value,
              icon:option.icon,label:option.label,content:option.content,
              onClick:()=>{setBatchStatusOpen(false);batchApply({status:option.value});}}))),
          h(PopMenu,{open:batchPriorityOpen,setOpen:setBatchPriorityOpen,role:'listbox',trigger:
            h('button',{type:'button',className:'eva-task-table__toolbtn',disabled:batchBusy,
              'aria-label':'批量修改优先级','aria-haspopup':'listbox','aria-expanded':batchPriorityOpen,
              ...menuTrigger(setBatchPriorityOpen)},'优先级')},
            priorityOptions.map(option=>h(MenuItem,{key:option.value,role:'option',selected:commonPriority===option.value,
              icon:option.icon,label:option.label,content:option.content,
              onClick:()=>{setBatchPriorityOpen(false);batchApply({priority:option.value});}}))),
          h(AssigneePicker,{size:'small',value:commonAssigneeId,valueName:commonAssigneeName,candidates:assigneeCandidates,
            onChange:(assigneeId,assigneeType)=>batchApply({assignee_id:assigneeId,assignee_type:assigneeType})}),
          h('button',{type:'button',className:'eva-task-table__toolbtn',disabled:batchBusy,
            'aria-label':'导出已选择的任务',onClick:()=>handleExport('selected')},
            h(icons.Download,{size:14}),h('span',null,'导出')),
          h('button',{type:'button',className:'eva-task-table__toolbtn eva-task-table__toolbtn--danger',disabled:batchBusy,
            onClick:handleBatchDelete},
            h(icons.Trash2,{size:14}),h('span',null,'删除')))
        :h('div',{className:'eva-task-table__toolbar'},searchBox,
          h('span',{className:'eva-task-table__toolbar-spacer'}),
          groupMenu,hierarchyToggle,
          h(ColumnPicker,{state:{columns,toggleColumn}}),
          exportButton);
      const colgroup=h('colgroup',null,
        h('col',{key:'select',style:{width:44}}),
        columns.map(item=>h('col',{key:item.key,style:{width:clampWidth(item.key,item.width)}})),
        /* 末尾占位列不设宽度：固定布局下它是唯一弹性列，吸收全部剩余空间，
           数据列因此互不影响。 */
        h('col',{key:'add'}));
      const headerRow=h('tr',null,
        h('th',{key:'select',className:'eva-task-table__th eva-task-table__th--select'},
          h('span',{className:'eva-task-table__check',onClick:event=>event.stopPropagation()},
            h(Checkbox,{ariaLabel:'选择所有可见任务',checked:allChecked,indeterminate:someChecked,onChange:toggleSelectAll}))),
        columns.map(item=>h(HeaderCell,{key:item.key,columnKey:item.key,label:COLUMN_LABELS[item.key],
          draggable:item.key!=='title',sortable:!!SORTABLE_COLUMNS[item.key],
          active:sortBy===item.key&&!!SORTABLE_COLUMNS[item.key],
          direction,onSort,onHide:item.key==='title'?null:()=>toggleColumn(item.key),
          state:{columns,setColumns,persist}})),
        h('th',{key:'add',className:'eva-task-table__th eva-task-table__th--add'}));
      const bodyRows=built.rows.map(row=>{
        if(row.kind==='group'){
          return h('tr',{key:'group:'+row.key,className:'eva-task-table__group-row',onClick:()=>toggleGroup(row.key)},
            h('td',{colSpan:columns.length+2,className:'eva-task-table__group-cell'},
              h('button',{type:'button',className:'eva-task-table__group-head'},
                h(row.collapsed?icons.ChevronRight:icons.ChevronDown,{size:14}),
                h('span',{className:'eva-task-table__group-label'},row.label),
                h('span',{className:'eva-task-table__group-count'},row.count))));
        }
        const issue=row.issue,isSelected=selectedSet.has(issue.id);
        const cells=columns.map(item=>h('td',{key:item.key,className:'eva-task-table__td'+(item.key==='title'?' is-pinned-title':'')},
          renderCell(row,item.key)));
        return h('tr',{key:row.key,className:'eva-task-table__row'+(isSelected?' is-selected':''),onClick:()=>onOpen&&onOpen(issue.id)},
          h('td',{className:'eva-task-table__td eva-task-table__td--select'},
            h('span',{className:'eva-task-table__check',onClick:event=>event.stopPropagation()},
              h(Checkbox,{ariaLabel:'选择任务 '+(issue.identifier||''),checked:isSelected,
                onChange:event=>handleSelection(issue.id,event&&event.nativeEvent&&event.nativeEvent.shiftKey)}))),
          cells,
          h('td',{key:'add',className:'eva-task-table__td eva-task-table__td--add'}));
      });
      /* min-width = 选择列 + 数据列 + 末尾占位列的下限；列宽之和超过容器时由
         它触发横向滚动，不足时剩余空间全部给末尾弹性占位列。 */
      const totalWidth=44+48+columns.reduce((sum,item)=>sum+clampWidth(item.key,item.width),0);
      const grid=h('table',{className:'eva-task-table__grid',style:{minWidth:totalWidth+'px'}},colgroup,
        h('thead',null,headerRow),
        h('tbody',null,bodyRows));
      const content=built.rows.length===0
        ?h('div',{className:'eva-task-table__empty'},'当前视图没有匹配的任务。')
        :h('div',{className:'eva-task-table__scroll'},grid);
      return h('div',{className:'eva-task-table'},toolbar,
        h(DndContext,{sensors,collisionDetection:closestCenter,modifiers:[restrictToHorizontalAxis],onDragEnd},
          h(SortableContext,{items:columns.map(item=>item.key),strategy:horizontalListSortingStrategy},content),
          runConfirmModal));
    }
    return EvaIssueTable;
  }
})(window);
