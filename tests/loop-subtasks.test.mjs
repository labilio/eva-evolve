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
  const statusHelperStart = runtime.indexOf('function evaNormalizeTaskStatus');
  const statusHelperEnd = runtime.indexOf('function evaNormalizeTaskList', statusHelperStart);
  assert.ok(statusHelperStart >= 0 && statusHelperEnd > statusHelperStart);
  vm.runInNewContext(runtime.slice(statusHelperStart, statusHelperEnd), ctx);
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

test('供应链演示数据提供超过默认展示深度的四级子任务链，且不复制项目',()=>{
  const window={};
  for(const name of ['009-0-demo-time','009-1-data-drive','009-2-data-supply'])vm.runInNewContext(fs.readFileSync(`prototype/${name}.js`,'utf8'),{window});
  const issues=window.__EVA_SUPPLY_CHAIN_DEMO.issues,byIdentifier=id=>issues.find(issue=>issue.identifier===id);
  assert.equal(byIdentifier('SC-109').parent_issue_id,byIdentifier('SC-101').id);
  assert.equal(byIdentifier('SC-110').parent_issue_id,byIdentifier('SC-101').id);
  assert.equal(byIdentifier('SC-111').parent_issue_id,byIdentifier('SC-101').id);
  assert.equal(byIdentifier('SC-112').parent_issue_id,byIdentifier('SC-111').id);
  assert.equal(byIdentifier('SC-113').parent_issue_id,byIdentifier('SC-112').id);
  assert.equal(byIdentifier('SC-114').parent_issue_id,byIdentifier('SC-113').id);
  for(const id of ['SC-109','SC-110','SC-111','SC-112','SC-113','SC-114'])assert.equal(byIdentifier(id).project_id,'p-supply');
  for(const issue of issues)assert.match(issue.due_date,/^2026-09-\d{2}$/);
});

test('任务详情默认展示前三层，并只折叠仍有后代的第三层节点',()=>{
  const {ctx}=setup(),issues=[
    {id:'root',parent_issue_id:null},
    {id:'level-1',parent_issue_id:'root'},
    {id:'level-2',parent_issue_id:'level-1'},
    {id:'level-3',parent_issue_id:'level-2'},
    {id:'level-4',parent_issue_id:'level-3'},
    {id:'level-5',parent_issue_id:'level-4'},
    {id:'level-3-leaf',parent_issue_id:'level-2'},
  ];
  assert.deepEqual([...ctx.evaIssueDefaultCollapsedIds('root',issues)],['level-3']);
  assert.deepEqual([...ctx.evaIssueDefaultCollapsedIds('level-2',issues)],[]);
});

test('任务祖先链按根任务到直接父任务排序，并在异常循环关系下安全终止',()=>{
  const {ctx,issues}=setup();
  assert.deepEqual(Array.from(ctx.evaIssueAncestorChain(issues.find(issue=>issue.id==='grandchild'),issues),issue=>issue.id),['root','child']);
  issues.find(issue=>issue.id==='root').parent_issue_id='grandchild';
  assert.deepEqual(Array.from(ctx.evaIssueAncestorChain(issues.find(issue=>issue.id==='grandchild'),issues),issue=>issue.id),['root','child']);
});

test('任务面包屑只保留离当前任务最近的三级',()=>{
  const {ctx}=setup(),issues=[
    {id:'root',identifier:'SC-101',title:'根任务',parent_issue_id:null},
    {id:'level-1',identifier:'SC-102',title:'一级任务',parent_issue_id:'root'},
    {id:'level-2',identifier:'SC-103',title:'二级任务',parent_issue_id:'level-1'},
    {id:'level-3',identifier:'SC-104',title:'三级任务',parent_issue_id:'level-2'},
    {id:'current',identifier:'SC-105',title:'当前任务',parent_issue_id:'level-3'},
  ];
  assert.deepEqual(Array.from(ctx.evaIssueBreadcrumbChain(issues[4],issues),issue=>issue.id),['level-2','level-3','current']);
  assert.deepEqual(Array.from(ctx.evaIssueBreadcrumbChain(issues[1],issues),issue=>issue.id),['root','level-1']);
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
  assert.ok(runtime.includes('const Ft=rt.filter(Qt=>Qt.status===Dt)'));
  assert.ok(runtime.includes('React.createElement("em",null,Ft.length)'));
  assert.ok(runtime.includes('showRelation:!1,draggable:!0'));
  assert.ok(runtime.includes('pt&&React.createElement(EvaIssueRelationMeta,{issue:rt})'));
  assert.equal(runtime.includes('EvaBoardSubtask'),false);
  assert.equal(runtime.includes('showSubtasks'),false);
  assert.doesNotMatch(taskStyles,/eva-board-subtask|eva-board-subtasks|eva-board-col-count|eva-loop-board--subtasks/);
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
  assert.ok(runtime.includes('function evaIssueDefaultCollapsedIds('));
  assert.ok(runtime.includes('evaIssueDefaultCollapsedIds(rt.id,mt)'));
  assert.ok(runtime.includes('[rt.id,evaTreeSignature]'));
  assert.ok(runtime.includes('className:"eva-loop-subtask-tree__depth-note"'));
  assert.ok(runtime.includes('"第 4 层及更深任务已收起"'));
  assert.ok(runtime.includes('"展开全部层级"'));
  assert.ok(runtime.includes('onClick:()=>evaSetCollapsedIds(new Set)'));
  assert.ok(runtime.includes('className:"eva-loop-subtask-tree__toggle"'));
  assert.ok(runtime.includes('"aria-expanded":Pt.length?evaExpanded:void 0'));
  assert.ok(runtime.includes('className:"loop-subissues eva-loop-subtask-tree",role:"tree","aria-label":rt.identifier+" 的全部子任务"'));
  assert.ok(runtime.includes('className:"eva-loop-subtask-tree__item",role:"treeitem","aria-level":Ct+1'));
  assert.ok(runtime.includes('className:"eva-loop-subtask-tree__children",role:"group"'));
  assert.ok(runtime.includes('evaExpanded&&Pt.length>0&&React.createElement("div",{className:"eva-loop-subtask-tree__children"'));
  assert.ok(runtime.includes('onClick:ut?void 0:()=>ct(St.id)'));
  assert.ok(runtime.includes('evaDetailSubtaskIds=evaIssueDescendantIds(xt.id,issuesOf())'));
  assert.ok(runtime.includes('evaDetailSubtasks=issuesOf().filter(ki=>evaDetailSubtaskIds.has(ki.id))'));
  assert.ok(runtime.includes('evaSubtaskTotal=evaDetailSubtasks.length'));
  assert.ok(runtime.includes('"aria-valuemax":evaSubtaskTotal'));
  assert.ok(runtime.includes('width:evaSubtaskTotal?Oi/evaSubtaskTotal*100+"%":"0%"'));
  assert.ok(runtime.includes('React.createElement(EvaIssueDetailSubtaskTree,{rootIssue:xt,onOpen:Ea,readOnly:Ct})'));
  assert.match(taskStyles,/\.eva-loop-subtask-tree__children\s*\{[\s\S]*margin-left:\s*8px;[\s\S]*padding-left:\s*12px;[\s\S]*border-left:/);
  assert.match(taskStyles,/\.eva-loop-subtask-tree__children > \.eva-loop-subtask-tree__branch::before\s*\{[\s\S]*left:\s*-12px;[\s\S]*border-top:/);
  assert.match(taskStyles,/\.eva-loop-subtask-tree__item\s*\{[\s\S]*grid-template-columns:\s*24px minmax\(0, 1fr\)/);
  assert.match(taskStyles,/\.eva-loop-subtask-tree__depth-note\s*\{[\s\S]*justify-content:\s*flex-end/);
});

test('任务详情只保留层级树，并通过最近三级可点击面包屑原位切换详情',()=>{
  assert.ok(runtime.includes('function evaIssueAncestorChain('));
  assert.ok(runtime.includes('function evaIssueBreadcrumbChain('));
  assert.ok(runtime.includes('evaAncestorIssues=evaIssueAncestorChain(xt)'));
  assert.ok(runtime.includes('evaBreadcrumbIssues=evaIssueBreadcrumbChain(xt)'));
  assert.ok(runtime.includes('evaBreadcrumbAncestorIssues=evaBreadcrumbIssues.slice(0,-1)'));
  assert.ok(runtime.includes('evaBreadcrumbHasHiddenAncestors=evaAncestorIssues.length>evaBreadcrumbAncestorIssues.length'));
  assert.ok(runtime.includes('evaBreadcrumbAncestorIssues.map(ki=>React.createElement(React.Fragment'));
  assert.ok(runtime.includes('className:"loop-idp__crumb-task"'));
  assert.ok(runtime.includes('className:"loop-idp__crumb-id"},ki.identifier'));
  assert.ok(runtime.includes('className:"loop-idp__crumb-title"},ki.title'));
  assert.ok(runtime.includes('"aria-label":"已省略更早的任务层级"'));
  assert.ok(runtime.includes('"aria-current":"page"'));
  assert.ok(runtime.includes('onClick:Ct?void 0:()=>Ea(ki.id)'));
  assert.ok(runtime.includes('replaceFleetIssueDeepLink(Wi,no.identifier)'));
  assert.ok(runtime.includes('WKApp$1.routeRight.pop(),WKApp$1.routeRight.push'));
  assert.ok(runtime.includes('React.createElement(IssueDetailPage,{key:ki,issueId:ki,onChanged:ct,onClose:ut})'));
  assert.ok(runtime.includes('function evaRestoreFleetProjectRoute('));
  assert.ok(runtime.includes('writeBrowserPath("/#/collab?evaProject="+encodeURIComponent(rt),"replace")'));
  assert.ok(runtime.includes('Qa=()=>{const Wi=currentWorkspaceSlug();Wi&&evaRestoreFleetProjectRoute(Wi)'));
  assert.ok(runtime.includes('React.createElement(EvaIssueDetailSubtaskTree,{rootIssue:xt,onOpen:Ea,readOnly:Ct})'));
  assert.ok(runtime.includes('parentIssueId:evaChildParent?.id||rt'));
  assert.ok(runtime.includes('"开始分解"'));
  assert.ok(runtime.includes('className:"loop-idp__prop loop-idp__prop--inline loop-idp__prop--due"'));
  assert.ok(runtime.includes('"aria-label":"截止日期",showClear:!0'));
  for(const obsolete of [
    'function EvaIssueBreakdownCanvas(',
    '查看分解',
    '查看任务分解',
    '收起分解',
    'evaIssueDetailViewState',
    'evaBreakdown',
    'returnContext',
    'evaReturnContext',
    '返回 SC-',
  ])assert.equal(runtime.includes(obsolete),false,`已移除能力不应残留：${obsolete}`);
  assert.doesNotMatch(taskStyles,/\.eva-task-breakdown/);
  assert.doesNotMatch(taskStyles,/\.loop-idp__boardbtn\.is-contextual/);
  assert.match(taskStyles,/\.loop-idp \.loop-idp__crumb-task,\s*[\s\S]*display:\s*inline-flex;[\s\S]*gap:\s*6px/);
  assert.match(taskStyles,/\.loop-idp \.loop-idp__crumb-task \.loop-idp__crumb-title,[\s\S]*text-overflow:\s*ellipsis;[\s\S]*white-space:\s*nowrap/);
  assert.match(taskStyles,/\.loop-idp \.loop-idp__crumb-ellipsis\s*\{[\s\S]*width:\s*24px;[\s\S]*color:\s*var\(--eva-text-secondary-accessible\)/);
  assert.match(taskStyles,/\.loop-idp button\.loop-idp__crumb-task:hover,[\s\S]*color:\s*var\(--eva-action-primary\)/);
  assert.match(taskStyles,/\.loop-idp button\.loop-idp__crumb-cur:focus-visible\s*\{[\s\S]*outline:\s*var\(--eva-border-focus-w\) solid var\(--eva-border-focus\)/);
});
