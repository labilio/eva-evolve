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

  function datePicker(React,DatePicker,props){
    const {dropdownClassName='',...rest}=props;
    return React.createElement(DatePicker,{
      type:'date',format:'yyyy-MM-dd',density:'compact',autoSwitchDate:false,...rest,
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
  function labelCreateOption(React,Plus,name){
    return React.createElement('span',{className:'eva-task-label-create-option'},
      React.createElement(Plus,{size:14,'aria-hidden':true}),
      React.createElement('span',null,'新建'),
      labelChip(React,{name:name.trim()}));
  }
  // Select 的自定义行适配公共菜单皮肤，保留 listbox/option 语义和原生事件。
  // Dropdown.Item 固定输出 menuitem 且使用 mousedown，不能直接嵌入 Select。
  function selectOption(React,Check,option){
    const {className,style,disabled,focused,selected,onClick,onMouseEnter,label,icon,content}=option;
    return React.createElement('div',{
      className:[className,'semi-dropdown-item','eva-task-select-option',selected?'semi-dropdown-item-active':''].filter(Boolean).join(' '),
      style,onClick,onMouseEnter,role:'option','aria-selected':!!selected,'aria-disabled':!!disabled,
      'data-focused':focused?'true':undefined
    },icon?React.createElement('span',{className:'semi-dropdown-item-icon'},icon):null,
    content||label,selected?React.createElement(Check,{size:14,className:'eva-task-select-option__check','aria-hidden':true}):null);
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

  function create(React,{CircleDashed,Circle,CircleCheck}){
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
    return {StatusIcon,PriorityIcon};
  }

  root.EvaLoopTaskComponents=Object.freeze({statusColors,priorityColors,priorityDisplayOrder,selectOption,datePicker,dateField,enumMenu,enumDropdown,labelChip,labelChips,labelCreateOption,formatDate,dateTrigger,create});
})(window);
