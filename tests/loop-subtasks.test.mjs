import {attachTaskScope} from './helpers/task-scope.mjs';
import {attachTaskSubscriptions} from './helpers/task-subscriptions.mjs';
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
  // 切片内含有图标定义（EvaLinkIcon 等），裸 vm 上下文补齐其工厂依赖；仅提供桩，不断言图标行为。
  const store={isProjectArchived:()=>false,actorId:()=> 'u-wangyilin',snapshot:()=>({actorId:'u-wangyilin'}),person:()=>({name:'王宜林'})};
  const ctx = {currentSpaceId:()=> 'prod',issuesOf:()=>issues,Date,createLucideIcon:(name)=>({name}),evaMembers:()=>({store})};
  const helperStart = runtime.indexOf('function evaIssueChildrenOf(');
  const helperEnd = runtime.indexOf('const EvaHierarchyIcon=', helperStart);
  assert.ok(helperStart >= 0 && helperEnd > helperStart);
  attachTaskSubscriptions(ctx);
  attachTaskScope(ctx,runtime);
  vm.runInNewContext(runtime.slice(helperStart, helperEnd), ctx);
  const statusHelperStart = runtime.indexOf('function evaNormalizeTaskStatus');
  const statusHelperEnd = runtime.indexOf('function evaNormalizeTaskList', statusHelperStart);
  assert.ok(statusHelperStart >= 0 && statusHelperEnd > statusHelperStart);
  vm.runInNewContext(runtime.slice(statusHelperStart, statusHelperEnd), ctx);
  vm.runInNewContext(assignment('evaTaskActivityActor', ',updateIssue='), ctx);
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
test('项目归档拒绝任务更新和单项及批量删除且不修改历史状态',async()=>{
 const {ctx,issues}=setup();ctx.evaMembers().store.isProjectArchived=()=>true;const before=JSON.stringify(issues);
 await assert.rejects(ctx.updateIssue('peer',{status:'done'}),/已归档/);
 await assert.rejects(ctx.deleteIssue('peer'),/已归档/);
 await assert.rejects(ctx.batchDeleteIssues(['peer']),/已归档/);
 await assert.rejects(ctx.batchUpdateIssues(['peer'],{status:'done'}),/已归档/);
 assert.equal(JSON.stringify(issues),before);
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
  for(const issue of issues)assert.ok(issue.due_date===null||/^2026-\d{2}-\d{2}$/.test(issue.due_date),issue.identifier+': 截止日期格式');
});

test('直接子任务进度不计入孙任务，取消不计入已完成，修改后立即重算',()=>{
  const {ctx,issues}=setup();
  assert.deepEqual(JSON.parse(JSON.stringify(ctx.evaIssueChildProgress('root',issues))),{done:0,total:1});
  issues.push({id:'cancelled',parent_issue_id:'root',status:'cancelled'});
  assert.deepEqual(JSON.parse(JSON.stringify(ctx.evaIssueChildProgress('root',issues))),{done:0,total:2});
  issues.find(i=>i.id==='child').status='done';
  assert.deepEqual(JSON.parse(JSON.stringify(ctx.evaIssueChildProgress('root',issues))),{done:1,total:2});
  assert.deepEqual(JSON.parse(JSON.stringify(ctx.evaIssueChildProgress('grandchild',issues))),{done:0,total:0});
});

test('任务祖先链按根任务到直接父任务排序，并在异常循环关系下安全终止',()=>{
  const {ctx,issues}=setup();
  assert.deepEqual(Array.from(ctx.evaIssueAncestorChain(issues.find(issue=>issue.id==='grandchild'),issues),issue=>issue.id),['root','child']);
  issues.find(issue=>issue.id==='root').parent_issue_id='grandchild';
  assert.deepEqual(Array.from(ctx.evaIssueAncestorChain(issues.find(issue=>issue.id==='grandchild'),issues),issue=>issue.id),['root','child']);
});

test('任务面包屑完整保留所有祖先',()=>{
  const {ctx}=setup(),issues=[
    {id:'root',identifier:'SC-101',title:'根任务',parent_issue_id:null},
    {id:'level-1',identifier:'SC-102',title:'一级任务',parent_issue_id:'root'},
    {id:'level-2',identifier:'SC-103',title:'二级任务',parent_issue_id:'level-1'},
    {id:'level-3',identifier:'SC-104',title:'三级任务',parent_issue_id:'level-2'},
    {id:'current',identifier:'SC-105',title:'当前任务',parent_issue_id:'level-3'},
  ];
  assert.deepEqual(Array.from(ctx.evaIssueBreadcrumbChain(issues[4],issues),issue=>issue.id),['root','level-1','level-2','level-3','current']);
  assert.deepEqual(Array.from(ctx.evaIssueBreadcrumbChain(issues[1],issues),issue=>issue.id),['root','level-1']);
});

test('层级、看板、分组、列表和详情均接入统一父子任务运行时',()=>{
  assert.ok(runtime.includes('["board","grouped","list","hierarchy"]'));
  assert.ok(runtime.includes('className:"eva-loop-subtasks__head"'));
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
  assert.ok(runtime.includes('Qt.boardOrdered(ct,rt)'));
  assert.ok(runtime.includes('React.createElement("em",null,Vt.length)'));
  assert.ok(runtime.includes('...EVA_BOARD_CARD_DISPLAY,draggable:!evaMembers().store.isProjectArchived(currentSpaceId())'));
  assert.ok(runtime.includes('evaShowStatus&&React.createElement("span",{className:"loop-card__icon",title:xt("loop.status."+rt.status)'));
  assert.ok(runtime.includes('evaShowDates&&React.createElement("time",{className:"loop-card__time"'));
  assert.ok(runtime.includes('evaShowDates&&rt.due_date&&React.createElement("span",{className:"loop-card__due"'));
  assert.ok(runtime.includes('pt&&React.createElement(EvaIssueRelationMeta,{issue:rt})'));
  assert.equal(runtime.includes('EvaBoardSubtask'),false);
  assert.equal(runtime.includes('showSubtasks'),false);
  assert.doesNotMatch(taskStyles,/eva-board-subtask|eva-board-subtasks|eva-board-col-count|eva-loop-board--subtasks/);
  assert.match(taskStyles,/\.loop-card \.eva-issue-relation\s*\{[\s\S]*background:\s*var\(--eva-surface-subtle\)/);
  assert.match(taskStyles,/\.eva-loop-list__task\s*\{[\s\S]*flex-direction:\s*column/);
  assert.match(taskStyles,/--eva-task-columns:\s*16px 76px minmax\(180px,1fr\) minmax\(0,120px\) 140px 210px 120px/);
  assert.match(taskStyles,/\.loop-list__due\s*\{\s*grid-column:\s*5/);
  assert.match(taskStyles,/\.loop-list__assignee\s*\{\s*grid-column:\s*6/);
  assert.match(taskStyles,/\.loop-list__row\.is-subtask \.eva-loop-list__task::before/);
  assert.match(taskStyles,/\.eva-issue-relation__track > span\s*\{[\s\S]*background:\s*var\(--eva-action-primary\)/);
  assert.match(taskStyles,/\.eva-issue-hierarchy__due\s*\{[\s\S]*white-space:\s*nowrap/);
});

test('任务详情只呈现直接子任务列表，移除递归树与重复空状态入口',()=>{
  assert.ok(runtime.includes('function EvaIssueDetailSubtasks('));
  assert.ok(runtime.includes('evaIssueChildProgress(rootIssue.id,allIssues)'));
  assert.ok(runtime.includes('evaIssueChildrenOf(rootIssue.id,allIssues)'));
  assert.ok(runtime.includes('添加子任务'));
  assert.ok(runtime.includes('aria-expanded'));
  for(const obsolete of ['EvaIssueDetailSubtaskTree','evaIssueDefaultCollapsedIds','evaDetailSubtaskIds','开始分解','eva-loop-subtask-tree','eva-loop-subtasks__empty'])assert.equal(runtime.includes(obsolete),false,obsolete);
  assert.doesNotMatch(taskStyles,/eva-loop-subtask-tree|eva-loop-subtasks__empty|eva-loop-subtasks__progress/);
});

test('任务详情通过完整 Semi 面包屑原位切换详情',()=>{
  assert.ok(runtime.includes('function evaIssueAncestorChain('));
  assert.ok(runtime.includes('function evaIssueBreadcrumbChain('));
  assert.ok(runtime.includes('evaBreadcrumbIssues=evaIssueBreadcrumbChain(xt)'));
  assert.ok(runtime.includes('React.createElement(evaForms.TaskBreadcrumb,'));
  assert.ok(runtime.includes('...evaBreadcrumbIssues.map(issue=>'));
  assert.equal(runtime.includes('evaBreadcrumbHasHiddenAncestors'),false);
  assert.ok(runtime.includes('evaTaskNavigation().open(React.createElement(IssueDetailPage,{key:ki,issueId:ki,onChanged:ct,breadcrumbViewport:evaBreadcrumbViewport.current}),true)'));
  assert.ok(runtime.includes('Qa=()=>{if(evaTaskDetail){evaTaskNavigation().close();return}'));
  assert.equal(runtime.includes('replaceFleetIssueDeepLink(Wi,no.identifier)'),false,'层级切换不再修改来源路由');
  assert.ok(runtime.includes('React.createElement(EvaIssueDetailSubtasks,{key:xt.id,rootIssue:xt,onOpen:Ea,readOnly:Ct'));
  assert.ok(runtime.includes('parentIssueId:evaChildParent?.id||rt'));
  assert.equal(runtime.includes('"开始分解"'),false);
  assert.ok(runtime.includes('className:"loop-idp__prop loop-idp__prop--inline loop-idp__prop--due"'));
  assert.ok(runtime.includes('window.EvaLoopTaskComponents.dateField(React,DatePicker,{className:"loop-idp__due-picker"'),
    '详情截止日期应使用任务公共日期字段，保留选择与清空能力');
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
});

test('表格进度只计算直接子任务且不受视图筛选影响',()=>{
  const source=fs.readFileSync('prototype/062-loop-table-view.js','utf8');
  const start=source.indexOf('      const descendantIds=')>=0?source.indexOf('      const descendantIds='):source.indexOf('      const progressOf=');
  const end=source.indexOf('      const hideIds=',start);
  const allIssues=[{id:'child',parent_issue_id:'root',status:'todo'},{id:'grand',parent_issue_id:'child',status:'done'},{id:'cancel',parent_issue_id:'root',status:'cancelled'}];
  const childMap=new Map([['root',[allIssues[0],allIssues[2]]],['child',[allIssues[1]]]]);
  const ctx={allIssues,childMap};
  vm.runInNewContext(source.slice(start,end)+';globalThis.result=progressOf("root");',ctx);
  assert.deepEqual(JSON.parse(JSON.stringify(ctx.result)),{done:0,total:2});
});
