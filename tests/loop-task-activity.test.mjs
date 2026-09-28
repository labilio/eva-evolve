import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import {createPatchedRuntime} from '../tools/build-runtime.mjs';

const source = createPatchedRuntime().source;
const updateStart = source.indexOf('evaTaskActivityActor=()=>');
const updateEnd = source.indexOf(',previewIssueTrigger=', updateStart);
const timelineStart = source.indexOf('listTimeline=rt=>');
const timelineEnd = source.indexOf(',resolveComment=', timelineStart);
assert.ok(updateStart >= 0 && updateEnd > updateStart);
assert.ok(timelineStart >= 0 && timelineEnd > timelineStart);

function setup() {
  const issue = {
    id: 'supply-3', workspace_id: 'prod', title: '来料异常',
    status: 'todo', priority: 'medium', assignee_id: 'u-zhouyuan',
    assignee_name: '周远', due_date: null, activity_log: [],
  };
  const issues = [issue];
  const people = {
    'u-wangyilin': {id: 'u-wangyilin', name: '王宜林'},
    'u-zhouyuan': {id: 'u-zhouyuan', name: '周远'},
    'u-linxiao': {id: 'u-linxiao', name: '林晓'},
  };
  const store = {
    snapshot: () => ({actorId: 'u-wangyilin', projects: {prod: {humans: Object.values(people)}}}),
    person: id => people[id],
  };
  const ctx = {
    issuesOf: () => issues, currentSpaceId: () => 'prod',
    evaMembers: () => ({store}),
    evaNormalizeTaskStatus: status => status === 'backlog' ? 'todo' : status,
    evaIssueDescendantIds: () => new Set(),
    evaResolveTaskIdentity: id => people[id] && {type: 'member', name: people[id].name},
  };
  vm.runInNewContext('var ' + source.slice(updateStart, updateEnd), ctx);
  vm.runInNewContext('var ' + source.slice(timelineStart, timelineEnd), ctx);
  return {ctx, issue, issues};
}

test('only real task field changes produce attributed activity with old and new values', async () => {
  const {ctx, issue} = setup();
  await ctx.updateIssue(issue.id, {status: 'backlog', priority: 'medium'});
  assert.equal(issue.activity_log.length, 0);
  await ctx.updateIssue(issue.id, {
    status: 'in_progress', priority: 'high', due_date: '2026-10-01',
    assignee_id: 'u-linxiao',
  });
  assert.deepEqual(issue.activity_log.map(entry => entry.action), [
    'status_changed', 'priority_changed', 'assignee_changed', 'due_date_changed',
  ]);
  assert.deepEqual({...issue.activity_log[0].details}, {from: 'todo', to: 'in_progress'});
  assert.deepEqual({...issue.activity_log[2].details}, {
    from: 'u-zhouyuan', to: 'u-linxiao', from_name: '周远', to_name: '林晓',
  });
  assert.ok(issue.activity_log.every(entry =>
    entry.issue_id === issue.id && entry.actor_id === 'u-wangyilin' &&
    entry.actor_name === '王宜林' && entry.created_at));
});

test('timeline reads only the current project task and new tasks start empty', async () => {
  const {ctx, issue, issues} = setup();
  assert.equal((await ctx.listTimeline(issue.id)).length, 0);
  await ctx.updateIssue(issue.id, {title: '来料异常复核'});
  assert.equal((await ctx.listTimeline(issue.id)).length, 1);
  issues.splice(0, issues.length, {id: 'another-project-task'});
  assert.equal((await ctx.listTimeline(issue.id)).length, 0);
});
