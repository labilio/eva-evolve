/* Task timestamps are instants in the viewer's local timezone. Task due dates are
 * calendar days (YYYY-MM-DD) and must never pass through local/UTC conversion. */
(function (root) {
  'use strict';
  const pad = value => String(value).padStart(2, '0');
  const monthDay = date => `${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
  const dateText = date => `${date.getFullYear()}-${monthDay(date)}`;
  const clock = date => `${pad(date.getHours())}:${pad(date.getMinutes())}`;
  const parseInstant = value => {
    if (!value) return null;
    const date = value instanceof Date ? value : new Date(value);
    return Number.isNaN(date.getTime()) ? null : date;
  };
  const referenceNow = () => parseInstant(root.__EVA_DEMO_TIME?.TASK_VIEW_NOW) || new Date();
  const parseDateOnly = value => {
    const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(String(value || ''));
    if (!match) return null;
    const year = Number(match[1]), month = Number(match[2]), day = Number(match[3]);
    const check = new Date(Date.UTC(year, month - 1, day));
    return check.getUTCFullYear() === year && check.getUTCMonth() + 1 === month && check.getUTCDate() === day
      ? { year, month, day } : null;
  };
  const dateOnlyText = (parts, withYear) => (withYear ? `${parts.year}-` : '') + `${pad(parts.month)}-${pad(parts.day)}`;
  // Integer calendar days keep task scheduling independent of local DST changes.
  const calendarDay = value => {
    const parts = parseDateOnly(value);
    return parts ? Date.UTC(parts.year, parts.month - 1, parts.day) / 86400000 : null;
  };
  const addCalendarDays = (value, offset) => {
    const day = calendarDay(value);
    if (day === null || !Number.isSafeInteger(offset)) return null;
    const date = new Date((day + offset) * 86400000);
    if (!Number.isFinite(date.getTime()) || date.getUTCFullYear() < 100 || date.getUTCFullYear() > 9999) return null;
    return `${String(date.getUTCFullYear()).padStart(4, '0')}-${pad(date.getUTCMonth() + 1)}-${pad(date.getUTCDate())}`;
  };
  const localDay = date => new Date(date.getFullYear(), date.getMonth(), date.getDate());
  const todayOrYesterday = (date, now) => {
    const today = localDay(now);
    const target = localDay(date);
    if (target.getTime() === today.getTime()) return 'today';
    today.setDate(today.getDate() - 1);
    return target.getTime() === today.getTime() ? 'yesterday' : '';
  };
  root.EvaTaskTime = Object.freeze({
    calendarDay,
    addCalendarDays,
    todayDate() { return dateText(referenceNow()); },
    scheduleError(issue, patch) {
      const fields = ['start_date', 'due_date'];
      if (!fields.some(field => Object.prototype.hasOwnProperty.call(patch, field))) return '';
      const next = {...issue, ...patch};
      for (const field of fields) {
        const value = next[field];
        if (value !== null && value !== undefined && value !== '' && calendarDay(value) === null)
          return (field === 'start_date' ? '开始日期' : '截止日期') + '无效，请选择有效日期';
      }
      const start = calendarDay(next.start_date), due = calendarDay(next.due_date);
      return start !== null && due !== null && start > due ? '开始日期不能晚于截止日期' : '';
    },
    weekStart(value) {
      const day = calendarDay(value);
      if (day === null) return null;
      const weekday = new Date(day * 86400000).getUTCDay();
      return addCalendarDays(value, -((weekday + 6) % 7));
    },
    calendarDuration(start, due) {
      const first = calendarDay(start), last = calendarDay(due);
      return first === null || last === null || last < first ? null : last - first + 1;
    },
    fullTimestamp(value) {
      const date = parseInstant(value);
      return date ? `${dateText(date)} ${clock(date)}` : '';
    },
    activity(value, now = referenceNow()) {
      const date = parseInstant(value);
      if (!date) return '';
      const relation = todayOrYesterday(date, now);
      const label = relation === 'today' ? '今天' : relation === 'yesterday' ? '昨天'
        : date.getFullYear() === now.getFullYear() ? monthDay(date) : dateText(date);
      return `${label} ${clock(date)}`;
    },
    compactTimestamp(value, now = referenceNow()) {
      const date = parseInstant(value);
      if (!date) return '';
      const relation = todayOrYesterday(date, now);
      return relation === 'today' ? clock(date) : relation === 'yesterday' ? '昨天'
        : date.getFullYear() === now.getFullYear() ? monthDay(date) : dateText(date);
    },
    fullDate(value) {
      const parts = parseDateOnly(value);
      return parts ? dateOnlyText(parts, true) : '';
    },
    compactDate(value, now = referenceNow()) {
      const parts = parseDateOnly(value);
      return parts ? dateOnlyText(parts, parts.year !== now.getFullYear()) : '';
    },
    isPastDate(value, now = referenceNow()) {
      const parts = parseDateOnly(value);
      if (!parts) return false;
      const dateNumber = parts.year * 10000 + parts.month * 100 + parts.day;
      const todayNumber = now.getFullYear() * 10000 + (now.getMonth() + 1) * 100 + now.getDate();
      return dateNumber < todayNumber;
    },
    daysPastDate(value, now = referenceNow()) {
      const parts = parseDateOnly(value);
      if (!parts) return 0;
      const due = Date.UTC(parts.year, parts.month - 1, parts.day);
      const today = Date.UTC(now.getFullYear(), now.getMonth(), now.getDate());
      return Math.max(0, Math.round((today - due) / 86400000));
    }
  });
})(window);
