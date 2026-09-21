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
  const store = {taskIssuer:()=>({issuer_role_id:null,issuer_role_name:null}),snapshot:()=>({actorId:'member',people:[{id:'owner',name:'项目所有者'},{id:'member',name:'当前成员'},{id:'outsider',name:'外部联系人'}],clones:[{id:'clone',name:'成员分身'},{id:'clone2',name:'未入项目分身'}],projects:{prod:scope,q:scope}}),canRead:()=>true,person:id=>['owner','member'].includes(id)?({id,name:'当前成员'}):null,clone:id=>id==='clone'?({id,name:'成员分身'}):null,employee:id=>id==='employee'?({id,name:'数字员工'}):null,projectAgent:pid=>({id:'project-agent:'+pid,name:'项目专员'})};
  const ctx = {ISSUES_BY_SPACE:lists,loadSpaces:()=>projects,currentSpaceId:()=>current,evaMembers:()=>({store}),evaProjectIssuePrefix:p=>p.issue_prefix,evaLoopTaskAttachments:new Map(),window:{},MOCK_ISSUES:[{run_id:'should-not-copy',labels:['old']}],issuesOf:()=>lists[current]};
  const helperStart=runtime.indexOf('function evaNormalizeTaskStatus'),helperEnd=runtime.indexOf('function evaNormalizeTaskList',helperStart);
  vm.runInNewContext(runtime.slice(helperStart,helperEnd),ctx);
  vm.runInNewContext(runtime.slice(start,end),ctx);
  const ga=runtime.indexOf('getIssue=rt=>{'),gb=runtime.indexOf('},',ga)+1;
  assert.ok(ga>=0&&gb>ga);vm.runInNewContext(runtime.slice(ga,gb),ctx);
  // 来源者为必填字段，可选联系人、AI 分身或数字员工；这些回归只覆盖原有字段，统一补一个合法来源者。
  const rawCreateIssue=ctx.createIssue;
  ctx.createIssue=payload=>rawCreateIssue({source_id:'owner',...payload});
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
test('负责人只能是本项目联系人，验收人必须是项目联系人',async()=>{
 const s=setup();for(const id of ['owner','member'])assert.equal((await s.ctx.createIssue({title:'任务',assignee_id:id,reviewer_id:'owner'})).assignee_id,id);
 for(const id of ['clone','employee','project-agent:prod','outsider'])await assert.rejects(s.ctx.createIssue({title:'任务',assignee_id:id}),/负责人/);
 await assert.rejects(s.ctx.createIssue({title:'任务',reviewer_id:'clone'}),/验收人/);
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
test('创建者默认创建者本人，可指定为任何联系人、AI 分身或数字员工',async()=>{
 const s=setup();const self=await s.ctx.createIssue({title:'任务0'});assert.equal(self.creator_id,'member');assert.equal(self.creator_type,'member');
 const a=await s.ctx.createIssue({title:'任务',creator_id:'clone'});assert.equal(a.creator_id,'clone');assert.equal(a.creator_type,'agent');assert.equal(a.creator_name,'成员分身');
 const b=await s.ctx.createIssue({title:'任务2',creator_id:'employee'});assert.equal(b.creator_type,'agent');assert.equal(b.creator_name,'数字员工');
 await assert.rejects(s.ctx.createIssue({title:'任务3',creator_id:'unknown'}),/创建者/);
});
test('来源者与创建者可为任何联系人，但 AI 分身与数字员工必须已加入项目',async()=>{
 const s=setup();
 const a=await s.ctx.createIssue({title:'任务',source_id:'outsider',creator_id:'outsider'});assert.equal(a.source_type,'member');assert.equal(a.creator_type,'member');
 const b=await s.ctx.createIssue({title:'任务2',source_id:'clone',creator_id:'employee'});assert.equal(b.source_type,'agent');assert.equal(b.creator_type,'agent');assert.equal(b.source_name,'成员分身');assert.equal(b.creator_name,'数字员工');
 await assert.rejects(s.ctx.createIssue({title:'任务3',source_id:'clone2'}),/来源者/);
 await assert.rejects(s.ctx.createIssue({title:'任务4',creator_id:'clone2'}),/创建者/);
 await assert.rejects(s.ctx.createIssue({title:'任务5',source_id:'unknown'}),/来源者/);
 await assert.rejects(s.ctx.createIssue({title:'任务6',creator_id:'unknown'}),/创建者/);
});
test('负责人显示信息从身份数据确定，不接受伪造身份名称和类型',async()=>{
 const s=setup();const a=await s.ctx.createIssue({title:'任务',assignee_id:'member',assignee_type:'agent',assignee_name:'其他人'});assert.equal(a.assignee_name,'当前成员');assert.equal(a.assignee_type,'member');
});
