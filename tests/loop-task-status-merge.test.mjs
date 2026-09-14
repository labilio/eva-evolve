import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import {createPatchedRuntime} from '../tools/build-runtime.mjs';
const source=createPatchedRuntime().source;
const plain=value=>JSON.parse(JSON.stringify(value));
function setup(){
 const issues=[{id:'a',status:'backlog',identifier:'SC-1',workspace_id:'prod'},{id:'b',status:'todo'},{id:'c',status:'done'}];
 const ctx={scoped:()=>issues,ISSUES_BY_SPACE:{prod:issues},issues};
 const start=source.indexOf('issuesOf='),end=source.indexOf('function groupIssuesByAssignee',start);
 vm.runInNewContext(source.slice(start,end),ctx);
 return ctx;
}
test('旧待规划任务进入待办且保留对象、编号、项目和任务总数',()=>{
 const ctx=setup(),original=ctx.issues[0],items=ctx.issuesOf();
 assert.equal(items.length,3);assert.equal(items[0],original);assert.equal(items[0].status,'todo');
 assert.equal(items[0].identifier,'SC-1');assert.equal(items[0].workspace_id,'prod');assert.equal(items[2].status,'done');
 assert.equal(ctx.issuesOf()[0],original);
});
test('旧状态写入和批量修改均落到待办，不触及其他任务',async()=>{
 const ctx=setup();ctx.issuesOf();
 for(const [name,next] of [['updateIssue','previewIssueTrigger'],['batchUpdateIssues','batchDeleteIssues']]){
  const start=source.indexOf(name+'='),end=source.indexOf(','+next+'=',start);
  vm.runInNewContext(source.slice(start,end),ctx);
 }
 await ctx.updateIssue('a',{status:'backlog'});assert.equal(ctx.issues[0].status,'todo');
 await ctx.batchUpdateIssues(['b'],{status:'backlog'});assert.equal(ctx.issues[1].status,'todo');assert.equal(ctx.issues[2].status,'done');
});
test('保存的旧筛选映射到待办并去重，不扩大成全部状态',()=>{
 const ctx=setup();
 const start=source.indexOf('const STATUSES='),end=source.indexOf('function scopeToAssigneeTypes',start);
 vm.runInNewContext(source.slice(start,end),ctx);
 const state=vm.runInNewContext('normalizeFilters({statuses:["backlog","todo","done"],keyword:"SC"},false)',ctx);
 assert.deepEqual(plain(state.statuses),['todo','done']);assert.equal(state.keyword,'SC');
 assert.deepEqual(plain(vm.runInNewContext('normalizeFilters({statuses:["backlog"]},false).statuses',ctx)),['todo']);
});
test('指派AI或修改任何任务状态不进入启动执行确认',()=>{
 const start=source.indexOf('function needsConfirm'),end=source.indexOf('function useRunConfirm',start),ctx={isAgentAssignee:()=>true};
 vm.runInNewContext(source.slice(start,end),ctx);
 for(const status of ['backlog','todo','in_progress','in_review','done','blocked','cancelled']){
  assert.equal(ctx.needsConfirm({assigneeType:'agent',assigneeId:'ai',status}),false);
  assert.equal(ctx.statusMightTrigger({assignee_type:'agent',assignee_id:'ai',status:'backlog'},status),false);
 }
});
