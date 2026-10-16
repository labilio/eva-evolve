// Statistics consume the same filtered records as the project task views.
export function summarizeTasks(issues,today,calendarDay){
  const tasks=[...new Map(issues.map(task=>[task.id,task])).values()];
  const states={};const now=calendarDay(today);
  for(const task of tasks)states[task.status]=(states[task.status]||0)+1;
  const overdue=tasks.filter(task=>{
    const due=calendarDay(task.due_date);
    return now!==null&&due!==null&&due<now&&!['done','cancelled'].includes(task.status);
  }).sort((a,b)=>a.due_date.localeCompare(b.due_date)||a.identifier.localeCompare(b.identifier));
  return {total:tasks.length,states,overdue};
}
