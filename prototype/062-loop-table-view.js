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
      React,useI18n,Popover,Checkbox,Switch,Toast,Input,
      AssigneePicker,LabelChips,RunningChip,useRunConfirm,
      EvaLoopIdentityAvatar,EvaLoopIdentityName,
      updateIssue,batchUpdateIssues,restoreIssues,batchDeleteIssues,confirmDelete,evaIssueChildrenOf,evaIssueDescendantIds,
      evaCurrentTaskProject,evaTaskProjectId,evaTaskLabels,evaAttachTaskLabel,evaDetachTaskLabel,evaCreateTaskLabel,
      ISSUE_STATUS_ORDER,ISSUE_STATUS_HEX,
      PRIORITY_ORDER,PRIORITY_HEX,
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
      const {open,setOpen,position='bottomLeft',role='menu',trigger,children}=props;
      React.useEffect(()=>{
        if(!open)return;
        const onKey=event=>{if(event.key==='Escape')setOpen(false);};
        document.addEventListener('keydown',onKey);
        return()=>document.removeEventListener('keydown',onKey);
      },[open,setOpen]);
      return h(Popover,{trigger:'custom',visible:open,position,onClickOutSide:()=>setOpen(false),motion:false,
        content:h('div',{className:'eva-task-table__menu',role,
          onKeyDown:event=>{if(event.key==='Escape')setOpen(false);}},children)},trigger);
    }
    function MenuItem(props){
      const {role='menuitem',selected,disabled,icon,label,onClick}=props;
      const extra=role==='option'?{'aria-selected':!!selected}:{'aria-current':selected?'true':undefined};
      return h('button',{type:'button',role,disabled,...extra,
        className:'eva-task-table__menu-item'+(selected?' is-selected':''),
        onMouseDown:event=>event.preventDefault(),onClick},
        h('span',{className:'eva-task-table__menu-check'},selected?h(icons.Check,{size:13}):null),
        icon||null,h('span',{className:'eva-task-table__menu-label'},label));
    }

    /* ---------- Multica 表格列模型 ---------- */
    const COLUMN_LABELS={
      title:'任务',identifier:'编号',status:'状态',priority:'优先级',assignee:'负责人',
      labels:'标签',project:'项目',start_date:'开始日期',due_date:'截止日期',
      created_at:'创建时间',updated_at:'更新时间',child_progress:'子任务进度',creator:'创建者'
    };
    const SYSTEM_COLUMNS=Object.keys(COLUMN_LABELS);
    const DEFAULT_COLUMNS=[
      {key:'title',width:360},{key:'status',width:150},{key:'priority',width:130},
      {key:'assignee',width:180},{key:'due_date',width:140},{key:'labels',width:220}
    ];
    /* 与 Multica SORTABLE_COLUMNS 一致：title 可经菜单排序，但不可拖拽重排。 */
    const SORTABLE_COLUMNS={title:'title',status:'status',priority:'priority',start_date:'start_date',due_date:'due_date',created_at:'created_at',updated_at:'updated_at'};
    const GROUP_OPTIONS=[
      {value:'none',label:'不分组'},{value:'status',label:'状态'},
      {value:'assignee',label:'负责人'},{value:'project',label:'项目'}
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

    /* ---------- 单元格矢量标记（一比一移植 Multica status-icon / priority-icon 几何） ----------
       viewBox 14×14 / 16×16，颜色沿用 Eva 唯一色源 ISSUE_STATUS_HEX / PRIORITY_HEX。 */
    function piePath(cx,cy,r,progress){
      const angle=2*Math.PI*progress;
      const x=cx+r*Math.sin(angle),y=cy-r*Math.cos(angle);
      return 'M'+cx+','+cy+' L'+cx+','+(cy-r)+' A'+r+','+r+' 0 '+(progress>0.5?1:0)+',1 '+x+','+y+' Z';
    }
    function StatusGlyph({status,size=14}){
      const color=ISSUE_STATUS_HEX[status];
      const parts=[h('circle',{key:'ring',cx:7,cy:7,r:6,fill:'none',stroke:'currentColor',strokeWidth:1.5,strokeDasharray:'3.14 0',strokeDashoffset:-0.7})];
      if(status==='in_progress')parts.push(h('path',{key:'fill',d:piePath(7,7,3.5,0.5),fill:'currentColor'}));
      else if(status==='in_review')parts.push(h('path',{key:'fill',d:piePath(7,7,3.5,0.75),fill:'currentColor'}));
      else if(status==='done')parts.push(
        h('circle',{key:'fill',cx:7,cy:7,r:6,fill:'currentColor'}),
        h('path',{key:'check',d:'M10.951 4.24896C11.283 4.58091 11.283 5.11909 10.951 5.45104L5.95104 10.451C5.61909 10.783 5.0809 10.783 4.74896 10.451L2.74896 8.45104C2.41701 8.11909 2.41701 7.5809 2.74896 7.24896C3.0809 6.91701 3.61909 6.91701 3.95104 7.24896L5.35 8.64792L9.74896 4.24896C10.0809 3.91701 10.6191 3.91701 10.951 4.24896Z',fill:'var(--semi-color-bg-0,#fff)',stroke:'none'}));
      else if(status==='blocked')parts.push(h('line',{key:'fill',
        x1:7+3.5*Math.cos(Math.PI*0.75),y1:7-3.5*Math.sin(Math.PI*0.75),
        x2:7+3.5*Math.cos(-Math.PI*0.25),y2:7-3.5*Math.sin(-Math.PI*0.25),
        stroke:'currentColor',strokeWidth:1.5,strokeLinecap:'round'}));
      else if(status==='cancelled')parts.push(h('path',{key:'fill',d:'M5 5 L9 9 M9 5 L5 9',fill:'none',stroke:'currentColor',strokeWidth:1.5,strokeLinecap:'round'}));
      return h('svg',{viewBox:'0 0 14 14',width:size,height:size,'aria-hidden':true,focusable:false,
        className:'eva-task-table__glyph',style:{color}},parts);
    }
    function PriorityGlyph({priority,size=14}){
      const color=PRIORITY_HEX[priority];
      if(!priority||priority==='none')
        return h('svg',{viewBox:'0 0 16 16',width:size,height:size,'aria-hidden':true,focusable:false,
          className:'eva-task-table__glyph',style:{color},fill:'none',stroke:'currentColor',strokeWidth:1.5,strokeLinecap:'round'},
          h('line',{x1:3,y1:8,x2:13,y2:8}));
      if(priority==='urgent')
        return h('svg',{viewBox:'0 0 16 16',width:size,height:size,'aria-hidden':true,focusable:false,
          className:'eva-task-table__glyph',style:{color},fill:'none'},
          h('rect',{x:2,y:2,width:12,height:12,rx:3,fill:'currentColor'}),
          h('line',{x1:8,y1:5,x2:8,y2:8.6,stroke:'var(--semi-color-bg-0,#fff)',strokeWidth:1.7,strokeLinecap:'round'}),
          h('circle',{cx:8,cy:11,r:0.95,fill:'var(--semi-color-bg-0,#fff)'}));
      const filled={low:1,medium:2,high:3}[priority]||0;
      return h('svg',{viewBox:'0 0 16 16',width:size,height:size,'aria-hidden':true,focusable:false,
        className:'eva-task-table__glyph',style:{color},fill:'currentColor'},
        [6,9,12].map((height,i)=>h('rect',{key:i,x:2+i*4.25,y:14-height,width:3.5,height,rx:1,opacity:i<filled?1:0.35})));
    }
    /* Multica PRIORITY_DISPLAY_ORDER：菜单里空值（无优先级）置顶，与排序权重分开。 */
    const PRIORITY_DISPLAY_ORDER=['none','urgent','high','medium','low'];

    /* ---------- 枚举单元格：幽灵触发器 + 049 菜单（对齐 Multica PropertyPicker） ---------- */
    function CellMenu({ariaLabel,options,current,trigger,onPick}){
      const [open,setOpen]=React.useState(false);
      return h(PopMenu,{open,setOpen,role:'listbox',trigger:
        h('button',{type:'button',className:'eva-task-table__cell-trigger','aria-label':ariaLabel,
          'aria-haspopup':'listbox','aria-expanded':open,...menuTrigger(setOpen)},trigger)},
        options.map(option=>h(MenuItem,{key:option.value,role:'option',selected:current===option.value,
          icon:option.icon,label:option.label,
          onClick:()=>{setOpen(false);if(option.value!==current)onPick(option.value);}})));
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
      const {issues,allIssues,grouping,hierarchy,sortBy,direction,search,collapsedGroups,collapsedParents,projectName,t}=options;
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
      }else if(grouping==='project'){
        if(visible.length)groups.push({key:'project:current',label:projectName||'项目',rows:visible});
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
        const startX=event.clientX,startWidth=clampWidth(columnKey,state.columns.find(item=>item.key===columnKey)?.width);
        const onMove=moveEvent=>{
          state.setColumns(list=>list.map(item=>item.key===columnKey?{...item,width:clampWidth(columnKey,startWidth+moveEvent.clientX-startX)}:item));
        };
        const onUp=()=>{window.removeEventListener('pointermove',onMove);window.removeEventListener('pointerup',onUp);state.persist();};
        window.addEventListener('pointermove',onMove);window.addEventListener('pointerup',onUp);
      };
      return h('th',{ref:node=>{host.current=node;setNodeRef(node);},
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
              h(MenuItem,{key:'asc',selected:active&&direction==='asc',icon:h(icons.ArrowUp,{size:13}),
                label:'升序',onClick:()=>{onSort(columnKey,'asc');setHeaderOpen(false);}}),
              h(MenuItem,{key:'desc',selected:active&&direction==='desc',icon:h(icons.ArrowDown,{size:13}),
                label:'降序',onClick:()=>{onSort(columnKey,'desc');setHeaderOpen(false);}})
            ]:null,
            sortable&&onHide?h('div',{key:'sep',className:'eva-task-table__menu-sep'}):null,
            onHide?h(MenuItem,{key:'hide',icon:h(icons.EyeOff,{size:13}),label:'隐藏列',
              onClick:()=>{onHide();setHeaderOpen(false);}}):null),
          h('span',{className:'eva-task-table__resizer',onPointerDown:startResize,role:'separator','aria-orientation':'vertical','aria-label':'调整 '+label+' 列宽'})));
    }

    /* ---------- 列选择器（工具栏与表头共用） ---------- */
    function ColumnPicker(props){
      const {state,iconOnly}=props;
      const [open,setOpen]=React.useState(false);
      const [query,setQuery]=React.useState('');
      const needle=query.trim().toLowerCase();
      const list=SYSTEM_COLUMNS.filter(key=>!needle||COLUMN_LABELS[key].toLowerCase().includes(needle));
      return h(PopMenu,{open,setOpen,position:'bottomRight',role:'listbox','aria-label':'配置列',trigger:
        h('button',{type:'button',className:'eva-task-table__toolbtn','aria-label':'配置列','aria-haspopup':'listbox','aria-expanded':open,title:'列',...menuTrigger(setOpen)},
          h(icons.Columns3,{size:14}),iconOnly?null:h('span',null,'列'))},
        h(Input,{value:query,onChange:setQuery,placeholder:'搜索列…','aria-label':'搜索列',
          prefix:h(icons.Search,{size:16}),showClear:true}),
        h('div',{className:'eva-task-table__menu-title'},'任务属性'),
        h('div',{className:'eva-task-table__menu-list',role:'presentation'},
          list.length?list.map(key=>h(MenuItem,{key,role:'option',selected:state.columns.some(item=>item.key===key),
            disabled:key==='title',label:COLUMN_LABELS[key],onClick:()=>state.toggleColumn(key)}))
          :h('div',{className:'eva-task-table__menu-empty'},'没有匹配的列')));
    }

    /* ---------- 标签单元格：展示 + 编辑（对齐 Multica LabelPicker） ---------- */
    function LabelsCell({issue,project,onChanged}){
      const [open,setOpen]=React.useState(false);
      const [labels,setLabels]=React.useState(()=>evaTaskLabels(project));
      const [creating,setCreating]=React.useState('');
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
          const label=evaCreateTaskLabel(project,name);
          setLabels(evaTaskLabels(project));setCreating('');
          if(!attached.some(item=>item.id===label.id))await toggle(label.id);
        }catch(error){Toast.error(error?.message||'标签创建失败');}
      };
      return h('div',{className:'eva-task-table__cell-editor',onClick:event=>event.stopPropagation()},
        h(PopMenu,{open,setOpen,position:'bottomLeft',role:'listbox',trigger:
          attached.length?h('span',{className:'eva-task-table__cell-trigger',role:'button',tabIndex:0,title:'编辑标签','aria-haspopup':'listbox','aria-expanded':open,...menuTrigger(setOpen)},h(LabelChips,{labels:attached,max:2}))
            :h('button',{type:'button',className:'eva-task-table__cell-trigger','aria-label':'添加标签','aria-haspopup':'listbox','aria-expanded':open,...menuTrigger(setOpen)},
              h('span',{className:'eva-task-table__cell-label is-empty'},'空'))},
          h('div',{className:'eva-task-table__menu-list'},
            labels.length?labels.map(label=>h(MenuItem,{key:label.id,role:'option',
              selected:attached.some(item=>item.id===label.id),
              icon:h('span',{className:'eva-task-table__label-dot',style:{background:label.color||'#64748b'}}),
              label:label.name,onClick:()=>toggle(label.id)}))
            :h('div',{className:'eva-task-table__menu-empty'},'暂无任务标签')),
          h('div',{className:'eva-task-table__label-create'},
            h(Input,{value:creating,onChange:setCreating,placeholder:'新建标签',maxLength:20,'aria-label':'新建标签',
              className:'eva-task-table__create-input',onKeyDown:event=>{if(event.key==='Enter')create();}}),
            h('button',{type:'button',className:'eva-task-table__toolbtn',onClick:create,disabled:!creating.trim()},'新建'))));
    }

    /* ---------- 标题单元格：层级缩进、子任务折叠、重命名、新建子任务 ---------- */
    function TitleCell({row,state,onOpen,onCreateSubIssue}){
      const {issue,depth,hasChildren,collapsed}=row;
      const [draft,setDraft]=React.useState(issue.title);
      const editing=state.editing===issue.id;
      React.useEffect(()=>{if(!editing)setDraft(issue.title);},[issue.title,editing]);
      const commit=()=>{
        state.setEditing(null);
        const title=draft.trim();
        if(title&&title!==issue.title)state.applyUpdate(issue,{title});
        else setDraft(issue.title);
      };
      return h('div',{className:'eva-task-table__title',style:{paddingLeft:depth*18},
        onClickCapture:event=>{if(state.editing)event.stopPropagation();}},
        hasChildren?h('button',{type:'button','aria-label':'展开或折叠子任务',className:'eva-task-table__toggle',
          onClick:event=>{event.stopPropagation();state.toggleParent(issue.id);}},
          h(collapsed?icons.ChevronRight:icons.ChevronDown,{size:14})):h('span',{className:'eva-task-table__toggle-spacer'}),
        h('span',{className:'eva-task-table__title-id'},issue.identifier),
        state.running&&state.running.has&&state.running.has(issue.id)?h(RunningChip,null):null,
        editing?h('input',{autoFocus:true,value:draft,className:'eva-task-table__rename',
          'aria-label':'重命名任务',
          onChange:event=>setDraft(event.target.value),
          onBlur:commit,
          onKeyDown:event=>{
            if(event.key==='Enter')commit();
            if(event.key==='Escape'){setDraft(issue.title);state.setEditing(null);}
            event.stopPropagation();
          }}):
        h(React.Fragment,null,
          h('button',{type:'button',className:'eva-task-table__title-btn',title:issue.title,
            onClick:event=>{event.stopPropagation();onOpen&&onOpen(issue.id);}},issue.title),
          h('span',{className:'eva-task-table__title-actions'},
            h('button',{type:'button','aria-label':'新建子任务',title:'新建子任务',
              onClick:event=>{event.stopPropagation();onCreateSubIssue&&onCreateSubIssue(issue);}},h(icons.Plus,{size:13})),
            h('button',{type:'button','aria-label':'重命名任务',title:'重命名任务',
              onClick:event=>{event.stopPropagation();setDraft(issue.title);state.setEditing(issue.id);}},h(icons.Pencil,{size:13})))));
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
    /** 本地化短格式（month:'short', day:'numeric'，无年份）：zh 下为「9月2日」。 */
    function formatDateOnly(value){
      const utc=dateOnlyToUTC(value);
      if(utc==null)return '';
      return new Intl.DateTimeFormat(undefined,{month:'short',day:'numeric',timeZone:'UTC'}).format(new Date(utc));
    }
    /** 单月网格日历（一比一移植 Multica Calendar 的月份视图几何与交互）。 */
    function MonthCalendar({value,onSelect}){
      const selected=parseDateParts(value),today=parseDateParts(todayDateOnly());
      const anchor=React.useMemo(()=>{
        if(selected)return {year:selected[0],month:selected[1]};
        const now=new Date();
        return {year:now.getFullYear(),month:now.getMonth()+1};
      },[value]);
      const [cursor,setCursor]=React.useState(anchor);
      React.useEffect(()=>{setCursor(anchor);},[anchor.year,anchor.month]);
      const monthLabel=new Intl.DateTimeFormat(undefined,{year:'numeric',month:'long',timeZone:'UTC'})
        .format(new Date(Date.UTC(cursor.year,cursor.month-1,1)));
      const daysInMonth=new Date(Date.UTC(cursor.year,cursor.month,0)).getUTCDate();
      const leading=new Date(Date.UTC(cursor.year,cursor.month-1,1)).getUTCDay();
      const inMonth=(day)=>cursor.year===today[0]&&cursor.month===today[1]&&day===today[2];
      const isSelected=(day)=>!!selected&&cursor.year===selected[0]&&cursor.month===selected[1]&&day===selected[2];
      const shift=step=>setCursor(current=>{
        const month=current.month-1+step;
        return {year:current.year+Math.floor(month/12),month:month-((month%12)+12)%12+1};
      });
      const cells=[];
      for(let i=0;i<leading;i++)cells.push(h('span',{key:'lead-'+i,className:'eva-task-table__cal-blank'}));
      for(let day=1;day<=daysInMonth;day++)cells.push(h('button',{key:'day-'+day,type:'button',
        className:'eva-task-table__cal-day'+(isSelected(day)?' is-selected':'')+(inMonth(day)?' is-today':''),
        'aria-label':cursor.year+'-'+String(cursor.month).padStart(2,'0')+'-'+String(day).padStart(2,'0'),
        'aria-pressed':isSelected(day)?'true':'false',
        onClick:()=>onSelect(cursor.year+'-'+String(cursor.month).padStart(2,'0')+'-'+String(day).padStart(2,'0'))},String(day)));
      return h('div',{className:'eva-task-table__cal'},
        h('div',{className:'eva-task-table__cal-nav'},
          h('button',{type:'button',className:'eva-task-table__cal-navbtn','aria-label':'上个月',
            onClick:()=>shift(-1)},h(icons.ChevronLeft,{size:14})),
          h('span',{className:'eva-task-table__cal-month'},monthLabel),
          h('button',{type:'button',className:'eva-task-table__cal-navbtn','aria-label':'下个月',
            onClick:()=>shift(1)},h(icons.ChevronRight,{size:14}))),
        h('div',{className:'eva-task-table__cal-weekdays'},['日','一','二','三','四','五','六']
          .map((name,index)=>h('span',{key:index,className:'eva-task-table__cal-weekday'},name))),
        h('div',{className:'eva-task-table__cal-grid',role:'grid'},cells));
    }

    /* ---------- 日期单元格（开始/截止）：一比一移植 Multica DateOnlyPicker ----------
       幽灵触发器「图标 + 短格式日期 / 占位文案」，截止日期早于今天标红（纯日期比较，不看状态）。
       弹层结构照搬：顶部「无日期」空值行（可选中、空态显示勾）+ 单月网格日历，选日即写回并关闭。
       日历日按 'YYYY-MM-DD' 传输，解析/格式化固定 UTC，查看者时区不会让日期漂移。 */
    function DateCell({issue,field,label,applyUpdate}){
      const value=issue[field]?String(issue[field]).slice(0,10):undefined;
      const [open,setOpen]=React.useState(false);
      React.useEffect(()=>{if(!open)return;
        const onKey=event=>{if(event.key==='Escape')setOpen(false);};
        window.addEventListener('keydown',onKey);
        return ()=>window.removeEventListener('keydown',onKey);
      },[open]);
      const overdue=field==='due_date'&&isPastDateOnly(value);
      const commit=next=>{setOpen(false);
        if(next!==(issue[field]||null))applyUpdate(issue,{[field]:next});};
      return h('div',{className:'eva-task-table__cell-editor',onClick:event=>event.stopPropagation()},
        h(PopMenu,{open,setOpen,position:'bottomLeft',role:'dialog',trigger:
          h('button',{type:'button',className:'eva-task-table__cell-trigger',
            'aria-label':label,'aria-haspopup':'dialog','aria-expanded':open,...menuTrigger(setOpen)},
            h(field==='start_date'?icons.CalendarClock:icons.CalendarDays,{size:14,className:'eva-task-table__glyph'}),
            value?h('span',{className:'eva-task-table__cell-label'+(overdue?' is-overdue':'')},formatDateOnly(value))
              :h('span',{className:'eva-task-table__cell-label is-empty'},label))},
          h('button',{type:'button',className:'eva-task-table__date-clear',
            onClick:()=>commit(null)},
            h('span',{className:'eva-task-table__date-clear-label'},'无'+label),
            h(icons.Check,{size:14,className:'eva-task-table__date-clear-check',style:{visibility:value?'hidden':'visible'}})),
          h(MonthCalendar,{value,onSelect:commit})));
    }

    /* ---------- 主组件 ---------- */
    function EvaIssueTable(props){
      const {issues,allIssues,onOpen,onChanged,running,viewKey,projectId,onCreateSubIssue}=props;
      const {t}=useI18n();
      const {requestStatus,requestAssign,runConfirmModal}=useRunConfirm();
      const saved=React.useMemo(()=>loadState(viewKey),[]);
      const [columns,setColumns]=React.useState(()=>normalizeColumns(saved&&saved.columns));
      const [grouping,setGrouping]=React.useState((saved&&saved.grouping)||'none');
      /* Multica tableHierarchy 默认 true（显示菜单里的层级开关）；持久化里的显式选择优先。 */
      const [hierarchy,setHierarchy]=React.useState(saved?!!saved.hierarchy:true);
      const [collapsedGroups,setCollapsedGroups]=React.useState((saved&&saved.collapsedGroups)||[]);
      const [collapsedParents,setCollapsedParents]=React.useState((saved&&saved.collapsedParents)||[]);
      const [sortBy,setSortBy]=React.useState((saved&&saved.sortBy)||'created_at');
      const [direction,setDirection]=React.useState((saved&&saved.direction)||'desc');
      const [search,setSearch]=React.useState('');
      const [selection,setSelection]=React.useState([]);
      const [editing,setEditing]=React.useState(null);
      const anchorRef=React.useRef(null);
      const project=React.useMemo(()=>evaCurrentTaskProject(),[]);
      const projectName=(project&&project.title)||'';
      React.useEffect(()=>{setSelection([]);setCollapsedParents([]);setCollapsedGroups([]);},[projectId]);
      React.useEffect(()=>{if(selection.length===0)anchorRef.current=null;},[selection.length]);
      const persist=React.useCallback(()=>{
        saveState(viewKey,{columns,grouping,hierarchy,collapsedGroups,collapsedParents,sortBy,direction});
      },[viewKey,columns,grouping,hierarchy,collapsedGroups,collapsedParents,sortBy,direction]);
      React.useEffect(()=>{persist();},[persist]);

      const built=React.useMemo(()=>buildRows({
        issues,allIssues,grouping,hierarchy,sortBy,direction,search,
        collapsedGroups,collapsedParents,projectName,t
      }),[issues,allIssues,grouping,hierarchy,sortBy,direction,search,collapsedGroups,collapsedParents,projectName]);
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
        value,label:t('loop.priority.'+value),
        icon:h(PriorityGlyph,{priority:value,size:14})
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
              case 'project':return projectName;
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
          case 'title':return h(TitleCell,{row,state:{editing,setEditing,applyUpdate,toggleParent,running},onOpen,onCreateSubIssue});
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
            h(AssigneePicker,{value:issue.assignee_id||null,valueName:issue.assignee_name||null,
              onChange:(assigneeId,assigneeType,assigneeName)=>changeAssignee(issue,assigneeId,assigneeType,assigneeName)}));
          case 'labels':return h(LabelsCell,{issue,project,onChanged});
          case 'project':return h('span',{className:'eva-task-table__plain',title:projectName},projectName);
          case 'start_date':return h(DateCell,{issue,field:'start_date',label:'开始日期',applyUpdate});
          case 'due_date':return h(DateCell,{issue,field:'due_date',label:'截止日期',applyUpdate});
          case 'created_at':case 'updated_at':
            return h('span',{className:'eva-task-table__mono'},formatAbsoluteDate(issue[columnKey])||'—');
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
              icon:option.icon,label:option.label,
              onClick:()=>{setBatchStatusOpen(false);batchApply({status:option.value});}}))),
          h(PopMenu,{open:batchPriorityOpen,setOpen:setBatchPriorityOpen,role:'listbox',trigger:
            h('button',{type:'button',className:'eva-task-table__toolbtn',disabled:batchBusy,
              'aria-label':'批量修改优先级','aria-haspopup':'listbox','aria-expanded':batchPriorityOpen,
              ...menuTrigger(setBatchPriorityOpen)},'优先级')},
            priorityOptions.map(option=>h(MenuItem,{key:option.value,role:'option',selected:commonPriority===option.value,
              icon:option.icon,label:option.label,
              onClick:()=>{setBatchPriorityOpen(false);batchApply({priority:option.value});}}))),
          h(AssigneePicker,{size:'small',value:commonAssigneeId,valueName:commonAssigneeName,
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
        h('col',{key:'add',style:{width:48}}));
      const headerRow=h('tr',null,
        h('th',{key:'select',className:'eva-task-table__th eva-task-table__th--select'},
          h('span',{className:'eva-task-table__check',onClick:event=>event.stopPropagation()},
            h(Checkbox,{ariaLabel:'选择所有可见任务',checked:allChecked,indeterminate:someChecked,onChange:toggleSelectAll}))),
        columns.map(item=>h(HeaderCell,{key:item.key,columnKey:item.key,label:COLUMN_LABELS[item.key],
          draggable:item.key!=='title',sortable:!!SORTABLE_COLUMNS[item.key],
          active:sortBy===item.key&&!!SORTABLE_COLUMNS[item.key],
          direction,onSort,onHide:item.key==='title'?null:()=>toggleColumn(item.key),
          state:{columns,setColumns,persist}})),
        h('th',{key:'add',className:'eva-task-table__th eva-task-table__th--add'},
          h(ColumnPicker,{state:{columns,toggleColumn},iconOnly:true})));
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
      const grid=h('table',{className:'eva-task-table__grid'},colgroup,
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
