import assert from 'node:assert/strict';
import test from 'node:test';
import { createPatchedRuntime } from '../tools/build-runtime.mjs';

const source = createPatchedRuntime().source;

test('任务身份公共选择器面板支持搜索、分组上限与滚动', () => {
  const pickerStart = source.indexOf('function AssigneePicker(');
  const pickerEnd = source.indexOf('function AssigneeBadge(', pickerStart);
  assert.ok(pickerStart >= 0 && pickerEnd > pickerStart);
  const picker = source.slice(pickerStart, pickerEnd);
  assert.match(picker, /eva-task-assignee-search/, '面板顶部应有搜索框');
  assert.match(picker, /St\.length>5&&React\.createElement\("div",\{className:"eva-task-assignee-search"/, '候选不超过一组上限时隐藏搜索框');
  assert.match(picker, /normalize\("NFKC"\)\.toLocaleLowerCase\(\)/, '检索按 NFKC 归一后做名称匹配');
  assert.match(picker, /未找到匹配的联系人或 AI/, '检索无结果应有空提示');
  assert.match(picker, /eva-task-assignee-scroll/, '面板内容应限高滚动');
  assert.match(picker, /展开其余 "/, '每组默认 5 条，超出显示展开入口');
  assert.match(picker, /"联系人"/, '分组标题对齐统一提及候选规范');
  assert.match(picker, /ArrowDown/, '支持 ↑↓/Enter 键盘选择');
  assert.match(picker, /isComposing\|\|229===evaEvent\.keyCode/, '输入法组词期间不过滤不重排');
  assert.match(picker, /candidates:evaTaskCandidateOverride/, '支持父容器传入候选覆盖');
});

test('任务列表与详情均复用公共选择器，旧 Loop 项目页死代码已移除', () => {
  const listStart = source.indexOf('function IssueList(');
  const listEnd = source.indexOf('const listSubscribers=', listStart);
  const taskList = source.slice(listStart, listEnd);
  assert.equal((taskList.match(/React\.createElement\(AssigneePicker,/g) || []).length, 2,
    '任务列表逐项指派与批量指派都应复用公共选择器');
  const detailStart = source.indexOf('function IssueDetailPage(');
  const detailEnd = source.indexOf('function readView(', detailStart);
  assert.match(source.slice(detailStart, detailEnd), /React\.createElement\(AssigneePicker,\{size:"small",candidates:evaTaskProjectIdentities\(xt\.workspace_id\|\|currentSpaceId\(\),"member"\),value:xt\.assignee_id/);
  assert.doesNotMatch(source, /function ProjectPage\(/, '不可达的旧 Loop 项目页已删除');
  assert.doesNotMatch(source, /loop-project-list/, '旧 Loop 项目列表标记不再存在');
});
