/* Inbox metadata only. Tasks, messages, access and read state belong to sources. */
(function(root) {
  'use strict';
  const storageKey = 'eva:activity-cleared:v1';
  const pinStorageKey = 'eva:activity-pinned:v1';
  const groupKey = (source, group) => JSON.stringify([source.id, group.projectId || '', group.id]);
  const time = event => Number(event.timestamp) || 0;
  function preview(events) {
    const groups = [];
    for (const event of events) {
      const previous = groups.at(-1);
      if (event.groupable && event.actorId && previous?.groupable && previous.actorId === event.actorId) {
        previous.groupedEvents.push(event);
      } else {
        if (groups.length === 3) break;
        groups.push({...event, groupedEvents: [event]});
      }
    }
    return groups;
  }

  function createStore({storage, actorId, sources}) {
    const listeners = new Set();
    let revision = 0, cleared = {};
    try {
      const saved = JSON.parse(storage.getItem(storageKey));
      if (saved && typeof saved === 'object' && !Array.isArray(saved)) {
        // Validate persisted metadata; never accept business objects as clear state.
        for (const [actor, entries] of Object.entries(saved)) {
          if (!entries || typeof entries !== 'object' || Array.isArray(entries)) continue;
          const valid = {};
          for (const [key, ids] of Object.entries(entries)) {
            if (Array.isArray(ids)) Object.defineProperty(valid, key, {value: ids.filter(id => typeof id === 'string'), enumerable: true, writable: true});
          }
          Object.defineProperty(cleared, actor, {value: valid, enumerable: true, writable: true});
        }
      }
    } catch (_) {}
    let pinned = {};
    try {
      const saved = JSON.parse(storage.getItem(pinStorageKey));
      if (saved && typeof saved === 'object' && !Array.isArray(saved)) {
        pinned = Object.fromEntries(Object.entries(saved).filter(([, keys]) => Array.isArray(keys)).map(([actor, keys]) => [actor, keys.filter(key => typeof key === 'string')]));
      }
    } catch (_) {}
    function notify() { revision++; listeners.forEach(fn => fn()); }

    function collect(actor, archived = false) {
      if (!actor) return [];
      const rows = [];
      for (const source of sources) {
        for (const group of source.list(actor)) {
          if (!source.canRead(group, actor)) continue;
          const key = groupKey(source, group);
          const hidden = new Set(Object.hasOwn(cleared, actor) ? cleared[actor][key] || [] : []);
          const unique = new Map();
          for (const event of group.events || []) {
            if (typeof event.id === 'string' && hidden.has(event.id) === archived) unique.set(event.id, event);
          }
          const events = [...unique.values()].sort((a, b) => time(b) - time(a));
          if (!events.length) continue;
          rows.push({source, group, row: {...group, key, sourceId: source.id, events,
            pinned: Object.hasOwn(pinned, actor) && pinned[actor].includes(key),
            preview: preview(events), timestamp: time(events[0]),
            unreadCount: events.filter(event => event.unread).length}});
        }
      }
      return rows.sort((a, b) => Number(b.row.pinned) - Number(a.row.pinned) || b.row.timestamp - a.row.timestamp);
    }
    function find(key, actor, archived = false) {
      const found = collect(actor, archived).find(item => item.row.key === key);
      if (!found) throw new Error('此提醒已不存在或你已无法访问');
      return found;
    }
    function saveCleared(items, actor, restore = false) {
      if (!actor || actorId() !== actor) throw new Error('账号已切换，请重新操作');
      const entries = {...(Object.hasOwn(cleared, actor) ? cleared[actor] : {})};
      for (const item of items) {
        if (!item.source.canRead(item.group, actor)) throw new Error('你已无法访问此提醒');
        const ids = new Set(entries[item.row.key] || []);
        for (const event of item.row.events) { if (restore) ids.delete(event.id); else ids.add(event.id); }
        entries[item.row.key] = [...ids];
      }
      const next = {...cleared, [actor]: entries};
      try { storage.setItem(storageKey, JSON.stringify(next)); }
      catch (_) { throw new Error('归档状态未能保存，请检查浏览器存储后重试'); }
      cleared = next;
      notify();
    }
    async function read(item, value, actor) {
      if (actorId() !== actor) throw new Error('账号已切换，请重新操作');
      if (!item.source.canRead(item.group, actor)) throw new Error('你已无法访问此提醒');
      await item.source.markRead(item.group, item.row.events.map(event => event.id), value, actor);
      notify();
    }
    const unsubscribe = sources.map(source => source.subscribe?.(notify)).filter(Boolean);
    return {
      subscribe(fn) { listeners.add(fn); return () => listeners.delete(fn); },
      getSnapshot: () => revision,
      getErrors: () => sources.map(source => source.getError?.()).filter(Boolean),
      items({type = 'all', limit = Infinity, projectId, archived = false, unreadOnly = false, selectedKey} = {}) {
        const rows = collect(actorId(), archived).map(item => item.row).filter(row =>
          (type === 'all' || row.type === type) && (projectId === undefined || row.projectId === projectId)
          && (!unreadOnly || row.unreadCount > 0 || row.key === selectedKey));
        return rows.slice(0, Math.max(0, limit));
      },
      context(key) {
        const actor=actorId();
        if(!actor||!key)return undefined;
        for(const source of sources)for(const group of source.list(actor)){
          if(groupKey(source,group)===key&&source.canRead(group,actor))return {...group,key,sourceId:source.id};
        }
        return undefined;
      },
      setPinned(key, value) {
        const actor = actorId();
        find(key, actor);
        const keys = new Set(Object.hasOwn(pinned, actor) ? pinned[actor] : []);
        if (value) keys.add(key); else keys.delete(key);
        const next = {...pinned, [actor]: [...keys]};
        try { storage.setItem(pinStorageKey, JSON.stringify(next)); }
        catch (_) { throw new Error('置顶状态未能保存，请重试'); }
        pinned = next;
        notify();
      },
      async markRead(key, value = true) {
        const actor = actorId();
        await read(find(key, actor), value, actor);
      },
      async clear(key) {
        const actor = actorId(), item = find(key, actor);
        await read(item, true, actor);
        saveCleared([item], actor);
      },
      async markAllRead() {
        const actor = actorId(), items = collect(actor);
        // Snapshot IDs before the first asynchronous write: new arrivals stay unread.
        for (const item of items) await read(item, true, actor);
      },
      async markAllUnread() {
        const actor = actorId(), items = collect(actor);
        for (const item of items) await read(item, false, actor);
      },
      restore(key) {
        const actor = actorId();
        saveCleared([find(key, actor, true)], actor, true);
      },
      async clearAll() {
        const actor = actorId(), items = collect(actor);
        for (const item of items) await read(item, true, actor);
        saveCleared(items, actor);
      },
      dispose() { unsubscribe.forEach(fn => fn()); listeners.clear(); }
    };
  }
  root.EvaActivity = Object.freeze({createStore});
})(window);
