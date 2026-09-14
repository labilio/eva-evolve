import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';

import { createPatchedRuntime } from '../tools/build-runtime.mjs';

const runtime = createPatchedRuntime().source;
const taskStyles = fs.readFileSync('prototype/034-project-task-toolbar-v3.css','utf8');

function assignment(name, next) {
  const start = runtime.indexOf(`${name}=`);
  const end = runtime.indexOf(next, start);
  assert.ok(start >= 0 && end > start, `${name} 边界不存在`);
  return `var ${runtime.slice(start, end)}`;
}

function setup() {
  const issues = [
    {id:'root',identifier:'SC-101',title:'父任务',status:'in_progress',priority:'high',parent_issue_id:null},
    {id:'child',identifier:'SC-102',title:'子任务',status:'todo',priority:'medium',parent_issue_id:'root'},
    {id:'grandchild',identifier:'SC-103',title:'孙任务',status:'done',priority:'low',parent_issue_id:'child'},
    {id:'peer',identifier:'SC-104',title:'同级任务',status:'todo',priority:'none',parent_issue_id:null},
  ];
  const ctx = {issuesOf:()=>issues,Date};
  const helperStart = runtime.indexOf('function evaIssueChildrenOf(');
  const helperEnd = runtime.indexOf('const EvaHierarchyIcon=', helperStart);
  assert.ok(helperStart >= 0 && helperEnd > helperStart);
  vm.runInNewContext(runtime.slice(helperStart, helperEnd), ctx);
  vm.runInNewContext(assignment('updateIssue', ',previewIssueTrigger='), ctx);
  vm.runInNewContext(assignment('batchUpdateIssues', ',batchDeleteIssues='), ctx);
  vm.runInNewContext(assignment('batchDeleteIssues', ',listChildren='), ctx);
  vm.runInNewContext(assignment('deleteIssue', ',enrichIssue='), ctx);
  return {ctx,issues};
}

test('父子关系只允许当前项目内无环引用，并可清除父任务', async()=>{
  const {ctx,issues}=setup();
  await assert.rejects(ctx.updateIssue('root',{parent_issue_id:'root'}),/自己的父任务/);
  await assert.rejects(ctx.updateIssue('root',{parent_issue_id:'missing'}),/当前项目/);
  await assert.rejects(ctx.updateIssue('root',{parent_issue_id:'grandchild'}),/自己的子任务/);
  await ctx.updateIssue('peer',{parent_issue_id:'root',title:'已拆分的同级任务'});
  assert.equal(issues.find(issue=>issue.id==='peer').parent_issue_id,'root');
  assert.equal(issues.find(issue=>issue.id==='peer').title,'已拆分的同级任务');
  await ctx.updateIssue('peer',{parent_issue_id:''});
  assert.equal(issues.find(issue=>issue.id==='peer').parent_issue_id,null);
});

test('删除父任务会被阻止，删除叶子任务不会遗留孤儿数据', async()=>{
  const {ctx,issues}=setup();
  await assert.rejects(ctx.deleteIssue('root'),/转移或删除子任务/);
  await assert.rejects(ctx.batchDeleteIssues(['child']),/转移或删除子任务/);
  await ctx.deleteIssue('grandchild');
  assert.equal(issues.some(issue=>issue.id==='grandchild'),false);
});

test('批量完成父任务前要求先处理未完成子任务', async()=>{
  const {ctx,issues}=setup();
  await assert.rejects(ctx.batchUpdateIssues(['root'],{status:'done'}),/未完成子任务/);
  assert.equal(issues.find(issue=>issue.id==='root').status,'in_progress');
  await ctx.updateIssue('child',{status:'done'});
  await ctx.batchUpdateIssues(['root'],{status:'done'});
  assert.equal(issues.find(issue=>issue.id==='root').status,'done');
});

test('供应链演示数据提供两级和三级子任务链，且不复制项目',()=>{
  const window={};
  for(const name of ['009-0-demo-time','009-1-data-drive','009-2-data-supply'])vm.runInNewContext(fs.readFileSync(`prototype/${name}.js`,'utf8'),{window});
  const issues=window.__EVA_SUPPLY_CHAIN_DEMO.issues,byIdentifier=id=>issues.find(issue=>issue.identifier===id);
  assert.equal(byIdentifier('SC-109').parent_issue_id,byIdentifier('SC-101').id);
  assert.equal(byIdentifier('SC-110').parent_issue_id,byIdentifier('SC-101').id);
  assert.equal(byIdentifier('SC-111').parent_issue_id,byIdentifier('SC-101').id);
  assert.equal(byIdentifier('SC-112').parent_issue_id,byIdentifier('SC-111').id);
  for(const id of ['SC-109','SC-110','SC-111','SC-112'])assert.equal(byIdentifier(id).project_id,'p-supply');
});

test('层级、看板、分组、列表和详情均接入统一父子任务运行时',()=>{
  assert.ok(runtime.includes('["board","grouped","list","hierarchy"]'));
  assert.ok(runtime.includes('className:"eva-loop-subtasks__empty"'));
  assert.ok(runtime.includes('父任务完成不会自动完成子任务，子任务状态保持不变。'));
  assert.ok(runtime.includes('React.createElement(EvaIssueRelationMeta,{issue:rt})'));
  assert.ok(runtime.includes('React.createElement(EvaIssueRelationMeta,{issue:rn,variant:"list"})'));
  assert.ok(runtime.includes('"直接子任务"'));
  assert.ok(runtime.includes('mt.total," 项任务"'));
  assert.ok(runtime.includes('className:"eva-loop-list__task"'));
  assert.ok(runtime.includes('" is-subtask"'));
  assert.ok(runtime.includes('" has-subtasks"'));
  assert.ok(runtime.includes('parentIssueId:evaCreateParent?.id'));
  assert.ok(runtime.includes('function EvaBoardSubtaskTree('));
  assert.ok(runtime.includes('className:"eva-board-subtask__children"'));
  assert.ok(runtime.includes('className:"eva-board-subtask__meta"'));
  assert.ok(runtime.includes('React.createElement(EvaIssueAssignee,{issue:Nt,size:18,compact:!0})'));
  assert.ok(runtime.includes('className:"eva-board-col-count"'));
  assert.ok(runtime.includes('showSubtasks:!0'));
  assert.match(taskStyles,/\.eva-board-subtasks__tree[\s\S]*border-left:/);
  assert.match(taskStyles,/\.eva-loop-board--nested\s*\{\s*grid-auto-columns:\s*336px/);
  assert.match(taskStyles,/\.eva-board-subtask__row\s*\{[\s\S]*grid-template-columns:\s*20px 15px minmax\(0, 1fr\) auto 20px/);
  assert.match(taskStyles,/\.eva-board-subtask__meta\s*\{[\s\S]*grid-column:\s*5/);
  assert.match(taskStyles,/\.eva-board-subtask__title\s*\{[\s\S]*text-overflow:\s*ellipsis;[\s\S]*white-space:\s*nowrap/);
  assert.match(taskStyles,/\.eva-board-subtask__meta > \.eva-issue-assignee\.is-compact\s*\{[\s\S]*width:\s*20px/);
  assert.match(taskStyles,/\.eva-board-subtasks__tree,[\s\S]*margin-left:\s*6px;[\s\S]*padding-left:\s*6px/);
  assert.match(taskStyles,/\.loop-card \.eva-issue-relation\s*\{[\s\S]*background:\s*var\(--eva-surface-subtle\)/);
  assert.match(taskStyles,/\.eva-loop-list__task\s*\{[\s\S]*flex-direction:\s*column/);
  assert.match(taskStyles,/\.loop-list__row\.is-subtask \.eva-loop-list__task::before/);
  assert.match(taskStyles,/\.eva-issue-relation__track > span\s*\{[\s\S]*background:\s*var\(--eva-action-primary\)/);
});

test('任务分解画布内嵌于任务详情并展示完整任务上下文',()=>{
  assert.ok(runtime.includes('function EvaIssueBreakdownCanvas('));
  assert.ok(runtime.includes('evaIssueDescendantIds(rt.id,gt)'));
  assert.ok(runtime.includes('"查看分解"'));
  assert.ok(runtime.includes('"查看任务分解"'));
  assert.ok(runtime.includes('"收起分解"'));
  assert.ok(runtime.includes('"开始分解"'));
  assert.ok(runtime.includes('parentIssueId:evaChildParent?.id||rt'));
  assert.ok(runtime.includes('onClick:()=>pt(kr)'));
  assert.ok(runtime.includes('className:"loop-idp__section eva-loop-subtasks",ref:evaBreakdownSectionRef'));
  assert.ok(runtime.includes('evaBreakdownOpen&&Ht.length?React.createElement(EvaIssueBreakdownCanvas'));
  assert.ok(runtime.includes('className:"eva-task-breakdown__node-fields"'));
  assert.ok(runtime.includes('className:"eva-task-breakdown__node-due"'));
  assert.ok(runtime.includes('className:"eva-task-breakdown__node-labels"'));
  assert.ok(runtime.includes('className:"eva-task-breakdown__node-priority"'));
  assert.ok(runtime.includes('React.createElement(EvaIssueAssignee,{issue:kr,size:18})'));
  assert.ok(runtime.includes('React.createElement(LabelChips,{labels:kr.labels,max:2})'));
  assert.equal(runtime.includes('className:"eva-task-breakdown__detail-overlay"'),false);
  assert.equal(runtime.includes('breakdownContext:!0'),false);
  assert.equal(runtime.includes('["board","grouped","list","hierarchy","breakdown"]'),false);
  assert.match(taskStyles,/\.eva-task-breakdown\s*\{[\s\S]*height:\s*440px;[\s\S]*border:\s*var\(--eva-border-standard-w\) solid var\(--eva-border-subtle\)/);
  assert.match(taskStyles,/\.eva-task-breakdown__children::before\s*\{[\s\S]*background:\s*var\(--eva-border-default\)/);
  assert.match(taskStyles,/\.eva-task-breakdown__node\s*\{[\s\S]*width:\s*292px;[\s\S]*height:\s*178px/);
  assert.match(taskStyles,/\.eva-task-breakdown__node-title\s*\{[\s\S]*text-overflow:\s*ellipsis;[\s\S]*white-space:\s*nowrap/);
  assert.match(taskStyles,/@media \(max-width:\s*760px\)[\s\S]*\.eva-task-breakdown__node\s*\{\s*width:\s*270px;\s*height:\s*174px/);
});
