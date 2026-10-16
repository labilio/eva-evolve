/* Read-through adapter: task logs and comments remain in the Loop data source. */
(function(root) {
  'use strict';
  const actionText = {
    created: '创建了任务', title_changed: '修改了任务标题', description_updated: '更新了任务描述',
    status_changed: '修改了任务状态', priority_changed: '修改了任务优先级',
    assignee_changed: '更换了执行负责人', source_changed: '更换了来源者', creator_changed: '更换了创建者',
    start_date_changed: '修改了开始日期', due_date_changed: '修改了截止日期',
    parent_changed: '修改了父任务', stage_changed: '修改了任务阶段'
  };
  function mentions(text, actor) {
    return [...String(text || '').matchAll(/\[[^\]\n]*\]\(mention:\/\/(?:member|agent)\/([^\s)]+)\)/g)].some(match => match[1] === actor);
  }
  function createSource({storage, reminders, membership, projects, tasks, comments, subscriptions, subscribeChanges}) {
    const deliveryKey = 'eva:task-notification-delivery:v1';
    let deliveries = new Map(), deliveryError = null, dirty = false, reconciling = false;
    try {
      const saved = JSON.parse(storage.getItem(deliveryKey) || '[]');
      if (Array.isArray(saved)) deliveries = new Map(saved.filter(item => Array.isArray(item) && typeof item[0] === 'string' && typeof item[1] === 'boolean'));
    } catch (_) {}
    function delivered(actor, project, task, event, eligible) {
      const key = JSON.stringify([actor, project, task, event]);
      if (!deliveries.has(key)) { deliveries.set(key, !!eligible); dirty = true; }
      return deliveries.get(key);
    }
    function persistDelivery() {
      if (!dirty) return;
      try { storage.setItem(deliveryKey, JSON.stringify([...deliveries])); dirty = false; deliveryError = null; }
      catch (_) { deliveryError = '提醒接收记录未能保存，刷新后状态可能变化'; }
    }
    const canRead = (project, actor) => actor === membership.actorId() && membership.canRead(project, actor);
    function events(project, actor) {
      if (!canRead(project, actor)) return [];
      const result = [];
      for (const task of tasks(project)) {
        const followed = subscriptions.has(task);
        for (const entry of task.activity_log || []) {
          if (!entry.id) continue;
          const assigned = entry.action === 'assignee_changed' && entry.details?.to === actor;
          if (!delivered(actor, project, task.id, entry.id, entry.actor_id !== actor && (followed || assigned))) continue;
          const details = entry.details || {};
          const from = details.from_name, to = details.to_name;
          const change = from || to ? '：' + (from || '未指派') + ' → ' + (to || '未指派') : '';
          result.push({id: entry.id, taskId: task.id, kind: 'activity', recipientId: actor,
            actorId: entry.actor_id, timestamp: Date.parse(entry.created_at) || 0,
            text: (actionText[entry.action] || '更新了任务') + change, activityId: entry.id});
        }
        for (const comment of comments(task)) {
          if (!comment.id || comment.deleted || comment.deleted_at) continue;
          if (!delivered(actor, project, task.id, comment.id, comment.author_id !== actor && (followed || mentions(comment.content, actor)))) continue;
          result.push({id: comment.id, taskId: task.id, kind: 'activity', recipientId: actor,
            actorId: comment.author_id, timestamp: Date.parse(comment.created_at) || 0,
            text: comment.content || '添加了附件', groupable: true, commentId: comment.id, parentCommentId: comment.parent_id || null});
        }
      }
      persistDelivery();
      return result;
    }
    reminders.connectSource({tasks, events, canRead});
    return {
      id: 'tasks',
      getError: () => deliveryError,
      list(actor) {
        if (actor !== membership.actorId()) return [];
        return projects().filter(project => canRead(project.id, actor)).flatMap(project =>
          reminders.allItems(project.id, actor).map(row => ({...row, type: 'task', projectName: project.name})));
      },
      canRead: (group, actor) => canRead(group.projectId, actor) && tasks(group.projectId).some(task => task.id === group.id),
      markRead(group, eventIds, read, actor) {
        if (actor !== membership.actorId()) throw new Error('账号已切换，请重新操作');
        if (!this.canRead(group, actor)) throw new Error('你已无法访问此任务');
        reminders[read ? 'markRead' : 'markUnread'](group.projectId, group.id, actor, eventIds);
      },
      subscribe(fn) {
        const refresh = () => {
          if (reconciling) return;
          reconciling = true;
          try { const actor = membership.actorId(); for (const project of projects()) events(project.id, actor); }
          finally { reconciling = false; }
          fn();
        };
        const stops = [reminders.subscribe(fn), membership.subscribe(refresh), subscriptions.subscribe(refresh), subscribeChanges(refresh)];
        return () => stops.forEach(stop => stop?.());
      }
    };
  }
  root.EvaActivityTasks = Object.freeze({createSource});
})(window);
