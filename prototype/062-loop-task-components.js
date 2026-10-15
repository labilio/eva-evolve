/* 项目任务专用公共组件。视图只传业务值与尺寸；图形和颜色在这里维护。 */
(function(root){
  'use strict';
  const statusColors=Object.freeze({
    backlog:'#8a8f99',todo:'#6b7280',in_progress:'var(--semi-color-warning, #f5a623)',
    in_review:'#7f3bf5',done:'#16803d',blocked:'var(--semi-color-danger, #f5222d)',cancelled:'#b8bcc8'
  });
  const priorityColors=Object.freeze({
    urgent:'var(--semi-color-danger, #f5222d)',high:'#fc8800',medium:'#f5a623',low:'#6b93ff',none:'#c9cdd4'
  });
  const priorityDisplayOrder=Object.freeze(['none','urgent','high','medium','low']);

  // Plane v1.4.2 scheduling semantics: inclusive end day, 60px half blocks,
  // and completing a half block only when its missing edge is resized.
  // Derived geometry only: task records and writes remain owned by Loop.
  function scheduleAt(origin,pixels,dayWidth,scale){
    if(!Number.isFinite(pixels)||!Number.isFinite(dayWidth)||dayWidth<=0||!['week','month','quarter'].includes(scale))return null;
    const start=root.EvaTaskTime.addCalendarDays(origin,Math.floor(pixels/dayWidth));
    const due=root.EvaTaskTime.addCalendarDays(start,scale==='quarter'?7:1);
    return start&&due?{start_date:start,due_date:due}:null;
  }
  function schedulePosition(issue,origin,dayWidth){
    const time=root.EvaTaskTime;
    const first=time.calendarDay(issue.start_date),last=time.calendarDay(issue.due_date),base=time.calendarDay(origin);
    if(base===null||!Number.isFinite(dayWidth)||dayWidth<=0||(first===null&&last===null))return null;
    if(first!==null&&last!==null&&last<first)return null;
    const duration=time.calendarDuration(issue.start_date,issue.due_date);
    return {
      left:first!==null?(first-base)*dayWidth:(last-base+1)*dayWidth-60,
      width:duration===null?60:duration*dayWidth,
      duration
    };
  }
  function scheduleChange(issue,edge,days,dayWidth){
    const time=root.EvaTaskTime;
    if(!['left','right','move'].includes(edge)||!Number.isSafeInteger(days)||!Number.isFinite(dayWidth)||dayWidth<=0)return null;
    const first=time.calendarDay(issue.start_date),last=time.calendarDay(issue.due_date);
    if((first===null&&last===null)||(first!==null&&last!==null&&last<first))return null;
    const result={};
    if(edge==='move'){
      if(first!==null)result.start_date=time.addCalendarDays(issue.start_date,days);
      if(last!==null)result.due_date=time.addCalendarDays(issue.due_date,days);
    }else if(edge==='left'){
      if(last===null)result.start_date=time.addCalendarDays(issue.start_date,days);
      else{
        const offset=first===null?Math.round(1-60/dayWidth):first-last;
        result.start_date=time.addCalendarDays(issue.due_date,Math.min(0,offset+days));
        result.due_date=issue.due_date;
      }
    }else{
      if(first===null)result.due_date=time.addCalendarDays(issue.due_date,days);
      else{
        const offset=last===null?Math.round(60/dayWidth)-1:last-first;
        result.start_date=issue.start_date;
        result.due_date=time.addCalendarDays(issue.start_date,Math.max(0,offset+days));
      }
    }
    return Object.values(result).some(value=>value===null)?null:result;
  }

  // Timeline order is independent of status-column position. Legacy tasks use
  // their stable source order until the first reorder writes explicit ranks.
  function timelineOrdered(issues){
    return issues.map((issue,index)=>({issue,index,rank:Number.isFinite(issue.sort_order)?issue.sort_order:index*1000}))
      .sort((a,b)=>a.rank-b.rank||a.index-b.index).map(row=>row.issue);
  }
  function timelineMovePlan(issues,issueId,targetId,after=false){
    const ordered=timelineOrdered(issues),moving=ordered.find(issue=>issue.id===issueId);
    if(!moving||issueId===targetId)return null;
    const next=ordered.filter(issue=>issue.id!==issueId),index=next.findIndex(issue=>issue.id===targetId);
    if(index<0)return null;
    next.splice(index+(after?1:0),0,moving);
    return next.every((issue,i)=>issue.id===ordered[i].id)?null:next;
  }

  function boardOrdered(issues,status){
    return issues.map((issue,index)=>({issue,index})).filter(row=>row.issue.status===status)
      .sort((a,b)=>{
        const left=Number.isFinite(a.issue.position)?a.issue.position:Number.MAX_SAFE_INTEGER;
        const right=Number.isFinite(b.issue.position)?b.issue.position:Number.MAX_SAFE_INTEGER;
        return left-right||a.index-b.index;
      }).map(row=>row.issue);
  }
  function boardMovePlan(issues,issueId,status,targetId=null,after=false){
    const moving=issues.find(issue=>issue.id===issueId);
    if(!moving||targetId===issueId||!issues.some(issue=>issue.id===issueId))return null;
    const source=boardOrdered(issues,moving.status).filter(issue=>issue.id!==issueId);
    const destination=moving.status===status?source:boardOrdered(issues,status);
    const index=targetId?destination.findIndex(issue=>issue.id===targetId):-1;
    if(targetId&&index<0)return null;
    destination.splice(index<0?destination.length:index+(after?1:0),0,moving);
    const before=boardOrdered(issues,moving.status);
    if(moving.status===status&&before.every((issue,i)=>issue.id===destination[i].id))return null;
    return {[moving.status]:source,[status]:destination};
  }
  function boardPageCount(total,requested,pageSize=30){
    return Math.min(total,Math.max(pageSize,requested));
  }
  function boardWindow(heights,scrollTop,viewportHeight,overscan=5){
    const total=heights.reduce((sum,height)=>sum+height,0);
    let start=0,top=0;
    while(start<heights.length&&top+heights[start]<scrollTop){top+=heights[start++];}
    let end=start,visibleHeight=0;
    while(end<heights.length&&top+visibleHeight<scrollTop+viewportHeight){visibleHeight+=heights[end++];}
    const first=Math.max(0,start-overscan),last=Math.min(heights.length,end+overscan);
    const before=heights.slice(0,first).reduce((sum,height)=>sum+height,0);
    const shown=heights.slice(first,last).reduce((sum,height)=>sum+height,0);
    return {start:first,end:last,top:before,visibleHeight:shown,bottom:total-before-shown};
  }

  function datePicker(React,DatePicker,props){
    const {dropdownClassName='',...rest}=props;
    return React.createElement(DatePicker,{
      type:'date',format:'yyyy-MM-dd',density:'compact',autoSwitchDate:false,...rest,weekStartsOn:1,
      dropdownClassName:['eva-loop-task-date-panel',dropdownClassName].filter(Boolean).join(' ')
    });
  }

  function labelChip(React,label,{className='',suffix=null}={}){
    return React.createElement('span',{
      className:['loop-label-chip','eva-task-label-chip',className].filter(Boolean).join(' ')
    },label?.name||'',suffix);
  }
  function labelChips(React,labels,max){
    if(!labels?.length)return null;
    const shown=max?labels.slice(0,max):labels,rest=labels.length-shown.length;
    return React.createElement('span',{className:'loop-label-chips eva-task-label-chips'},
      ...shown.map(label=>React.createElement(React.Fragment,{key:label.id},labelChip(React,label))),
      rest>0?React.createElement('span',{className:'loop-label-chip eva-task-label-chip eva-task-label-chip--overflow'},'+'+rest):null);
  }
  // Width is presentation state owned by this mounted row, never task data.
  function fitLabelCount(widths,available,gap,moreWidth){
    let used=0,fit=0;
    for(let i=0;i<widths.length;i++){
      used+=widths[i]+(i?gap:0);
      const rest=widths.length-i-1;
      if(used+(rest?gap+moreWidth(rest):0)<=available)fit=i+1;
    }
    return fit;
  }
  const fittingLabelsCache=new WeakMap();
  function fittingLabelChips(React,labels){
    let Component=fittingLabelsCache.get(React);
    if(!Component){
      Component=function FittingTaskLabels({labels}){
        const h=React.createElement,host=React.useRef(null),probe=React.useRef(null);
        const [count,setCount]=React.useState(0),[clipped,setClipped]=React.useState([]),[showMore,setShowMore]=React.useState(false);
        const signature=JSON.stringify(labels.map(label=>[label.id,label.name]));
        React.useLayoutEffect(()=>{
          const element=host.current,measurement=probe.current;
          if(!element||!measurement)return;
          let active=true;
          const measure=()=>{
            if(!active)return;
            const nodes=Array.from(measurement.children),total=labels.length;
            const widths=nodes.slice(0,total).map(node=>node.getBoundingClientRect().width);
            const gap=parseFloat(getComputedStyle(element).columnGap)||0;
            const moreWidth=n=>nodes[total+n-1].getBoundingClientRect().width;
            element.parentElement.style.setProperty('--eva-label-reserved-width',(Math.ceil(moreWidth(total))+16)+'px');
            const available=Math.max(0,element.clientWidth-16);
            const fit=fitLabelCount(widths,available,gap,moreWidth);
            // If the first label is longer than the row, keep it readable up to
            // the remaining boundary; the count and assignee never shrink.
            const firstSpace=Math.max(0,available-(total>1?gap+moreWidth(total-1):0));
            const minimum=nodes[total*2].getBoundingClientRect().width;
            const next=fit|| (firstSpace>=minimum?1:0);
            setShowMore(next<total&&available>=moreWidth(total-next));
            setCount(previous=>previous===next?previous:next);
            const truncated=widths.map((width,i)=>i===0&&next===1&&width>firstSpace+1);
            setClipped(previous=>JSON.stringify(previous)===JSON.stringify(truncated)?previous:truncated);
          };
          measure();
          const observer=new ResizeObserver(measure);
          observer.observe(element);observer.observe(measurement);
          document.fonts?.ready.then(measure);
          return()=>{active=false;observer.disconnect();element.parentElement?.style.removeProperty('--eva-label-reserved-width');};
        },[signature]);
        const shown=labels.slice(0,count),hidden=labels.slice(count);
        const chipClass='loop-label-chip eva-task-label-chip';
        return h('span',{className:'eva-task-label-fit',ref:host},
          h('span',{className:'eva-task-label-fit__measure',ref:probe,'aria-hidden':true},
            ...labels.map(label=>h('span',{key:label.id,className:chipClass},label.name)),
            ...labels.map((_,i)=>h('span',{key:'more-'+i,className:chipClass+' eva-task-label-chip--overflow'},'+'+(i+1))),
            h('span',{className:chipClass},(labels[0]?.name?.[0]||'')+'…')),
          ...shown.map((label,i)=>clipped[i]
            ?h(root.EvaTooltipComponent,{key:label.id,content:label.name},h('span',{className:chipClass,tabIndex:0},label.name))
            :h('span',{key:label.id,className:chipClass},label.name)),
          hidden.length&&showMore?h(root.EvaTooltipComponent,{content:hidden.map(label=>label.name).join('、')},
            h('span',{className:chipClass+' eva-task-label-chip--overflow',tabIndex:0,
              'aria-label':'另有 '+hidden.length+' 个标签：'+hidden.map(label=>label.name).join('、')},'+'+hidden.length)):null);

      };
      fittingLabelsCache.set(React,Component);
    }
    return labels?.length?React.createElement(Component,{labels}):null;
  }
  function labelCreateOption(React,Plus,name){
    return React.createElement('span',{className:'eva-task-label-create-option'},
      React.createElement(Plus,{size:14,'aria-hidden':true}),
      React.createElement('span',null,'新建'),
      labelChip(React,{name:name.trim()}));
  }
  const enumDropdownCache=new WeakMap();
  function enumMenu(React,Dropdown,{options,value,onChange}){
    return React.createElement(Dropdown.Menu,{className:'eva-task-enum-menu',style:{minWidth:160}},
      options.map(option=>React.createElement(Dropdown.Item,{
        key:option.value,className:'eva-task-enum-option',active:option.value===value,
        icon:option.icon,onClick:()=>{if(option.value!==value)onChange(option.value);}
      },option.label)));
  }
  function enumDropdown(React,Dropdown,props){
    let Field=enumDropdownCache.get(Dropdown);
    if(!Field){
      Field=function TaskEnumDropdown({ariaLabel,options,value,onChange,trigger,triggerClassName='',position='bottomLeft',getPopupContainer,disabled=false}){
        const [open,setOpen]=React.useState(false);
        return React.createElement(Dropdown,{
          trigger:'click',position,getPopupContainer,clickToHide:true,showTick:false,onVisibleChange:setOpen,
          render:enumMenu(React,Dropdown,{options,value,onChange})
        },React.createElement('button',{type:'button',className:triggerClassName,
          'aria-label':ariaLabel,'aria-haspopup':'menu','aria-expanded':open,disabled},trigger));
      };
      enumDropdownCache.set(Dropdown,Field);
    }
    return React.createElement(Field,props);
  }
  function formatDate(value){
    return root.EvaTaskTime?.compactDate(value)||'';
  }
  function dateTrigger(React,{label='截止日期',value,icon,open=false,overdue=false,className='',textClassName='',iconClassName=''}){
    return React.createElement('button',{type:'button',
      className:['eva-task-date-trigger',className,overdue?'is-overdue':''].filter(Boolean).join(' '),
      'aria-label':label,'aria-haspopup':'dialog','aria-expanded':open,'data-eva-tooltip':value?label+' '+root.EvaTaskTime.fullDate(value):undefined},
      icon?React.createElement(icon,{size:14,className:['eva-task-date-trigger__icon',iconClassName].filter(Boolean).join(' '),'aria-hidden':true}):null,
      React.createElement('span',{className:['eva-task-date-trigger__text',textClassName,value?'':'is-empty',overdue?'is-overdue':''].filter(Boolean).join(' ')},value?formatDate(value):label));
  }
  const dateFieldCache=new WeakMap();
  function dateField(React,DatePicker,props){
    let Field=dateFieldCache.get(DatePicker);
    if(!Field){
      Field=function TaskDateField({value,label='截止日期',onChange,icon,overdue=false,className='',triggerClassName='',textClassName='',iconClassName='',triggerRender,topSlot,...pickerProps}){
        const [open,setOpen]=React.useState(false);
        React.useEffect(()=>{
          if(!open)return;
          const dismiss=event=>{if(event.key==='Escape'&&!event.isComposing){event.preventDefault();event.stopPropagation();setOpen(false);}};
          document.addEventListener('keydown',dismiss,true);
          return()=>document.removeEventListener('keydown',dismiss,true);
        },[open]);
        const commit=next=>{setOpen(false);onChange(next);};
        return datePicker(React,DatePicker,{
          ...pickerProps,className:['eva-task-date-field',className].filter(Boolean).join(' '),
          value,open,onOpenChange:setOpen,showClear:pickerProps.showClear??false,placeholder:label,'aria-label':label,
          onChange:(_,next)=>commit(next||null),
          topSlot:topSlot!==undefined?topSlot:React.createElement('button',{type:'button',className:'eva-task-date-clear',onClick:()=>commit(null)},'无'+label),
          triggerRender:triggerRender||(()=>dateTrigger(React,{label,value,icon,open,overdue,className:triggerClassName,textClassName,iconClassName}))
        });
      };
      dateFieldCache.set(DatePicker,Field);
    }
    return React.createElement(Field,props);
  }

  function create(React,{CircleDashed,Circle,CircleCheck,CircleSlash}){
    const h=React.createElement;
    const visualProps=(props,color)=>({
      ...props,style:{...props.style,color},'aria-hidden':props['aria-label']?undefined:true,
      focusable:false
    });
    function pie(progress){
      const angle=2*Math.PI*progress,x=7+3.5*Math.sin(angle),y=7-3.5*Math.cos(angle);
      return 'M7,7 L7,3.5 A3.5,3.5 0 '+(progress>0.5?1:0)+',1 '+x+','+y+' Z';
    }
    function StatusIcon({status='todo',size=14,...props}){
      const value=statusColors[status]?status:'todo';
      const visual=visualProps(props,statusColors[value]);
      if(value==='backlog')return h(CircleDashed,{...visual,size,strokeWidth:1.5});
      if(value==='todo')return h(Circle,{...visual,size,strokeWidth:1.5});
      if(value==='done')return h(CircleCheck,{...visual,size,strokeWidth:2.25});
      const parts=[h('circle',{key:'ring',cx:7,cy:7,r:6,fill:'none',stroke:'currentColor',strokeWidth:1.5})];
      if(value==='in_progress'||value==='in_review')parts.push(h('path',{key:'progress',d:pie(value==='in_progress'?0.5:0.75),fill:'currentColor'}));
      else if(value==='blocked')parts.push(h('line',{key:'blocked',x1:4.525,y1:4.525,x2:9.475,y2:9.475,stroke:'currentColor',strokeWidth:1.5,strokeLinecap:'round'}));
      else parts.push(h('path',{key:'cancelled',d:'M5 5 L9 9 M9 5 L5 9',fill:'none',stroke:'currentColor',strokeWidth:1.5,strokeLinecap:'round'}));
      return h('svg',{...visual,width:size,height:size,viewBox:'0 0 14 14',fill:'none',className:['eva-task-status-glyph',props.className].filter(Boolean).join(' ')},parts);
    }
    function PriorityIcon({priority='none',size=14,...props}){
      const value=priorityColors[priority]?priority:'none';
      const visual={...visualProps(props,priorityColors[value]),width:size,height:size,viewBox:'0 0 16 16',className:['eva-task-priority-glyph',props.className].filter(Boolean).join(' ')};
      if(value==='none')return h('svg',{...visual,fill:'none',stroke:'currentColor',strokeWidth:1.5,strokeLinecap:'round'},h('line',{x1:3,y1:8,x2:13,y2:8}));
      if(value==='urgent')return h('svg',{...visual,fill:'none'},
        h('rect',{x:2,y:2,width:12,height:12,rx:3,fill:'currentColor'}),
        h('line',{x1:8,y1:5,x2:8,y2:8.6,stroke:'var(--semi-color-bg-0,#fff)',strokeWidth:1.7,strokeLinecap:'round'}),
        h('circle',{cx:8,cy:11,r:0.95,fill:'var(--semi-color-bg-0,#fff)'}));
      const filled={low:1,medium:2,high:3}[value];
      return h('svg',{...visual,fill:'currentColor'},[6,9,12].map((height,i)=>h('rect',{key:i,x:2+i*4.25,y:14-height,width:3.5,height,rx:1,opacity:i<filled?1:0.35})));
    }
    function IdentityOption({icon,label,unassigned=false}){
      return h('span',{className:'eva-task-identity-option'+(unassigned?' eva-task-unassigned-option':'')},
        h('span',{className:'eva-task-identity-option__visual'},icon),
        h('span',{className:'eva-task-identity-option__label'},label));
    }
    function UnassignedOption({label}){
      return h(IdentityOption,{unassigned:true,icon:h(CircleSlash,{size:20,'aria-hidden':true}),label});
    }
    function TaskPreview({issue,t}){
      return h('div',{className:'eva-task-preview'},
        h('div',{className:'eva-task-preview__identifier'},issue.identifier),
        h('strong',{className:'eva-task-preview__title'},issue.title),
        h('div',{className:'eva-task-preview__properties'},
          h('span',null,h(StatusIcon,{status:issue.status}),t('loop.status.'+issue.status)),
          h('span',null,h(PriorityIcon,{priority:issue.priority||'none'}),t('loop.priority.'+(issue.priority||'none')))),
        h('dl',{className:'eva-task-preview__dates'},
          h('dt',null,'开始日期'),h('dd',null,issue.start_date||'未设置'),
          h('dt',null,'截止日期'),h('dd',null,issue.due_date||'未设置')));
    }
    return {StatusIcon,PriorityIcon,IdentityOption,UnassignedOption,TaskPreview};
  }

  root.EvaLoopTaskComponents=Object.freeze({statusColors,priorityColors,priorityDisplayOrder,scheduleAt,schedulePosition,scheduleChange,timelineOrdered,timelineMovePlan,boardOrdered,boardMovePlan,boardPageCount,boardWindow,datePicker,dateField,enumMenu,enumDropdown,labelChip,labelChips,fitLabelCount,fittingLabelChips,labelCreateOption,formatDate,dateTrigger,create});
})(window);
