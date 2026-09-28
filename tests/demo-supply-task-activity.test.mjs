import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';

test('supply task activity tells consistent stories with real project identities', () => {
  const window = {};
  for (const name of ['009-0-demo-time', '009-1-data-drive', '009-2-data-supply']) {
    vm.runInNewContext(fs.readFileSync(`prototype/${name}.js`, 'utf8'), {window});
  }
  const issues = window.__EVA_SUPPLY_CHAIN_DEMO.issues;
  const people = new Map(window.__EVA_PEOPLE.map(person => [person.id, person.name]));
  const seeded = issues.filter(issue => issue.activity_log?.length);
  assert.equal(seeded.length, 34);
  assert.equal(seeded.length, issues.length);

  const eventIds = new Set();
  for (const issue of seeded) {
    const activity = issue.activity_log;
    assert.equal(activity[0].action, 'created', issue.identifier);
    assert.equal(activity[0].actor_id, issue.creator_id, issue.identifier);
    assert.equal(activity[0].created_at, issue.created_at, issue.identifier);
    let lastTime = -Infinity;
    const fieldValues = new Map();
    let status = 'todo';
    for (const entry of activity) {
      assert.equal(entry.issue_id, issue.id);
      assert.equal(entry.actor_type, 'member');
      assert.equal(entry.actor_name, people.get(entry.actor_id), entry.id);
      assert.ok(!eventIds.has(entry.id), entry.id);
      eventIds.add(entry.id);
      const time = Date.parse(entry.created_at);
      assert.ok(time > lastTime && time <= Date.parse(issue.updated_at), entry.id);
      lastTime = time;
      const field = ({status_changed: 'status', priority_changed: 'priority', assignee_changed: 'assignee_id', due_date_changed: 'due_date'})[entry.action];
      if (!field) continue;
      if (fieldValues.has(field)) assert.equal(entry.details.from, fieldValues.get(field), entry.id);
      if (field === 'status') {
        assert.equal(entry.details.from, status, entry.id);
        status = entry.details.to;
      }
      fieldValues.set(field, entry.details.to);
    }
    for (const [field, value] of fieldValues) assert.equal(issue[field], value, `${issue.identifier}: ${field}`);
    assert.equal(status, issue.status, issue.identifier);
  }
  for (const identifier of ['SC-102', 'SC-103', 'SC-107', 'SC-121', 'SC-131']) {
    assert.ok(seeded.find(issue => issue.identifier === identifier).activity_log.length >= 2);
  }
  const reviewTask = seeded.find(issue => issue.identifier === 'SC-109');
  const statusChanges = reviewTask.activity_log.filter(entry => entry.action === 'status_changed');
  const localDay = value => new Date(value).toDateString();
  const reference = new Date(window.__EVA_DEMO_TIME.TASK_VIEW_NOW);
  const yesterday = new Date(reference);
  yesterday.setDate(yesterday.getDate() - 1);
  const primaryTask = seeded.find(issue => issue.identifier === 'SC-103');
  const recentPrimary = primaryTask.activity_log.slice(-2);
  assert.equal(recentPrimary.map(entry => entry.action).join(','), 'description_updated,description_updated');
  assert.equal(localDay(recentPrimary[0].created_at), localDay(yesterday), 'SC-103 should show 昨天');
  assert.equal(localDay(recentPrimary[1].created_at), localDay(reference), 'SC-103 should show 今天');
  assert.equal(primaryTask.updated_at, recentPrimary[1].created_at);
  assert.equal(primaryTask.status, 'in_progress');
  assert.equal(primaryTask.due_date, '2026-09-15');
  assert.equal(localDay(statusChanges.at(-2).created_at), localDay(yesterday), 'review sample should show 昨天');
  assert.equal(localDay(statusChanges.at(-1).created_at), localDay(reference), 'review sample should show 今天');
  assert.equal(reviewTask.updated_at, statusChanges.at(-1).created_at);
  for (const project of [window.__EVA_DRIVE_DEMO.issues, window.__EVA_OFFICIAL_TASKS, window.__EVA_CLIENT_TASKS]) {
    assert.ok(project.every(issue => !issue.activity_log?.length));
  }
});
