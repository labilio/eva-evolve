(function (root) {
  'use strict';
  const now = new Date();
  const taskToday = new Date(now);
  taskToday.setSeconds(0, 0);
  const taskYesterday = new Date(now);
  taskYesterday.setDate(taskYesterday.getDate() - 1);
  taskYesterday.setHours(15, 19, 0, 0);
  root.__EVA_DEMO_TIME = Object.freeze({
    AUTOMATION_RECENT: '2026-09-08T09:00:00+08:00',
    AUTOMATION_PREVIOUS: '2026-09-07T09:00:00+08:00',
    AUTOMATION_NEXT: '2026-09-09T09:00:00+08:00',
    T0: '2026-08-28T09:00:00Z',
    AI_REVIEW_START: '2026-09-05T18:00:00+08:00',
    T1: '2026-09-02T17:30:00Z',
    TASK_TODAY: taskToday.toISOString(),
    TASK_YESTERDAY: taskYesterday.toISOString()
  });
})(window);
