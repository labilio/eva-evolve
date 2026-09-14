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
  await ctx.updateIssue('peer',{due_date:'2026-09-20'});
  assert.equal(issues.find(issue=>issue.id==='peer').due_date,'2026-09-20');
  await ctx.updateIssue('peer',{due_date:null});
  assert.equal(issues.find(issue=>issue.id==='peer').due_date,null);
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
  for(const issue of issues)assert.match(issue.due_date,/^2026-09-\d{2}$/);
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
  assert.ok(runtime.includes('className:"loop-list__check",onClick:cn=>cn.stopPropagation()},React.createElement(Checkbox,{"aria-label":"选择任务 "+rn.identifier'));
  assert.ok(runtime.includes('className:"loop-list__id"},rn.identifier),React.createElement("div",{className:"eva-loop-list__task"'));
  assert.equal(runtime.includes('className:"loop-list__project"'),false);
  assert.ok(runtime.includes('className:"loop-list__due"'));
  assert.ok(runtime.includes('" is-subtask"'));
  assert.ok(runtime.includes('" has-subtasks"'));
  assert.ok(runtime.includes('parentIssueId:evaCreateParent?.id'));
  assert.ok(runtime.includes('function EvaBoardSubtaskTree('));
  assert.ok(runtime.includes('className:"eva-board-subtask__children"'));
  assert.ok(runtime.includes('className:"eva-board-subtask__meta"'));
  assert.ok(runtime.includes('className:"eva-board-subtask__due"'));
  assert.ok(runtime.includes('React.createElement(EvaIssueAssignee,{issue:Nt,size:18,compact:!0})'));
  assert.ok(runtime.includes('className:"eva-board-col-count"'));
  assert.ok(runtime.includes('showSubtasks:!0'));
  assert.match(taskStyles,/\.eva-board-subtasks__tree[\s\S]*border-left:/);
  assert.match(taskStyles,/\.eva-loop-board--nested\s*\{\s*grid-auto-columns:\s*336px/);
  assert.match(taskStyles,/\.eva-board-subtask__row\s*\{[\s\S]*grid-template-columns:\s*20px 15px minmax\(0, 1fr\) auto 38px/);
  assert.match(taskStyles,/\.eva-board-subtask__meta\s*\{[\s\S]*grid-column:\s*5/);
  assert.match(taskStyles,/\.eva-board-subtask__title\s*\{[\s\S]*text-overflow:\s*ellipsis;[\s\S]*white-space:\s*nowrap/);
  assert.match(taskStyles,/\.eva-board-subtask__meta > \.eva-issue-assignee\.is-compact\s*\{[\s\S]*width:\s*20px/);
  assert.match(taskStyles,/\.eva-board-subtasks__tree,[\s\S]*margin-left:\s*6px;[\s\S]*padding-left:\s*6px/);
  assert.match(taskStyles,/\.loop-card \.eva-issue-relation\s*\{[\s\S]*background:\s*var\(--eva-surface-subtle\)/);
  assert.match(taskStyles,/\.eva-loop-list__task\s*\{[\s\S]*flex-direction:\s*column/);
  assert.match(taskStyles,/--eva-task-columns:\s*16px 76px minmax\(180px,1fr\) minmax\(0,120px\) 76px 210px 64px/);
  assert.match(taskStyles,/\.loop-list__due\s*\{\s*grid-column:\s*5/);
  assert.match(taskStyles,/\.loop-list__assignee\s*\{\s*grid-column:\s*6/);
  assert.match(taskStyles,/\.loop-list__row\.is-subtask \.eva-loop-list__task::before/);
  assert.match(taskStyles,/\.eva-issue-relation__track > span\s*\{[\s\S]*background:\s*var\(--eva-action-primary\)/);
  assert.match(taskStyles,/\.eva-issue-hierarchy__due\s*\{[\s\S]*white-space:\s*nowrap/);
});

test('任务详情递归展示全部后代并按整棵子任务树统计进度',()=>{
  assert.ok(runtime.includes('function EvaIssueDetailSubtaskTree('));
  assert.ok(runtime.includes('className:"loop-subissues eva-loop-subtask-tree",role:"tree","aria-label":rt.identifier+" 的全部子任务"'));
  assert.ok(runtime.includes('className:"eva-loop-subtask-tree__item",role:"treeitem","aria-level":Ct+1'));
  assert.ok(runtime.includes('className:"eva-loop-subtask-tree__children",role:"group"'));
  assert.ok(runtime.includes('Pt.map(Ft=>gt(Ft,Ct+1,Dt))'));
  assert.ok(runtime.includes('onClick:ut?void 0:()=>ct(St.id)'));
  assert.ok(runtime.includes('evaDetailSubtaskIds=evaIssueDescendantIds(xt.id,issuesOf())'));
  assert.ok(runtime.includes('evaDetailSubtasks=issuesOf().filter(ki=>evaDetailSubtaskIds.has(ki.id))'));
  assert.ok(runtime.includes('evaSubtaskTotal=evaDetailSubtasks.length'));
  assert.ok(runtime.includes('"aria-valuemax":evaSubtaskTotal'));
  assert.ok(runtime.includes('width:evaSubtaskTotal?Oi/evaSubtaskTotal*100+"%":"0%"'));
  assert.ok(runtime.includes('React.createElement(EvaIssueDetailSubtaskTree,{rootIssue:xt,onOpen:Ea,readOnly:Ct})'));
  assert.match(taskStyles,/\.eva-loop-subtask-tree__children\s*\{[\s\S]*margin-left:\s*8px;[\s\S]*padding-left:\s*12px;[\s\S]*border-left:/);
  assert.match(taskStyles,/\.eva-loop-subtask-tree__children > \.eva-loop-subtask-tree__branch::before\s*\{[\s\S]*left:\s*-12px;[\s\S]*border-top:/);
});

test('任务分解画布内嵌于任务详情并可在固定分解根内切换节点详情',()=>{
  assert.ok(runtime.includes('function EvaIssueBreakdownCanvas('));
  assert.ok(runtime.includes('createLucideIcon("Maximize2"'));
  assert.ok(runtime.includes('createLucideIcon("Minimize2"'));
  assert.ok(runtime.includes('evaIssueDescendantIds(rt.id,gt)'));
  assert.ok(runtime.includes('"查看分解"'));
  assert.ok(runtime.includes('"查看任务分解"'));
  assert.ok(runtime.includes('"收起分解"'));
  assert.ok(runtime.includes('"开始分解"'));
  assert.ok(runtime.includes('parentIssueId:evaChildParent?.id||rt'));
  assert.ok(runtime.includes('onClick:()=>pt(kr)'));
  assert.ok(runtime.includes('className:"loop-idp__section eva-loop-subtasks",ref:evaBreakdownSectionRef'));
  assert.ok(runtime.includes('evaBreakdownOpen&&evaBreakdownHasNodes?React.createElement(EvaIssueBreakdownCanvas'));
  assert.ok(runtime.includes('className:"eva-task-breakdown__node-fields"'));
  assert.ok(runtime.includes('className:"eva-task-breakdown__node-due"'));
  assert.ok(runtime.includes('className:"eva-task-breakdown__node-labels"'));
  assert.ok(runtime.includes('className:"eva-task-breakdown__node-priority"'));
  assert.ok(runtime.includes('React.createElement(EvaIssueAssignee,{issue:kr,size:18})'));
  assert.ok(runtime.includes('React.createElement(LabelChips,{labels:kr.labels,max:2})'));
  assert.ok(runtime.includes('returnContext:evaReturn'));
  assert.ok(runtime.includes('Ea=(ki,evaOrigin="parent")=>'));
  assert.ok(runtime.includes('breakdownRootIssueId:evaRoot.id'));
  assert.ok(runtime.includes('evaReturnContext?.parentIssueId===evaParentIssue.id?Qa():Ea(evaParentIssue.id,evaReturnContext?.origin==="breakdown"?"breakdown":"parent")'));
  assert.ok(runtime.includes('[evaSelectedIssueId,evaSetSelectedIssueId]'));
  assert.ok(runtime.includes('[evaFullscreen,evaSetFullscreen]'));
  assert.ok(runtime.includes('selectedIssueId:evaSelectedIssueId'));
  assert.ok(runtime.includes('fullscreen:evaFullscreen'));
  assert.ok(runtime.includes('document.addEventListener("keydown",kr)'));
  assert.ok(runtime.includes('document.querySelector(".semi-modal-wrap")'));
  assert.ok(runtime.includes('className:"eva-task-breakdown"+(evaFullscreen?" is-fullscreen":"")'));
  assert.ok(runtime.includes('"aria-label":evaFullscreen?"退出全屏编辑":"全屏编辑任务分解"'));
  assert.ok(runtime.includes('"aria-pressed":evaFullscreen'));
  assert.ok(runtime.includes('canvas:{...no.canvas,selectedIssueId:evaBreakdownRootId}'));
  assert.ok(runtime.includes('"aria-label":"选择任务 "+kr.identifier'));
  assert.ok(runtime.includes('"aria-selected":evaIsSelected'));
  assert.ok(runtime.includes('"aria-pressed":evaIsSelected'));
  assert.ok(runtime.includes('"当前选中 ",React.createElement("strong",null,evaSelectedIssue.identifier)'));
  assert.ok(runtime.includes('kr!==evaActiveIssueId&&ct?.(kr)'));
  assert.ok(runtime.includes('rootIssue:evaBreakdownRootIssue,activeIssueId:xt.id'));
  assert.ok(runtime.includes('onSelect:ki=>Ea(ki,"breakdown")'));
  assert.ok(runtime.includes('if(ki===evaRoot.id&&evaReturnContext?.origin==="breakdown")'));
  assert.ok(runtime.includes('evaReturnContext?.origin==="breakdown"&&WKApp$1.routeRight.pop()'));
  assert.match(taskStyles,/\.eva-task-breakdown\.is-fullscreen\s*\{[\s\S]*position:\s*fixed;[\s\S]*inset:\s*var\(--topbar-height, 37px\) 0 0;[\s\S]*z-index:\s*950;[\s\S]*height:\s*auto;/);
  assert.ok(runtime.includes('onChanged:evaIsBreakdown?ct:'));
  assert.ok(runtime.includes('React.createElement(EvaIssueDetailSubtaskTree,{rootIssue:xt,onOpen:Ea,readOnly:Ct})'));
  assert.equal(runtime.includes('返回任务分解'),false);
  assert.ok(runtime.includes('evaReturnContext?.label||St("loop.detail.board")'));
  assert.ok(runtime.includes('WKApp$1.routeRight.pop(),Wi&&evaReturn.parentIdentifier'));
  assert.ok(runtime.includes('const evaIssueDetailViewState=new Map'));
  assert.ok(runtime.includes('viewState:evaReadIssueDetailViewState(evaBreakdownRootId).canvas'));
  assert.ok(runtime.includes('onViewStateChange:ki=>evaRememberIssueDetailViewState(evaBreakdownRootId,{canvas:ki})'));
  assert.ok(runtime.includes('evaReturnContext?.origin==="breakdown"||evaReadIssueDetailViewState(evaReturnContext?.breakdownRootIssueId||rt).breakdownOpen===!0'));
  assert.ok(runtime.includes('onScroll:evaSaveView'));
  assert.ok(runtime.includes('evaReturnContext||evaIssueDetailViewState.delete(rt)'));
  assert.ok(runtime.includes('className:"loop-idp__prop loop-idp__prop--inline loop-idp__prop--due"'));
  assert.ok(runtime.includes('"aria-label":"截止日期",showClear:!0'));
  assert.equal(runtime.includes('className:"eva-task-breakdown__detail-overlay"'),false);
  assert.equal(runtime.includes('breakdownContext:!0'),false);
  assert.equal(runtime.includes('["board","grouped","list","hierarchy","breakdown"]'),false);
  assert.match(taskStyles,/\.eva-task-breakdown\s*\{[\s\S]*height:\s*440px;[\s\S]*border:\s*var\(--eva-border-standard-w\) solid var\(--eva-border-subtle\)/);
  assert.match(taskStyles,/\.eva-task-breakdown__children::before\s*\{[\s\S]*background:\s*var\(--eva-border-default\)/);
  assert.match(taskStyles,/\.eva-task-breakdown__node\s*\{[\s\S]*width:\s*292px;[\s\S]*height:\s*178px/);
  assert.match(taskStyles,/\.eva-task-breakdown__node\.is-selected\s*\{[\s\S]*border-color:\s*var\(--eva-action-primary\)/);
  assert.match(taskStyles,/\.eva-task-breakdown__node-main:focus-visible\s*\{[\s\S]*outline:\s*2px solid var\(--eva-action-primary\)/);
  assert.match(taskStyles,/\.eva-task-breakdown__node-title\s*\{[\s\S]*text-overflow:\s*ellipsis;[\s\S]*white-space:\s*nowrap/);
  assert.match(taskStyles,/@media \(max-width:\s*760px\)[\s\S]*\.eva-task-breakdown__node\s*\{\s*width:\s*270px;\s*height:\s*174px/);
});
