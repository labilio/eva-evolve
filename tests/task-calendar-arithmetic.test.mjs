import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';
import test from 'node:test';

const context = vm.createContext({ window: {} });
vm.runInContext(readFileSync(new URL('../prototype/063-task-time.js', import.meta.url), 'utf8'), context);
const time = context.window.EvaTaskTime;

test('task calendar weeks start on Monday, including Sunday and cross-year dates', () => {
  assert.equal(typeof time.weekStart, 'function');
  assert.equal(time.weekStart('2026-10-12'), '2026-10-12');
  assert.equal(time.weekStart('2026-10-18'), '2026-10-12');
  assert.equal(time.weekStart('2027-01-01'), '2026-12-28');
  assert.equal(time.weekStart('invalid'), null);
});

test('calendar shifts cross leap days, year boundaries and DST without changing duration', () => {
  assert.equal(typeof time.addCalendarDays, 'function');
  for (const [date, delta, expected] of [
    ['2024-02-28', 1, '2024-02-29'],
    ['2025-02-28', 1, '2025-03-01'],
    ['2026-12-31', 1, '2027-01-01'],
    ['2026-01-01', -1, '2025-12-31'],
    ['2026-03-07', 2, '2026-03-09'],
    ['2026-10-31', 2, '2026-11-02'],
  ]) assert.equal(time.addCalendarDays(date, delta), expected);
});

test('inclusive task durations include the due day and reject reversed or incomplete ranges', () => {
  assert.equal(typeof time.calendarDuration, 'function');
  assert.equal(time.calendarDuration('2026-10-15', '2026-10-15'), 1);
  assert.equal(time.calendarDuration('2024-02-28', '2024-03-01'), 3);
  assert.equal(time.calendarDuration('2026-03-07', '2026-03-09'), 3);
  assert.equal(time.calendarDuration('2026-10-20', '2026-10-15'), null);
  assert.equal(time.calendarDuration(null, '2026-10-15'), null);
});

test('invalid calendar input cannot roll into another month or become a timestamp', () => {
  assert.equal(typeof time.calendarDay, 'function');
  for (const date of ['', null, '2025-02-29', '2026-13-01', '2026-10-15T00:00:00Z']) {
    assert.equal(time.calendarDay(date), null);
    assert.equal(time.addCalendarDays(date, 1), null);
  }
  assert.equal(time.calendarDay('1970-01-01'), 0);
  assert.equal(time.addCalendarDays('2026-10-15', 0.5), null);
  assert.equal(time.addCalendarDays('2026-10-15', Infinity), null);
});
