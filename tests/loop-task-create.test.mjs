import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import { createPatchedRuntime } from '../tools/build-runtime.mjs';
const runtime = createPatchedRuntime().source;
const start = runtime.indexOf('createIssue=rt=>{');
const end = runtime.indexOf('\n    }', start) + '\n    }'.length;
assert.ok(start >= 0 && end > start);
function setup() {
  let current = 'prod';
  const projects = [{id:'prod',name:'供应链',issue_prefix:'SC'},{id:'q',name:'其他项目',issue_prefix:'QA'}];
  const lists = {prod:[{id:'old',identifier:'SC-101',run_id:'old-run',description:'old description'}],q:[{id:'q-old',identifier:'QA-9'}]};
  const scope = {humans:[{id:'owner'},{id:'member'}],cloneIds:['clone'],employeeIds:['employee']};
  const store = {taskIssuer:()=>({issuer_role_id:null,issuer_role_name:null}),snapshot:()=>({actorId:'member',projects:{prod:scope,q:scope}}),canRead:()=>true,person:id=>['owner','member'].includes(id)?({id,name:'当前成员'}):null,clone:id=>id==='clone'?({id,name:'成员分身'}):null,employee:id=>id==='employee'?({id,name:'数字员工'}):null,projectAgent:pid=>({id:'project-agent:'+pid,name:'项目专员'})};
  const ctx = {ISSUES_BY_SPACE:lists,loadSpaces:()=>projects,currentSpaceId:()=>current,evaMembers:()=>({store}),evaProjectIssuePrefix:p=>p.issue_prefix,evaLoopTaskAttachments:new Map(),window:{},MOCK_ISSUES:[{run_id:'should-not-copy',labels:['old']}],issuesOf:()=>lists[current]};
  const helperStart=runtime.indexOf('function evaNormalizeTaskStatus'),helperEnd=runtime.indexOf('function evaNormalizeTaskList',helperStart);
  vm.runInNewContext(runtime.slice(helperStart,helperEnd),ctx);
  vm.runInNewContext(runtime.slice(start,end),ctx);
  const ga=runtime.indexOf('getIssue=rt=>{'),gb=runtime.indexOf('},',ga)+1;
  assert.ok(ga>=0&&gb>ga);vm.runInNewContext(runtime.slice(ga,gb),ctx);
  return {ctx,store,lists,setCurrent:id=>{current=id;}};
}
test('新任务写入明确指定项目，使用该项目前缀和序号，不污染当前其他项目',async()=>{
 const s=setup();const issue=await s.ctx.createIssue({workspace_id:'q',title:'  新任务  '});assert.equal(issue.workspace_id,'q');assert.equal(issue.identifier,'QA-10');assert.equal(issue.title,'新任务');assert.equal(s.lists.prod.length,1);assert.equal(s.lists.q.length,2);
});
test('兼容旧创建状态待规划，保存为待办',async()=>{
 const s=setup();const issue=await s.ctx.createIssue({workspace_id:'prod',title:'旧状态任务',status:'backlog'});assert.equal(issue.status,'todo');assert.equal(s.lists.q.length,1);
});
test('项目或权限无效、空标题均拒绝且不写入',async()=>{
 const s=setup();await assert.rejects(s.ctx.createIssue({workspace_id:'missing',title:'新任务'}),/项目/);s.store.canRead=()=>false;await assert.rejects(s.ctx.createIssue({title:'新任务'}),/项目/);s.store.canRead=()=>true;await assert.rejects(s.ctx.createIssue({title:'  '}),/任务名称/);assert.equal(s.lists.prod.length,1);
});
test('负责人限制为本项目人类分身员工或项目专员，验收人必须是项目人类',async()=>{
 const s=setup();for(const id of ['member','clone','employee','project-agent:prod'])assert.equal((await s.ctx.createIssue({title:'任务',assignee_id:id,reviewer_id:'owner'})).assignee_id,id);
 await assert.rejects(s.ctx.createIssue({title:'任务',assignee_id:'outsider'}),/负责人/);await assert.rejects(s.ctx.createIssue({title:'任务',reviewer_id:'clone'}),/验收人/);
});
test('父任务不能跨项目，合法子任务保留父引用',async()=>{
 const s=setup();await assert.rejects(s.ctx.createIssue({title:'任务',parent_issue_id:'q-old'}),/父任务/);const issue=await s.ctx.createIssue({title:'任务',parent_issue_id:'old'});assert.equal(issue.parent_issue_id,'old');
});
test('完整编号连续且详情按内部ID或完整编号可取，不回落到旧mock',async()=>{
 const s=setup();const a=await s.ctx.createIssue({title:'新任务'}),b=await s.ctx.createIssue({title:'新任务2'});assert.equal(a.identifier,'SC-102');assert.equal(b.identifier,'SC-103');assert.equal(await s.ctx.getIssue(a.id),a);assert.equal(await s.ctx.getIssue(a.identifier),a);await assert.rejects(s.ctx.getIssue('102'),/找不到/);s.setCurrent('q');await assert.rejects(s.ctx.getIssue(a.identifier),/找不到/);
});
test('新任务不继承旧mock运行标签与描述，记录当前创建者和时间',async()=>{
 const s=setup();const a=await s.ctx.createIssue({title:'任务'});assert.equal(a.run_id,undefined);assert.equal(a.labels,undefined);assert.equal(a.description,'');assert.equal(a.creator_id,'member');assert.equal(a.creator_name,'当前成员');assert.ok(!Number.isNaN(Date.parse(a.created_at)));assert.equal(a.status,'todo');assert.equal(a.due_date,null);
});
test('新任务保存明确截止日期',async()=>{
 const s=setup();const a=await s.ctx.createIssue({title:'任务',due_date:'2026-09-20'});assert.equal(a.due_date,'2026-09-20');
});
test('附件解析成详情引用与附件对象，未知ID不会复制旧附件',async()=>{
 const s=setup();const attachment={id:'f',name:'规格[最新版].pdf',url:'blob:example'};s.ctx.evaLoopTaskAttachments.set('f',attachment);const a=await s.ctx.createIssue({title:'任务',description:'需求',attachment_ids:['f','missing']});assert.equal(a.attachments.length,1);assert.equal(a.attachments[0],attachment);assert.match(a.description,/需求/);assert.match(a.description,/规格最新版.pdf/);assert.match(a.description,/blob:example/);
});
test('其他项目不接受来自供应链的看板项目归属',async()=>{
 const s=setup();const a=await s.ctx.createIssue({workspace_id:'q',project_id:'p-supply',title:'任务'});assert.notEqual(a.project_id,'p-supply');
});
test('负责人显示信息从身份数据确定，不接受伪造身份名称和类型',async()=>{
 const s=setup();const a=await s.ctx.createIssue({title:'任务',assignee_id:'member',assignee_type:'agent',assignee_name:'其他人'});assert.notEqual(a.assignee_name,'其他人');assert.notEqual(a.assignee_type,'agent');
});
