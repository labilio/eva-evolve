import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';
const window={};vm.runInNewContext(readFileSync('prototype/062-loop-task-components.js','utf8'),{window});
const C=window.EvaLoopTaskComponents,ids=rows=>Array.from(rows,row=>row.id);
test('timeline reorder preserves task objects, dates, states and board positions',()=>{
 const rows=[{id:'a',status:'todo',position:8,start_date:'2026-09-01'},{id:'b',status:'done',position:1},{id:'c',status:'todo',position:2}];
 const before=JSON.stringify(rows),plan=C.timelineMovePlan(rows,'c','a');
 assert.deepEqual(ids(plan),['c','a','b']);assert.equal(JSON.stringify(rows),before);assert.equal(plan[0],rows[2]);
 plan.forEach((row,index)=>{row.sort_order=index*1000});
 assert.deepEqual(ids(C.timelineOrdered(rows)),['c','a','b']);
 assert.deepEqual(ids(C.boardOrdered(rows,'todo')),['c','a']);
 assert.equal(rows[0].start_date,'2026-09-01');assert.equal(rows[0].position,8);assert.equal(rows[1].status,'done');
 assert.deepEqual(ids(C.timelineMovePlan(rows,'c','b',true)),['a','b','c']);
});
test('timeline order rejects missing targets and no-op moves',()=>{
 const rows=[{id:'a'},{id:'b'},{id:'c'}];
 for(const args of [['missing','a'],['a','missing'],['a','a'],['a','b',false],['b','a',true]])assert.equal(C.timelineMovePlan(rows,...args),null);
 assert.deepEqual(ids(C.timelineOrdered(rows)),['a','b','c']);
});
test('shared timeline reorder validates project access before writing and leaves business fields intact',async()=>{
 const source=readFileSync('prototype/009-6-patch-general.js','utf8');
 const start=source.indexOf('function evaReorderTimelineIssue('),end=source.indexOf('function EvaIssueGanttView(',start);
 assert.ok(start>=0&&end>start);
 const rows=[{id:'a',workspace_id:'prod',status:'todo',position:5,start_date:'2026-09-01',due_date:'2026-09-08'},{id:'b',workspace_id:'prod',status:'done',position:1},{id:'c',workspace_id:'other',position:2}];
 let readable=true,archived=false;
 const ctx={window,evaTaskRecord:id=>rows.find(row=>row.id===id),evaTaskRowsFor:issue=>rows.filter(row=>row.workspace_id===issue.workspace_id),evaMembers:()=>({store:{actorId:()=> 'actor',canRead:()=>readable,assertProjectWritable:()=>{if(archived)throw Error('项目已归档')}}})};
 vm.runInNewContext(source.slice(start,end),ctx);
 const snapshot=JSON.stringify(rows);
 await assert.rejects(ctx.evaReorderTimelineIssue('a','c'),/同一项目/);
 readable=false;await assert.rejects(ctx.evaReorderTimelineIssue('a','b'),/无法调整/);
 readable=true;archived=true;await assert.rejects(ctx.evaReorderTimelineIssue('a','b'),/归档/);
 assert.equal(JSON.stringify(rows),snapshot,'all rejected operations are atomic');
 archived=false;await ctx.evaReorderTimelineIssue('a','b',true);
 assert.deepEqual(ids(C.timelineOrdered(rows.slice(0,2))),['b','a']);
 assert.equal(JSON.stringify(rows.map(({sort_order,...row})=>row)),snapshot,'manual order does not change board position, dates or status');
});
