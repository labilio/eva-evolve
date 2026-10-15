/* Plane v1.4.2 Gantt interaction reference; Eva owns task data and shared controls.
 * No copied Plane store: layout is derived from the same issues used by sibling views. */
(function(root){
  'use strict';
  let Component;
  root.EvaLoopGanttView={axis,render(props,deps){Component||=create(deps);return deps.React.createElement(Component,{...props,key:props.projectId});}};
  // Plane chart/views: day columns for week, week columns for month, month columns for quarter.
  // These are calendar boundaries, independent of pixel zoom and task data.
  function axis(scale,from,to,today){
    const T=root.EvaTaskTime,day=T.calendarDay,add=T.addCalendarDays;
    const date=value=>new Date(day(value)*86400000);
    const iso=value=>value.toISOString().slice(0,10);
    const monthStart=value=>{const d=date(value);return iso(new Date(Date.UTC(d.getUTCFullYear(),d.getUTCMonth(),1)));};
    const nextMonth=(value,count=1)=>{const d=date(value);return iso(new Date(Date.UTC(d.getUTCFullYear(),d.getUTCMonth()+count,1)));};
    const quarterStart=value=>{const d=date(value);return iso(new Date(Date.UTC(d.getUTCFullYear(),Math.floor(d.getUTCMonth()/3)*3,1)));};
    const weekNumber=value=>{const d=date(add(T.weekStart(value),3)),year=d.getUTCFullYear();return Math.floor((day(iso(d))-day(T.weekStart(`${year}-01-04`)))/7)+1;};
    const cells=(unit)=>{
      let start=unit==='day'?from:unit==='week'?T.weekStart(from):unit==='month'?monthStart(from):quarterStart(from);
      const result=[];
      while(day(start)<day(to)){
        const d=date(start),end=unit==='day'?add(start,1):unit==='week'?add(start,7):nextMonth(start,unit==='quarter'?3:1);
        result.push({start,end,days:day(end)-day(start),weekday:d.getUTCDay(),weekend:unit==='day'&&[0,6].includes(d.getUTCDay()),current:day(today)>=day(start)&&day(today)<day(end),
          label:unit==='day'?String(d.getUTCDate()):unit==='week'?`${d.getUTCDate()}–${date(add(end,-1)).getUTCDate()}`:unit==='month'?`${d.getUTCMonth()+1}月`:`${d.getUTCFullYear()}年${d.getUTCMonth()+1}–${d.getUTCMonth()+3}月`,
          secondary:unit==='week'?`第${weekNumber(start)}周`:unit==='quarter'?`Q${Math.floor(d.getUTCMonth()/3)+1}`:''});
        start=end;
      }
      return result;
    };
    const periods=cells(scale==='week'?'week':scale==='month'?'month':'quarter');
    periods.forEach(cell=>{if(scale!=='quarter'){const d=date(cell.start);cell.label=`${d.getUTCFullYear()}年${d.getUTCMonth()+1}月`;if(scale==='week'){const end=date(add(cell.end,-1));if(end.getUTCMonth()!==d.getUTCMonth())cell.label+=`–${end.getUTCMonth()+1}月`;}}});
    return {periods,columns:cells(scale==='week'?'day':scale==='month'?'week':'month')};
  }
  function create({React,Button,DatePicker,Popover,Toast,Icon,TaskPreview,useI18n,updateIssue,reorderIssue,canEdit,DndContext,SortableContext,useSortable,useSensors,useSensor,PointerSensor,KeyboardSensor,sortableKeyboardCoordinates,closestCenter,restrictToVerticalAxis,verticalListSortingStrategy}){
    const h=React.createElement,T=root.EvaTaskTime,C=root.EvaLoopTaskComponents;
    const rowHeight=44,sidebarWidth=360;
    const weekdays=['周日','周一','周二','周三','周四','周五','周六'];
    const today=()=>T.todayDate();
    function Preview({issue,t,disabled,children}){
      const [visible,setVisible]=React.useState(false);
      return h(Popover,{trigger:'hover',position:'bottomLeft',mouseEnterDelay:100,mouseLeaveDelay:100,visible:visible&&!disabled,
        onVisibleChange:setVisible,'aria-label':'任务预览',content:h(TaskPreview,{issue,t})},
        React.cloneElement(children,{onClick:event=>{setVisible(false);children.props.onClick?.(event);}}));
    }
    function EmptySchedule({issue,origin,scale,dayWidth,left,width,disabled,onSchedule}){
      const [point,setPoint]=React.useState(null);
      const first=Math.ceil(left/dayWidth),last=Math.max(first,Math.floor((left+width-32)/dayWidth));
      const offset=Math.max(first,Math.min(last,point?T.calendarDay(point)-T.calendarDay(origin):first));
      const patch=C.scheduleAt(origin,offset*dayWidth,dayWidth,scale);
      const select=event=>{
        if(disabled||event.pointerType==='touch'||event.target.closest?.('.eva-task-gantt__schedule'))return;
        const rect=event.currentTarget.getBoundingClientRect();
        setPoint(T.addCalendarDays(origin,Math.floor((event.clientX-rect.left)/dayWidth)));
      };
      return h('div',{className:'eva-task-gantt__schedule-area',onPointerMove:select},
        h(Button,{className:'eva-task-gantt__schedule',theme:'borderless',type:'tertiary',size:'small',disabled,
          style:{left:Math.max(left+8,offset*dayWidth)},icon:h(Icon,{name:'plus',size:16}),
          'aria-label':`在 ${patch.start_date} 为 ${issue.identifier} 设置日期`,'aria-keyshortcuts':'ArrowLeft ArrowRight Home',
          onKeyDown:event=>{if(event.isComposing)return;const delta=event.key==='ArrowLeft'?-1:event.key==='ArrowRight'?1:0;
            if(delta||event.key==='Home'){event.preventDefault();event.stopPropagation();setPoint(T.addCalendarDays(origin,event.key==='Home'?first:offset+delta));}},
          onClick:event=>onSchedule(patch,event.detail===0||event.type==='keydown'||event.type==='keyup'||event.currentTarget.matches(':focus-visible'))},
          h('span',{className:'eva-task-gantt__schedule-date','aria-hidden':true},patch.start_date)));
    }
    function SortableRow({issue,index,disabled,children}){
      const {setNodeRef,setActivatorNodeRef,attributes,listeners,transform,transition,isDragging}=useSortable({id:issue.id,disabled});
      const handle=h('button',{...attributes,...listeners,ref:setActivatorNodeRef,type:'button',className:'eva-task-gantt__reorder',disabled,
        'aria-label':'调整 '+issue.identifier+' 的顺序'},h(Icon,{name:'grip-vertical',size:14,'aria-hidden':true}));
      return h('div',{ref:setNodeRef,className:'eva-task-gantt__row'+(isDragging?' is-reordering':''),'data-task-id':issue.id,
        style:{top:index*rowHeight,transform:transform?`translateY(${transform.y}px)`:undefined,transition,zIndex:isDragging?5:undefined}},children(handle));
    }
    function Gantt({issues:visibleIssues,allIssues,onOpen,onChanged,onCreate,projectId,memory,memoryKey}){
      const visibleIds=new Set(visibleIssues.map(issue=>issue.id));
      const issues=C.timelineOrdered(allIssues||visibleIssues).filter(issue=>visibleIds.has(issue.id));
      const {t}=useI18n();
      const contextKey=React.useRef(memoryKey),initial=React.useRef(memory?.get(memoryKey)),ready=React.useRef(false),measureRef=React.useRef(null);
      const [scale,setScale]=React.useState(()=>['week','month','quarter'].includes(initial.current?.scale)?initial.current.scale:'week');
      const [origin,setOrigin]=React.useState(()=>T.addCalendarDays(T.weekStart(initial.current?.date||today()),-91));
      const [dayCount,setDayCount]=React.useState(546);
      const [scroll,setScroll]=React.useState({left:0,top:0,width:1000,height:600});
      const [drag,setDrag]=React.useState(null),[busy,setBusy]=React.useState(null);
      const [full,setFull]=React.useState(false),[sortDrag,setSortDrag]=React.useState(null),focusedTask=React.useRef(null);
      const sensors=useSensors(useSensor(PointerSensor,{activationConstraint:{distance:5}}),useSensor(KeyboardSensor,{coordinateGetter:sortableKeyboardCoordinates}));
      const scroller=React.useRef(null),section=React.useRef(null),active=React.useRef(null),saving=React.useRef(false),mounted=React.useRef(true),skipClick=React.useRef(null),pendingFocus=React.useRef(null),pendingPrepend=React.useRef(null),pendingNavigation=React.useRef(null);
      const dayWidth={week:60,month:20,quarter:5}[scale],originDay=T.calendarDay(origin);
      const writable=canEdit(projectId);
      React.useEffect(()=>{mounted.current=true;return()=>{mounted.current=false;active.current=null;};},[]);
      React.useLayoutEffect(()=>{const target=pendingFocus.current?section.current?.querySelector(`[data-task-id="${CSS.escape(pendingFocus.current)}"] .eva-task-gantt__bar-title`):null;if(target){pendingFocus.current=null;if(document.activeElement===document.body)target.focus({preventScroll:true});}},[issues]);
      const measure=()=>{
        const el=scroller.current;if(!el)return;
        setScroll({left:el.scrollLeft,top:el.scrollTop,width:el.clientWidth,height:el.clientHeight});
        if(ready.current&&memory){
          const days=el.scrollLeft/dayWidth,index=Math.min(issues.length-1,Math.floor(el.scrollTop/rowHeight));
          memory.set(contextKey.current,{scale,date:T.addCalendarDays(origin,Math.floor(days)),fraction:days-Math.floor(days),
            taskId:issues[index]?.id,index:Math.max(0,index),rowOffset:el.scrollTop-Math.max(0,index)*rowHeight});
        }
      };
      measureRef.current=measure;
      React.useLayoutEffect(()=>{const el=scroller.current;if(!el)return;const resize=new ResizeObserver(()=>measureRef.current());resize.observe(el);measure();return()=>resize.disconnect();},[]);
      // Plane extends in both directions. Commit the origin and canvas together,
      // then compensate before paint so the same calendar day stays under the pointer.
      React.useLayoutEffect(()=>{
        const pending=pendingPrepend.current,el=scroller.current;
        if(!pending||!el||pending.origin!==origin)return;
        pendingPrepend.current=null;
        el.scrollLeft=pending.left+pending.width;
        if(active.current)active.current.scrollLeft+=pending.width;
        measure();
      },[origin]);
      React.useLayoutEffect(()=>{
        const pending=pendingNavigation.current,el=scroller.current;
        if(!pending||!el||pending.origin!==origin||pending.scale!==scale)return;
        pendingNavigation.current=null;
        el.scrollLeft=Math.max(0,(pending.day-originDay)*dayWidth-pending.anchor);
        measure();
      },[origin,scale,dayCount]);
      const handleScroll=()=>{
        const el=scroller.current;if(!el)return;
        measure();
        if(pendingPrepend.current||pendingNavigation.current)return;
        if(active.current)refreshDrag();
        const extension=Math.max(182,Math.ceil(el.clientWidth/dayWidth)*2);
        if(el.scrollLeft<el.clientWidth){
          const next=T.addCalendarDays(origin,-extension);
          pendingPrepend.current={origin:next,left:el.scrollLeft,width:extension*dayWidth};
          setOrigin(next);setDayCount(count=>count+extension);
        }else if(el.scrollLeft+el.clientWidth>sidebarWidth+dayCount*dayWidth-el.clientWidth){
          setDayCount(count=>count+extension);
        }
      };
      const goTo=(date,taskWidth=null)=>{
        const day=T.calendarDay(date);if(day===null)return;
        const available=(scroller.current?.clientWidth||scroll.width)-sidebarWidth;
        const anchor=Math.max(0,taskWidth===null?available/2-dayWidth:Math.min(available/2-dayWidth,(available-taskWidth)/2));
        if(day<originDay||day>originDay+dayCount-14){
          const next=T.addCalendarDays(T.weekStart(date),-91);
          pendingNavigation.current={origin:next,scale,day,anchor};
          setOrigin(next);setDayCount(546);
        }else if(scroller.current){scroller.current.scrollLeft=Math.max(0,(day-originDay)*dayWidth-anchor);measure();}
      };
      const changeScale=value=>{
        if(value===scale||active.current)return;
        const el=scroller.current,anchor=(el.clientWidth-sidebarWidth)/2;
        pendingNavigation.current={origin,scale:value,day:originDay+(el.scrollLeft+anchor)/dayWidth,anchor};
        setScale(value);
      };
      React.useLayoutEffect(()=>{
        const saved=initial.current,el=scroller.current;
        if(saved&&el){
          el.scrollLeft=Math.max(0,(T.calendarDay(saved.date)-originDay+(saved.fraction||0))*dayWidth);
          const found=issues.findIndex(issue=>issue.id===saved.taskId),index=found>=0?found:Math.min(saved.index||0,Math.max(0,issues.length-1));
          el.scrollTop=index*rowHeight+(saved.rowOffset||0);
        }else goTo(today());
        ready.current=true;measure();
        return()=>{ready.current=false;};
      },[]);
      const commit=async(issue,patch)=>{
        if(!patch||saving.current||!canEdit(projectId)){pendingFocus.current=null;setDrag(null);return;}
        saving.current=true;setBusy(issue.id);
        try{await updateIssue(issue.id,patch);if(mounted.current)onChanged();}
        catch(reason){if(mounted.current){const message=reason?.message||'日期更新失败，请重试';Toast.error(message);}}
        finally{saving.current=false;if(mounted.current){setBusy(null);setDrag(null);}}
      };
      const finishSort=async({active:source,over})=>{
        setSortDrag(null);
        if(!over||source.id===over.id||saving.current||!canEdit(projectId))return;
        const from=issues.findIndex(issue=>issue.id===source.id),to=issues.findIndex(issue=>issue.id===over.id);
        if(from<0||to<0)return;
        saving.current=true;setBusy(source.id);
        try{await reorderIssue(source.id,over.id,from<to);if(mounted.current)onChanged();}
        catch(error){if(mounted.current)Toast.error(error?.message||'调整顺序失败，请重试');}
        finally{saving.current=false;if(mounted.current)setBusy(null);}
      };
      const pointerStart=(event,issue,edge)=>{
        if(event.button!==0||!writable||saving.current||(edge==='move'&&(!issue.start_date||!issue.due_date)))return;
        event.currentTarget.focus({preventScroll:true});
        event.preventDefault();event.stopPropagation();
        event.currentTarget.setPointerCapture(event.pointerId);
        active.current={issue:{...issue},edge,x:event.clientX,y:event.clientY,currentX:event.clientX,currentY:event.clientY,dayWidth,scrollLeft:scroller.current.scrollLeft,pointerId:event.pointerId,days:0,moved:false,speedX:0,speedY:0};
      };
      const refreshDrag=()=>{
        const state=active.current;if(!state)return;
        if(!canEdit(projectId)){cancel();return;}
        const delta=state.currentX-state.x+scroller.current.scrollLeft-state.scrollLeft;
        if(Math.abs(delta)>3||Math.abs(state.currentY-state.y)>3)state.moved=true;
        state.days=Math.round(delta/state.dayWidth);
        if(state.moved)setDrag({id:state.issue.id,patch:C.scheduleChange(state.issue,state.edge,state.days,state.dayWidth)});
      };
      const pointerMove=event=>{
        const state=active.current;if(!state)return;
        const dx=event.clientX-state.currentX,dy=event.clientY-state.currentY;
        state.currentX=event.clientX;state.currentY=event.clientY;
        const el=scroller.current,rect=el.getBoundingClientRect();
        const speed=(point,start,length,direction)=>{
          const offset=point-start;
          if(offset<length*.15&&direction<=0)return offset<length*.05?-6:-3;
          if(offset>length*.85&&direction>=0)return offset>length*.95?6:3;
          return 0;
        };
        state.speedX=speed(event.clientX,rect.left+sidebarWidth,el.clientWidth-sidebarWidth,dx);
        state.speedY=speed(event.clientY,rect.top+48,el.clientHeight-48,dy);
        refreshDrag();
      };
      const cancel=()=>{
        const state=active.current;
        if(state?.moved&&state.edge==='move')skipClick.current={id:state.issue.id,until:Date.now()+500};
        active.current=null;setDrag(null);
      };
      React.useEffect(()=>{
        if(!drag)return;
        let frame,previous;
        const tick=time=>{
          const state=active.current,el=scroller.current;
          if(!state||!el)return;
          if(!canEdit(projectId)){cancel();return;}
          const factor=previous===undefined?1:Math.min(2,(time-previous)/16);previous=time;
          if(state.moved&&(state.speedX||state.speedY))el.scrollBy(state.speedX*factor,state.speedY*factor);
          frame=requestAnimationFrame(tick);
        };
        frame=requestAnimationFrame(tick);
        return()=>cancelAnimationFrame(frame);
      },[!!drag]);
      const pointerEnd=event=>{
        const state=active.current;if(!state)return;
        active.current=null;event.currentTarget.releasePointerCapture?.(event.pointerId);
        skipClick.current=state.moved&&state.edge==='move'?{id:state.issue.id,until:Date.now()+500}:null;
        const current=issues.find(issue=>issue.id===state.issue.id);
        if(!current||current.start_date!==state.issue.start_date||current.due_date!==state.issue.due_date){
          setDrag(null);Toast.error('任务日期已更新，请重新调整');return;
        }
        if(state.moved&&state.days)commit(state.issue,C.scheduleChange(state.issue,state.edge,state.days,state.dayWidth));else setDrag(null);
      };
      const dragEvents={onPointerMove:pointerMove,onPointerUp:pointerEnd,onPointerCancel:cancel,onLostPointerCapture:()=>{if(active.current)cancel();}};
      const button=(label,props={})=>h(Button,{theme:'borderless',type:'tertiary',size:'small',...props},label);
      const first=Math.max(0,Math.floor((scroll.top-48)/rowHeight)-8),last=Math.min(issues.length,first+Math.ceil(scroll.height/rowHeight)+20);
      const firstDay=Math.max(0,Math.floor((Math.floor(scroll.left/dayWidth)-8)/7)*7),lastDay=Math.min(dayCount,Math.ceil((scroll.left+scroll.width-sidebarWidth)/dayWidth)+8);
      const chart=axis(scale,T.addCalendarDays(origin,firstDay),T.addCalendarDays(origin,lastDay),today());
      const geometry=cell=>({left:(T.calendarDay(cell.start)-originDay)*dayWidth,width:cell.days*dayWidth});
      const days=chart.columns.map(cell=>h('div',{key:cell.start,className:'eva-task-gantt__day'+(cell.weekend?' is-weekend':'')+(cell.current?' is-today':''),
        'data-unit':scale==='week'?'day':scale==='month'?'week':'month','data-weekday':scale==='week'?cell.weekday:undefined,style:geometry(cell)},
        scale==='week'?h('small',null,weekdays[cell.weekday]):null,h('span',{className:cell.current?'is-current':''},cell.label),scale==='month'?h('small',null,cell.secondary):null));
      const groups=chart.periods.map(cell=>h('div',{key:cell.start,className:'eva-task-gantt__period',style:geometry(cell)},
        h('span',{className:'eva-task-gantt__period-label'},cell.label,cell.current&&scale!=='week'?h('small',{className:'eva-task-gantt__current-label'},'当前'):null),
        cell.secondary?h('small',{className:'eva-task-gantt__period-number'},cell.secondary):null));
      const columns=chart.columns.map(cell=>h('div',{key:cell.start,className:'eva-task-gantt__column'+(cell.weekend?' is-weekend':'')+(cell.current?' is-today':''),style:geometry(cell)}));
      const rowIndexes=new Set(Array.from({length:last-first},(_,index)=>first+index));
      const dragIndex=drag||sortDrag?issues.findIndex(issue=>issue.id===(drag?.id||sortDrag)):-1;
      if(dragIndex>=0)rowIndexes.add(dragIndex);
      const focusIndex=focusedTask.current?issues.findIndex(issue=>issue.id===focusedTask.current):-1;
      if(focusIndex>=0)rowIndexes.add(focusIndex);
      const rows=[...rowIndexes].sort((a,b)=>a-b).map(index=>{
        const issue=issues[index];
        const shown=drag?.id===issue.id&&drag.patch?{...issue,...drag.patch}:issue,position=C.schedulePosition(shown,origin,dayWidth);
        // Anchor the preview to the real, visible title button. The bar and resize
        // handles retain their full date geometry outside the viewport.
        const handleWidth=writable?6:0;
        const titleLeft=position?Math.min(position.width-handleWidth,Math.max(handleWidth,scroll.left-position.left)):0;
        const titleRight=position?Math.max(titleLeft,Math.min(position.width-handleWidth,scroll.left+scroll.width-sidebarWidth-position.left)):0;
        const titleWidth=Math.max(0,titleRight-titleLeft);
        const label=`${issue.identifier} ${issue.title}`;
        const open=()=>{const skipped=skipClick.current;skipClick.current=null;if(skipped?.id===issue.id&&Date.now()<skipped.until)return;onOpen(issue.id);};
        const edit=h('div',{className:'eva-task-gantt__dates'},
          h('strong',null,label),
          h('div',null,h('span',null,'开始日期'),C.dateField(React,DatePicker,{label:'开始日期',value:issue.start_date||undefined,disabled:!writable||busy===issue.id,onChange:value=>commit(issue,{start_date:value||null})})),
          h('div',null,h('span',null,'截止日期'),C.dateField(React,DatePicker,{label:'截止日期',value:issue.due_date||undefined,disabled:!writable||busy===issue.id,onChange:value=>commit(issue,{due_date:value||null})})));
        const timeline=h('div',{className:'eva-task-gantt__track',style:{width:dayCount*dayWidth}},position?
          h('div',{className:'eva-task-gantt__bar'+(Math.min(position.left+position.width,scroll.left+scroll.width-sidebarWidth)-Math.max(position.left,scroll.left)<72?' is-compact':'')+(!issue.start_date?' is-missing-start':'')+(!issue.due_date?' is-missing-due':''),style:{left:position.left,width:position.width,'--gantt-status':C.statusColors[issue.status]},'aria-busy':busy===issue.id},
            writable?h('button',{type:'button',className:'eva-task-gantt__resize is-left',tabIndex:-1,'aria-label':'调整开始日期',disabled:!!busy,onPointerDown:e=>pointerStart(e,issue,'left'),...dragEvents}):null,
            h(Preview,{issue:shown,t,disabled:!!drag||!!busy},h('button',{type:'button',className:'eva-task-gantt__bar-title',style:{left:titleLeft,width:titleWidth,paddingInline:Math.min(8,titleWidth/2)},'aria-label':label+'，'+(shown.start_date||'未设置开始日期')+' 至 '+(shown.due_date||'未设置截止日期'),onClick:open,onPointerDown:e=>pointerStart(e,issue,'move'),...dragEvents},h('span',{className:'eva-task-gantt__bar-text'},issue.title))),
            writable?h('button',{type:'button',className:'eva-task-gantt__resize is-right',tabIndex:-1,'aria-label':'调整截止日期',disabled:!!busy,onPointerDown:e=>pointerStart(e,issue,'right'),...dragEvents}):null):
          h(EmptySchedule,{issue,origin,scale,dayWidth,left:scroll.left,width:scroll.width-sidebarWidth,disabled:!writable||!!busy,onSchedule:(patch,keyboard)=>{if(keyboard)pendingFocus.current=issue.id;commit(issue,patch);}}));
        const offLeft=position&&position.left+position.width<scroll.left;
        const offRight=position&&position.left>scroll.left+scroll.width-sidebarWidth;
        const locate=(offLeft||offRight)?button(null,{className:'eva-task-gantt__locate','aria-label':'定位 '+issue.identifier,
          style:{left:sidebarWidth+scroll.left+(offLeft?8:scroll.width-sidebarWidth-40)},
          icon:h(Icon,{name:offLeft?'arrow-left':'chevron-right',size:16}),onClick:()=>goTo(issue.start_date||issue.due_date,position.width)}):null;
        return h(SortableRow,{key:issue.id,issue,index,disabled:!writable||!!busy||!!drag},handle=>h(React.Fragment,null,
          h('div',{className:'eva-task-gantt__sidebar'},writable?handle:null,
            button(h(React.Fragment,null,h('span',{className:'eva-task-gantt__identifier'},issue.identifier),h('span',{className:'eva-task-gantt__name'},issue.title)),{className:'eva-task-gantt__task',onClick:()=>onOpen(issue.id),'aria-label':label,'data-eva-tooltip':issue.title,'data-eva-tooltip-clamp':'.eva-task-gantt__name'}),
            h(Popover,{trigger:'click',position:'bottomRight',content:edit,'aria-label':'任务日期'},button(position?.duration?`${position.duration} 天`:'未设置',{className:'eva-task-gantt__duration','aria-label':'编辑 '+issue.identifier+' 的日期'}))),timeline,locate));
      });
      return h(DndContext,{sensors,collisionDetection:closestCenter,modifiers:[restrictToVerticalAxis],onDragStart:event=>setSortDrag(event.active.id),onDragEnd:finishSort,onDragCancel:()=>setSortDrag(null),
        accessibility:{screenReaderInstructions:{draggable:'按空格开始调整任务顺序，使用上下方向键移动，再按空格确认，按 Escape 取消。'},announcements:{
          onDragStart:({active})=>'开始调整 '+(issues.find(issue=>issue.id===active.id)?.identifier||'任务')+' 的顺序',
          onDragOver:({over})=>over?'移动到第 '+(issues.findIndex(issue=>issue.id===over.id)+1)+' 行':undefined,
          onDragEnd:({over})=>over?'已结束排序操作':'已取消排序',onDragCancel:()=>'已取消排序'}}},
        h(SortableContext,{items:issues.map(issue=>issue.id),strategy:verticalListSortingStrategy},h('section',{ref:section,className:'eva-task-gantt'+(full?' is-fullscreen':''),'aria-label':'甘特图',onFocusCapture:event=>{if(section.current?.contains(event.target))focusedTask.current=event.target.closest('[data-task-id]')?.dataset.taskId||null;},onKeyDownCapture:event=>{if(active.current&&event.key==='Escape'&&!event.isComposing&&!event.defaultPrevented){event.preventDefault();event.stopPropagation();cancel();}},onKeyDown:event=>{if(event.key==='Escape'&&!event.isComposing&&!event.defaultPrevented){if(active.current){event.preventDefault();event.stopPropagation();cancel();}else if(full){event.preventDefault();event.stopPropagation();setFull(false);}}}},
        h('div',{className:'eva-task-gantt__toolbar'},h('span',{className:'eva-task-gantt__count'},`${issues.length} 个任务`),h('div',{role:'group','aria-label':'时间范围'},['week','month','quarter'].map((value,index)=>button(['周','月','季度'][index],{key:value,'aria-pressed':scale===value,onClick:()=>changeScale(value)}))),button('今天',{onClick:()=>goTo(today())}),button(null,{'aria-label':full?'退出全屏':'全屏',icon:h(Icon,{name:full?'minimize-2':'maximize-2',size:16}),onClick:()=>setFull(!full)})),
        h('div',{ref:scroller,className:'eva-task-gantt__scroll',onScroll:handleScroll},
          h('div',{className:'eva-task-gantt__canvas',style:{width:sidebarWidth+dayCount*dayWidth,minHeight:Math.max(scroll.height,48+issues.length*rowHeight+44)}},
            h('div',{className:'eva-task-gantt__header'},h('div',{className:'eva-task-gantt__sidebar'},h('span',null,'任务'),h('span',null,'持续时间')),h('div',{className:'eva-task-gantt__axis',style:{width:dayCount*dayWidth}},groups,h('div',{className:'eva-task-gantt__days'},days))),
            h('div',{className:'eva-task-gantt__body',style:{height:issues.length*rowHeight}},h('div',{className:'eva-task-gantt__grid',style:{left:sidebarWidth,width:dayCount*dayWidth}},columns),rows),
            writable?button('新建任务',{className:'eva-task-gantt__create',icon:h(Icon,{name:'plus',size:14}),onClick:onCreate}):null,
            !issues.length?h('p',{className:'eva-task-gantt__empty'},'暂无任务'):null)))));
    }
    return Gantt;
  }
})(window);
