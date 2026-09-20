import assert from 'node:assert/strict';
import test from 'node:test';
import { createPatchedRuntime } from '../tools/build-runtime.mjs';

const source = createPatchedRuntime().source;

test('任务负责人公共选择器支持输入即筛选并保留非任务调用方', () => {
  const pickerStart = source.indexOf('function AssigneePicker(');
  const pickerEnd = source.indexOf('function AssigneeBadge(', pickerStart);
  assert.ok(pickerStart >= 0 && pickerEnd > pickerStart);
  const picker = source.slice(pickerStart, pickerEnd);
  assert.match(picker, /searchable:evaSearchable=!1/);
  assert.match(picker, /React\.createElement\(Select,\{className:"eva-loop-task-create__assignee"/,
    '任务内指派应复用新建任务的可输入 Select');
  assert.match(picker, /"aria-label":"执行负责人"/);
  assert.match(picker, /emptyContent:"没有匹配的指派人"/);
  assert.match(picker, /normalize\("NFKC"\)\.toLocaleLowerCase\(\)/);
  assert.match(picker, /evaTaskGroups=\[\{key:"member",label:gt\("loop\.assignee\.member"\)/);
  assert.match(picker, /\{key:"expert",label:gt\("loop\.assignee\.agent"\)/);
  assert.match(picker, /React\.createElement\(Select\.OptGroup/,
    '成员与专家应复用 Semi Select 的原生分组组件');
  assert.doesNotMatch(picker, /eva-task-assignee-search/,
    '任务内指派不应再保留独立的下拉搜索框');

  const listStart = source.indexOf('function IssueList(');
  const listEnd = source.indexOf('const listSubscribers=', listStart);
  const taskList = source.slice(listStart, listEnd);
  assert.equal((taskList.match(/AssigneePicker,\{searchable:!0/g) || []).length, 2,
    '任务列表逐项指派与批量指派都应开启搜索');

  const detailStart = source.indexOf('function IssueDetailPage(');
  const detailEnd = source.indexOf('function readView(', detailStart);
  assert.match(source.slice(detailStart, detailEnd), /AssigneePicker,\{searchable:!0,size:"small",value:xt\.assignee_id/);

  const projectStart = source.indexOf('function ProjectPage(');
  const projectEnd = source.indexOf('const AllApplication=', projectStart);
  assert.doesNotMatch(source.slice(projectStart, projectEnd), /AssigneePicker,\{searchable:!0/,
    '项目负责人选择器不属于本次任务指派范围');
});
