import React from 'react';
import {Dialog} from './063-dialog.jsx';
import {Input} from './063-forms-entry.jsx';
import {Button} from './063-file-controls.jsx';
import {EvaLucideIcon} from './063-lucide-icon.jsx';
import {typography} from './063-ui-theme.js';

// Search and keyboard highlight belong to this open picker, not the task store.
function SearchResults({issue,options,onSave,onClose,renderStatus}) {
 const [query,setQuery]=React.useState(''),[active,setActive]=React.useState(0),[busy,setBusy]=React.useState(false);
 const lock=React.useRef(false),current=React.useRef(true),list=React.useRef(null),id=React.useId();
 React.useEffect(()=>()=>{current.current=false;},[]);
 const needle=query.trim().toLocaleLowerCase();
 const results=options.filter(item=>!needle||(item.identifier+' '+item.title).toLocaleLowerCase().includes(needle)).slice(0,200);
 const index=Math.min(active,Math.max(0,results.length-1));
 React.useEffect(()=>{list.current?.querySelector('[aria-selected="true"]')?.scrollIntoView({block:'nearest'});},[index,query]);
 const select=async item=>{
  if(lock.current)return;
  if(item.id===issue.parent_issue_id){onClose();return;}
  lock.current=true;setBusy(true);
  try{const saved=await onSave({parent_issue_id:item.id});if(current.current&&saved!==false)onClose();}
  finally{lock.current=false;if(current.current)setBusy(false);}
 };
 return <div className="eva-parent-task-picker" aria-busy={busy}>
  <Input autoFocus aria-label="搜索任务编号或标题" placeholder="搜索任务编号或标题" prefix={<EvaLucideIcon name="search"/>}
   value={query} showClear disabled={busy} aria-controls={id} aria-autocomplete="list"
   aria-activedescendant={results.length?id+'-'+index:undefined}
   onChange={value=>{setQuery(value);setActive(0);}}
   onKeyDown={event=>{
    if(event.nativeEvent.isComposing||event.keyCode===229)return;
    if(event.key==='ArrowDown'||event.key==='ArrowUp'){
     event.preventDefault();setActive(results.length?(index+(event.key==='ArrowDown'?1:-1)+results.length)%results.length:0);
    }else if(event.key==='Enter'&&results[index]){event.preventDefault();select(results[index]);}
   }}/>
  <div ref={list} id={id} role="listbox" data-eva-inline-list aria-label="可关联的父任务" className="eva-parent-task-picker__results">
   {results.map((item,i)=><Button key={item.id} id={id+'-'+i} role="option" aria-selected={i===index} disabled={busy}
    type="tertiary" theme="borderless" className="eva-parent-task-picker__row" style={typography.body}
    onMouseEnter={()=>setActive(i)} onClick={()=>select(item)}>
    {renderStatus(item)}<span className="eva-parent-task-picker__identifier">{item.identifier}</span>
    <span className="eva-parent-task-picker__title">{item.title}</span>
    {item.id===issue.parent_issue_id&&<span className="eva-parent-task-picker__current" style={typography.auxiliary}>当前父任务</span>}
   </Button>)}
  </div>
  {!results.length&&<div className="eva-parent-task-picker__empty" role="status">{!options.length?'当前项目暂无可关联的父任务':'没有匹配的任务'}</div>}
 </div>;
}

export function ParentTaskPicker({visible,issue,options,onSave,onClose,returnFocus,renderStatus}) {
 return <Dialog visible={visible} title="关联父任务" size="standard" footer={null} onCancel={onClose} returnFocus={returnFocus}>
  {visible&&<SearchResults issue={issue} options={options} onSave={onSave} onClose={onClose} renderStatus={renderStatus}/>}
 </Dialog>;
}
