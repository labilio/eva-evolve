import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';
import vm from 'node:vm';

const source = readFileSync(new URL('../prototype/063-task-time.js', import.meta.url), 'utf8');
const context = { Date };
context.window = context;
vm.runInNewContext(source, context);
const time = context.EvaTaskTime;

test('task activity uses calendar-day boundaries and reveals the year across New Year', () => {
  const now = new Date(2026, 0, 1, 9, 0);
  assert.equal(time.activity('2026-01-01T08:15:00', now), '今天 08:15');
  assert.equal(time.activity('2025-12-31T23:30:00', now), '昨天 23:30');
  assert.equal(time.activity('2025-12-30T17:00:00', now), '2025-12-30 17:00');
  assert.equal(time.activity('2026-02-03T17:00:00', now), '02-03 17:00');
});

test('compact task dates show a cross-year year and timestamps keep local time', () => {
  const now = new Date(2026, 8, 28, 12, 0);
  assert.equal(time.compactDate('2026-09-12', now), '09-12');
  assert.equal(time.compactDate('2025-12-31', now), '2025-12-31');
  assert.equal(time.fullDate('2026-09-12'), '2026-09-12');
  assert.equal(time.fullTimestamp('2026-09-28T08:15:00'), '2026-09-28 08:15');
  assert.equal(time.compactTimestamp('2026-09-28T08:15:00', now), '08:15');
  assert.equal(time.compactTimestamp('2026-09-27T08:15:00', now), '昨天');
  assert.equal(time.compactTimestamp('2025-09-28T08:15:00', now), '2025-09-28');
});

test('date-only values never shift with a timezone and invalid values are empty', () => {
  assert.equal(time.fullDate('2026-01-01'), '2026-01-01');
  assert.equal(time.fullDate('2026-02-30'), '');
  assert.equal(time.fullTimestamp('invalid'), '');
  assert.equal(time.compactDate(null), '');
});

test('a due date is overdue only before the viewer\'s current calendar day', () => {
  const lateToday = new Date(2026, 8, 28, 23, 59);
  assert.equal(time.isPastDate('2026-09-28', lateToday), false);
  assert.equal(time.isPastDate('2026-09-27', lateToday), true);
  assert.equal(time.isPastDate('2026-09-29', lateToday), false);
  assert.equal(time.isPastDate('invalid', lateToday), false);
});
