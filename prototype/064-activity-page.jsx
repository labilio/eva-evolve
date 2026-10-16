import React, {useLayoutEffect, useMemo, useRef, useState, useSyncExternalStore} from 'react';
import {List} from './063-info-list.jsx';
import {Button} from './063-forms.jsx';
import {ActionMenu} from './063-file-controls.jsx';
import {EvaLucideIcon as Icon} from './063-lucide-icon.jsx';
import {typography} from './063-ui-theme.js';

// Behavior reference: Huly v0.7.426 notification-resources Inbox.svelte,
// InboxGroupedListView.svelte and DocNotifyContextCard.svelte. The route owns
// opened content; keyboard list focus is deliberately a different state.

// Memoize the composed Semi row: selection changes only repaint the old/new row.
const ActivityRow = React.memo(function ActivityRow({row, selected, busy, store, handlers, summaries, renderObjectIcon, renderUnread, renderArchiveIcon, renderActor}) {
  return <List.Item key={row.key} data-activity-row className={'eva-activity__row' + (row.unreadCount > 0 ? ' is-unread' : '') + (selected ? ' is-selected' : '')}>
    <div className="eva-activity__row-head">
      <Button className="eva-activity__open" theme="borderless" type="tertiary" data-activity-open={row.key} aria-current={selected ? 'true' : undefined} onClick={() => handlers.current.open(row)}><span className="eva-activity__labels">
        {<span className="eva-activity__metadata" style={typography.taskReference}>{renderObjectIcon?.(row)}<span>{row.identifier || '任务'}</span></span>}
        <span className="eva-activity__title-line">{renderUnread?.(row.unreadCount)}<span className="eva-activity__title" style={row.unreadCount > 0 ? typography.section : typography.body} title={row.title || row.name}>{row.title || row.name}</span></span>
      </span></Button>
      <div className="eva-activity__actions" onClick={event => event.stopPropagation()}>
        <ActionMenu native items={[
          {label: '归档', icon: renderArchiveIcon?.(false), onClick: () => handlers.current.archive(row)},
          {label: '标记为未读', icon: <Icon name="mail"/>, onClick: () => handlers.current.perform(() => store.markRead(row.key, false))},
          {label: row.pinned ? '取消置顶' : '置顶', icon: <Icon name="pin"/>, onClick: () => handlers.current.perform(() => store.setPinned(row.key, !row.pinned))}
        ]}><Button disabled={busy} theme="borderless" type="tertiary" icon={<Icon name="ellipsis"/>} aria-label="提醒操作"/></ActionMenu>
      </div>
    </div>
    <div className="eva-activity__preview">{row.preview.map(event => <Button key={event.id} className="eva-activity__event" theme="borderless" type="tertiary" onClick={click => {click.stopPropagation(); handlers.current.open(row, event);}}>
      {<span className="eva-activity__actor">{renderActor?.(event.actorId,event)}</span>}<span className="eva-activity__event-text" title={summaries.get(event.text)}>{summaries.get(event.text)}</span>
      {!!event.timestamp && <time dateTime={new Date(event.timestamp).toISOString()} title={new Date(event.timestamp).toLocaleString('zh-CN')}>{new Date(event.timestamp).toLocaleDateString('zh-CN', {month: 'numeric', day: 'numeric'})}</time>}
    </Button>)}</div>
  </List.Item>;
});

export function ActivityPage({store, selectedKey, selectedEventId, onSelect, renderDetail, renderActor, renderObjectIcon, renderArchiveIcon, previewText, renderUnread}) {
  const revision = useSyncExternalStore(store.subscribe, store.getSnapshot);
  const handlers = useRef(null);
  useLayoutEffect(() => { handlers.current = {open, archive, perform}; });
  const [busy, setBusy] = useState(false);
  const busyRef = useRef(false);
  const [error, setError] = useState('');
  const list = useRef(null);
  const [pendingFocus, setPendingFocus] = useState(null);
  const allRows = useMemo(() => store.items({archived:false}).filter(row => row.type === 'task'), [store, revision]);
  const rows = allRows;
  const selected = useMemo(() => {
    const row = allRows.find(row => row.key === selectedKey) || store.context(selectedKey);
    return row?.type === 'task' ? row : null;
  }, [allRows, selectedKey, store]);
  const summaries = useMemo(() => new Map(allRows.flatMap(row => row.preview.map(event => [event.text, event.activityId ? event.text : previewText?.(event.text) || event.text]))), [allRows, previewText]);

  useLayoutEffect(() => {
    if (pendingFocus === null) return;
    const key = pendingFocus;
    setPendingFocus(null);
    const target = [...(list.current?.querySelectorAll('[data-activity-open]') || [])].find(button => button.dataset.activityOpen === key);
    (target || list.current)?.focus({preventScroll: true});
  }, [pendingFocus]);
  async function perform(action) {
    if (busyRef.current) return false;
    busyRef.current = true; setBusy(true); setError('');
    try { await action(); return true; }
    catch (failure) { setError(failure.message || '操作失败，请重试'); return false; }
    finally { busyRef.current = false; setBusy(false); }
  }
  function open(row, event) {
    onSelect(row?.key || null, event?.id || null);
    if (row && row.type === 'task' && row.unreadCount) void perform(() => store.markRead(row.key));
  }
  async function archive(row) {
    if (!row) return;
    const index = rows.findIndex(item => item.key === row.key);
    const next = rows[index + 1] || rows[index - 1];
    if (await perform(() => store.clear(row.key))) {
      setPendingFocus(next?.key || '');
      if (!selectedKey || selectedKey === row.key) open(next);

    }
  }
  function move(index) {
    const element = list.current?.querySelectorAll('[data-activity-open]')[Math.max(0, Math.min(index, rows.length - 1))];
    element?.focus();
  }
  function keydown(event) {
    if (!event.target.matches('[data-activity-open]') || event.isComposing || busy) return;
    const focusIndex = Math.max(0, rows.findIndex(row => row.key === event.target.dataset.activityOpen));
    const movement = {ArrowUp: focusIndex - 1, ArrowDown: focusIndex + 1, Home: 0, End: rows.length - 1};
    if (Object.hasOwn(movement, event.key)) { event.preventDefault(); event.stopPropagation(); move(movement[event.key]); }
    else if (event.key === 'Delete' || event.key === 'Backspace') { event.preventDefault(); event.stopPropagation(); void archive(rows[focusIndex]); }
  }
  return <section className="eva-activity" aria-label="任务动态">
    <aside className="eva-activity__rail">
      <header className="eva-rail-header"><h1>任务动态</h1></header>
      {(error || store.getErrors?.().length > 0) && <div className="eva-activity__error" role="alert">{error || store.getErrors().join('；')}</div>}
      <div className="eva-activity__list" ref={list} tabIndex={-1} role="region" aria-label="任务动态列表" onKeyDown={keydown}>
        <List emptyContent="暂无任务动态" dataSource={rows} renderItem={row => <ActivityRow key={row.key} row={row} selected={row.key === selectedKey} busy={busy} store={store} handlers={handlers} summaries={summaries} renderObjectIcon={renderObjectIcon} renderUnread={renderUnread} renderArchiveIcon={renderArchiveIcon} renderActor={renderActor}/>} />
      </div>
      <div className="eva-conversation-rail-resizer" data-eva-conversation-rail-resizer role="separator" aria-label="调整中间栏宽度" aria-orientation="vertical" tabIndex={0}/>
    </aside>
    <div className="eva-activity__detail">{selected && renderDetail(selected, selected.events.find(event => event.id === selectedEventId))}</div>
  </section>;
}
