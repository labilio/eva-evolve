import test from 'node:test';
import assert from 'node:assert/strict';
import {summarizeTasks} from '../prototype/063-task-analytics-data.mjs';
const day=s=>/^\d{4}-\d{2}-\d{2}$/.test(s||'')?Date.parse(s)/86400000:null;
test('任务分析按筛选记录去重，包含子任务，不把今天到期或终态任务算成逾期',()=>{
 const tasks=[{id:'a',identifier:'A',status:'in_progress',due_date:'2026-09-27'},
 {id:'b',identifier:'B',status:'todo',due_date:'2026-09-28',parent_issue_id:'a'},
 {id:'c',identifier:'C',status:'done',due_date:'2026-09-01'},
 {id:'d',identifier:'D',status:'cancelled',due_date:'2026-09-01'},
 {id:'e',identifier:'E',status:'backlog',due_date:null}];
 const result=summarizeTasks([...tasks,tasks[0]],'2026-09-28',day);
 assert.equal(result.total,5);assert.equal(result.states.todo,1);assert.deepEqual(result.overdue.map(x=>x.id),['a']);
 assert.equal(summarizeTasks(tasks.slice(1),'2026-09-28',day).overdue.length,0);
 assert.deepEqual(summarizeTasks([],'2026-09-28',day),{total:0,states:{},overdue:[]});
 assert.equal(tasks[0].status,'in_progress');
});
