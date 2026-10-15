import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';
import test from 'node:test';

const context = vm.createContext({ window: {} });
for (const file of ['063-task-time.js', '062-loop-task-components.js']) {
  vm.runInContext(readFileSync(new URL('../prototype/' + file, import.meta.url), 'utf8'), context);
}
const task = context.window.EvaLoopTaskComponents;
const plain = value => JSON.parse(JSON.stringify(value));

test('blank-row scheduling uses the pointed calendar day and Plane inclusive default span', () => {
  assert.equal(typeof task.scheduleAt, 'function');
  assert.deepEqual(plain(task.scheduleAt('2026-09-28',125,60,'week')), {start_date:'2026-09-30',due_date:'2026-10-01'});
  assert.deepEqual(plain(task.scheduleAt('2026-09-28',45,20,'month')), {start_date:'2026-09-30',due_date:'2026-10-01'});
  assert.deepEqual(plain(task.scheduleAt('2026-09-28',13,5,'quarter')), {start_date:'2026-09-30',due_date:'2026-10-07'});
  assert.equal(task.scheduleAt('invalid',0,60,'week'),null);
  assert.equal(task.scheduleAt('2026-09-28',0,0,'week'),null);
});

test('Gantt places a complete schedule inclusively and leaves unscheduled tasks unpositioned', () => {
  assert.equal(typeof task.schedulePosition, 'function');
  assert.deepEqual(plain(task.schedulePosition({ start_date: '2026-10-15', due_date: '2026-10-17' }, '2026-10-14', 40)), { left: 40, width: 120, duration: 3 });
  assert.equal(task.schedulePosition({}, '2026-10-14', 40), null);
  assert.equal(task.schedulePosition({ start_date: '2026-10-17', due_date: '2026-10-15' }, '2026-10-14', 40), null);
});

test('half schedules retain a fixed width and anchor the existing date to the correct edge', () => {
  assert.equal(typeof task.schedulePosition, 'function');
  assert.deepEqual(plain(task.schedulePosition({ start_date: '2026-10-15' }, '2026-10-14', 40)), { left: 40, width: 60, duration: null });
  assert.deepEqual(plain(task.schedulePosition({ due_date: '2026-10-15' }, '2026-10-14', 40)), { left: 20, width: 60, duration: null });
  // A due-only item ending on the first day still ends at that day's right edge.
  assert.deepEqual(plain(task.schedulePosition({ due_date: '2026-10-14' }, '2026-10-14', 40)), { left: -20, width: 60, duration: null });
});

test('moving schedules writes only dates, preserves duration and never mutates the source task', () => {
  assert.equal(typeof task.scheduleChange, 'function');
  const issue = Object.freeze({ id: 'supply-1', position: 8, status: 'todo', start_date: '2026-12-30', due_date: '2026-12-31' });
  assert.deepEqual(plain(task.scheduleChange(issue, 'move', 2, 40)), { start_date: '2027-01-01', due_date: '2027-01-02' });
  assert.deepEqual(plain(task.scheduleChange({ due_date: '2026-10-15' }, 'move', 2, 40)), { due_date: '2026-10-17' });
  assert.deepEqual(plain(task.scheduleChange({ start_date: '2026-10-15' }, 'move', -1, 40)), { start_date: '2026-10-14' });
});

test('resizing clamps at one day and only fills a missing date when its edge is dragged', () => {
  assert.equal(typeof task.scheduleChange, 'function');
  const issue = { start_date: '2026-10-15', due_date: '2026-10-17' };
  assert.deepEqual(plain(task.scheduleChange(issue, 'left', 5, 40)), { start_date: '2026-10-17', due_date: '2026-10-17' });
  assert.deepEqual(plain(task.scheduleChange(issue, 'right', -5, 40)), { start_date: '2026-10-15', due_date: '2026-10-15' });
  assert.deepEqual(plain(task.scheduleChange({ start_date: '2026-10-15' }, 'left', 2, 40)), { start_date: '2026-10-17' });
  assert.deepEqual(plain(task.scheduleChange({ due_date: '2026-10-15' }, 'right', 2, 40)), { due_date: '2026-10-17' });
  assert.deepEqual(plain(task.scheduleChange({ start_date: '2026-10-15' }, 'right', 1, 40)), { start_date: '2026-10-15', due_date: '2026-10-17' });
  assert.deepEqual(plain(task.scheduleChange({ due_date: '2026-10-15' }, 'left', -1, 40)), { start_date: '2026-10-14', due_date: '2026-10-15' });
  assert.equal(task.scheduleChange({}, 'move', 1, 40), null);
});
