import React from 'react';
import {Button} from './063-forms.jsx';
import {Dialog} from './063-dialog.jsx';
import {Progress} from './063-progress.jsx';
import {EvaLucideIcon} from './063-lucide-icon.jsx';
import {summarizeTasks} from './063-task-analytics-data.mjs';

export function TaskToolTip({content,children}){
 const Tooltip=window.EvaTooltipComponent;
 return <Tooltip content={content} position="bottom" clickTriggerToHide><span className="eva-task-tool-trigger">{children}</span></Tooltip>;
}
export function TaskAnalytics({getIssues,projectName,actorId,candidates,renderAssignee,statuses,onOpen,loading}){
 const [open,setOpen]=React.useState(false),pending=React.useRef(null);
 const [scope,setScope]=React.useState('assignee'),[assigneeId,setAssigneeId]=React.useState(actorId);
 const selected=candidates.find(person=>person.id===assigneeId);
 const effectiveId=selected?assigneeId:actorId;
 React.useEffect(()=>{if(!selected&&assigneeId!==actorId)setAssigneeId(actorId);},[selected,assigneeId,actorId]);
 const scopeLabel=scope==='project'?'当前项目的全部任务':effectiveId===actorId?'我负责的任务':`${selected?.name||'所选负责人'}负责的任务`;
 const today=window.EvaTaskTime.todayDate();
 const issues=getIssues();
 const data=summarizeTasks(scope==='project'?issues:issues.filter(task=>task.assignee_id===effectiveId),today,window.EvaTaskTime.calendarDay);
 return <>
  <TaskToolTip content="任务分析"><Button className="eva-task-analytics-button" theme="borderless" type="tertiary" disabled={loading} icon={<EvaLucideIcon name="chart-column" size={18}/>} aria-label="任务分析" aria-haspopup="dialog" aria-expanded={open} onClick={()=>setOpen(true)}/></TaskToolTip>
  <Dialog visible={open} size="wide" title="任务分析" accessibleName="任务分析" footer={null} className="eva-task-analytics" onCancel={()=>setOpen(false)} afterClose={()=>{const id=pending.current;pending.current=null;if(id)onOpen(id);}}>
   <div className="eva-task-analytics__controls">
    <div className="eva-task-quick-chips" role="group" aria-label="分析范围">
     {[{value:'project',label:'整个项目'},{value:'assignee',label:'按负责人'}].map(option=><Button key={option.value} theme="light" type={scope===option.value?'primary':'tertiary'} className="eva-task-quick-chip" aria-pressed={scope===option.value} onClick={()=>setScope(option.value)}>{option.label}</Button>)}
    </div>
    {scope==='assignee'&&<div className="eva-task-analytics__assignee" role="group" aria-label="分析负责人">{renderAssignee({value:effectiveId,valueName:selected?.name||'我',onChange:setAssigneeId})}{effectiveId===actorId&&<span className="eva-task-analytics__self">（我）</span>}</div>}
   </div>
   <p className="eva-task-analytics__scope">{projectName} · {scopeLabel}</p>
   <p className="eva-task-analytics__note">包含子任务，不受任务列表筛选影响。统计日期：{today}</p>
   <dl className="eva-task-analytics__summary">
    <div><dt>任务总数</dt><dd data-stat="total">{data.total}</dd></div>
    <div><dt>已完成</dt><dd data-stat="completed">{data.states.done||0}</dd></div>
    <div><dt>已逾期</dt><dd data-stat="overdue" className={data.overdue.length?'has-overdue':undefined}>{data.overdue.length}</dd></div>
   </dl>
   {!data.total?<p className="eva-task-analytics__empty">{scope==='project'?'当前项目暂无任务':'这位负责人暂无任务，可切换负责人或查看整个项目'}</p>:<>
    <section aria-label="状态分布"><h3>状态分布</h3>
     <div className="eva-task-analytics__states">{statuses.map(state=><div className="eva-task-analytics__state" key={state.value}>
      <span>{state.label}</span><Progress aria-label={state.label} percent={(data.states[state.value]||0)/data.total*100} showInfo={false} stroke={state.color}/><span className="eva-task-analytics__count">{data.states[state.value]||0}</span>
     </div>)}</div>
    </section>
    <section aria-label="逾期任务"><h3>逾期任务</h3><p className="eva-task-analytics__note">已超过截止日期，且尚未完成或取消。按截止日期从早到晚排列。</p>
     {data.overdue.length?<div className="eva-task-analytics__overdue">{data.overdue.map(task=><Button key={task.id} theme="borderless" type="tertiary" className="eva-task-analytics__task" onClick={()=>{pending.current=task.id;setOpen(false);}}>
      <span className="eva-task-analytics__task-id">{task.identifier}</span><span className="eva-task-analytics__task-name">{task.title}</span><time>{task.due_date}</time>
     </Button>)}</div>:<p className="eva-task-analytics__empty">当前范围没有逾期任务</p>}
    </section>
   </>}
  </Dialog>
 </>;
}
