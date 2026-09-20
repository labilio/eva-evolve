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
  assert.match(picker, /className:"eva-task-assignee-search"/);
  assert.match(picker, /placeholder:"搜索指派人"/);
  assert.match(picker, /normalize\("NFKC"\)\.toLocaleLowerCase\(\)/);
  assert.match(picker, /onChange:setEvaQuery/);

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
