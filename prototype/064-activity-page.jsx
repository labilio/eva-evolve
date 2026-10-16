import React, {useLayoutEffect, useMemo, useRef, useState, useSyncExternalStore} from 'react';
import {List} from './063-info-list.jsx';
import {Button} from './063-forms.jsx';
import {ActionMenu} from './063-file-controls.jsx';
import {Dialog, Actions} from './063-dialog.jsx';
import {EvaLucideIcon as Icon} from './063-lucide-icon.jsx';
import {typography} from './063-ui-theme.js';

// Behavior reference: Huly v0.7.426 notification-resources Inbox.svelte,
// InboxGroupedListView.svelte and DocNotifyContextCard.svelte. The route owns
// opened content; keyboard list focus is deliberately a different state.

// Memoize the composed Semi row: selection changes only repaint the old/new row.
const ActivityRow = React.memo(function ActivityRow({row, selected, archived, busy, store, handlers, summaries, renderObjectIcon, renderUnread, renderArchiveIcon, renderActor, grouped = false}) {
  const conversation = row.sourceId === 'chat';
  return <List.Item key={row.key} data-activity-row className={'eva-activity__row' + (!archived && row.unreadCount > 0 ? ' is-unread' : '') + (selected ? ' is-selected' : '') + (grouped ? ' is-grouped' : '') + (conversation ? ' is-conversation' : '') + (row.direct ? ' is-direct' : '')}>
    <div className="eva-activity__row-head">
      <Button className="eva-activity__open" theme="borderless" type="tertiary" data-activity-open={row.key} aria-current={selected ? 'true' : undefined} onClick={() => handlers.current.open(row)}><span className="eva-activity__labels">
        {!grouped && !conversation && <span className="eva-activity__metadata" style={typography.taskReference}>{renderObjectIcon?.(row)}<span>{row.identifier || labels[row.type]}</span></span>}
        <span className="eva-activity__title-line">{conversation && renderObjectIcon?.(row)}{!archived && renderUnread?.(row.unreadCount)}<span className="eva-activity__title" style={!archived && row.unreadCount > 0 ? typography.section : typography.body} title={row.title || row.name}>{row.title || row.name}</span></span>
      </span></Button>
      <div className="eva-activity__actions" onClick={event => event.stopPropagation()}>
        <ActionMenu native items={archived ? [{label: '恢复提醒', icon: renderArchiveIcon?.(true), onClick: () => handlers.current.archive(row)}] : [
          {label: '归档', icon: renderArchiveIcon?.(false), onClick: () => handlers.current.archive(row)},
          {label: '标记为未读', icon: <Icon name="mail"/>, onClick: () => handlers.current.perform(() => store.markRead(row.key, false))},
          {label: row.pinned ? '取消置顶' : '置顶', icon: <Icon name="pin"/>, onClick: () => handlers.current.perform(() => store.setPinned(row.key, !row.pinned))}
        ]}><Button disabled={busy} theme="borderless" type="tertiary" icon={<Icon name="ellipsis"/>} aria-label="提醒操作"/></ActionMenu>
      </div>
    </div>
    <div className="eva-activity__preview">{((grouped || conversation) ? row.preview.slice(0, 1) : row.preview).map(event => <Button key={event.id} className="eva-activity__event" theme="borderless" type="tertiary" onClick={click => {click.stopPropagation(); handlers.current.open(row, event);}}>
      {!(conversation && row.direct) && !(row.sourceId === 'ai' && row.type === 'message' && event.actorId && event.actorId === row.identityId) && <span className="eva-activity__actor">{renderActor?.(event.actorId,event)}</span>}<span className="eva-activity__event-text" title={summaries.get(event.text)}>{summaries.get(event.text)}</span>
      {!!event.timestamp && <time dateTime={new Date(event.timestamp).toISOString()} title={new Date(event.timestamp).toLocaleString('zh-CN')}>{new Date(event.timestamp).toLocaleDateString('zh-CN', {month: 'numeric', day: 'numeric'})}</time>}
    </Button>)}</div>
  </List.Item>;
});

// Presentation grouping only: each child retains its original notification key.
export function groupActivityRows(rows) {
  const groups = new Map();
  for (const row of rows) {
    const grouped = row.sourceId === 'ai' && ['assistant', 'employee'].includes(row.identityKind);
    const key = grouped ? JSON.stringify([row.sourceId, row.projectId || '', row.identityId]) : row.key;
    if (!groups.has(key)) groups.set(key, {key, grouped, title: row.identifier || row.title, rows: []});
    groups.get(key).rows.push(row);
  }
  // Input is pin/time sorted. A group's first child determines its position;
  // children preserve that same ordering without merging read/archive state.
  return [...groups.values()];
}

const labels = {task: '任务', chat: '群聊', message: '消息', ai: '我的 AI'};
export function ActivityPage({store, selectedKey, selectedEventId, onSelect, renderDetail, renderActor, renderObjectIcon, renderArchiveIcon, previewText, renderUnread, storage}) {
  const revision = useSyncExternalStore(store.subscribe, store.getSnapshot);
  const [type, setType] = useState('all');
  const [archived, setArchived] = useState(false);
  const [unreadOnly, setUnreadOnly] = useState(() => {
    try { return storage.getItem('eva:activity-filter') === 'unread'; } catch (_) { return false; }
  });
  const handlers = useRef(null);
  useLayoutEffect(() => { handlers.current = {open, archive, perform}; });
  const [busy, setBusy] = useState(false);
  const busyRef = useRef(false);
  const [error, setError] = useState('');
  const [confirmArchive, setConfirmArchive] = useState(false);
  const list = useRef(null);
  const [pendingFocus, setPendingFocus] = useState(null);
  const allRows = useMemo(() => store.items({archived}), [store, revision, archived]);
  const groups = useMemo(() => groupActivityRows(allRows.filter(row => (type === 'all' || row.type === type) && (!unreadOnly || row.unreadCount > 0 || row.key === selectedKey))), [allRows, type, unreadOnly, selectedKey]);
  const rows = groups.flatMap(group => group.rows);
  const types = [...new Set(allRows.map(row => row.type))];
  // A type filter does not close a currently opened object in Huly.
  const selected = useMemo(() => allRows.find(row => row.key === selectedKey) || store.context(selectedKey), [allRows, selectedKey, store]);
  const summaries = useMemo(() => new Map(allRows.flatMap(row => row.preview.map(event => [event.text, previewText?.(event.text) || event.text]))), [allRows, previewText]);

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
    // Chat read positions are advanced by its existing conversation component.
    if (row && row.type === 'task' && !archived && row.unreadCount) void perform(() => store.markRead(row.key));
  }
  async function archive(row) {
    if (!row) return;
    const index = rows.findIndex(item => item.key === row.key);
    const next = rows[index + 1] || rows[index - 1];
    if (await perform(() => archived ? store.restore(row.key) : store.clear(row.key))) {
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
  function toggleUnread() {
    const next = !unreadOnly;
    try { storage.setItem('eva:activity-filter', next ? 'unread' : 'all'); }
    catch (_) { setError('筛选偏好未能保存'); }
    setUnreadOnly(next); onSelect(null);
  }
  const settings = [
    {label: '未读', icon: <Icon name={unreadOnly ? 'check' : 'minus'}/>, onClick: toggleUnread},
    {label: '已归档', icon: <Icon name={archived ? 'check' : 'minus'}/>, onClick: () => {setArchived(!archived); setType('all'); onSelect(null);}}
  ];
  const actions = [
    {label: '全部标为已读', onClick: () => perform(() => store.markAllRead())},
    {label: '全部标为未读', onClick: () => perform(() => store.markAllUnread())},
    {label: '全部归档', onClick: () => setConfirmArchive(true)}
  ];
  return <section className="eva-activity" aria-label="动态">
    <aside className="eva-activity__rail">
      <header className="eva-rail-header"><h1>动态</h1><div className="eva-activity__actions">
        <ActionMenu native items={settings}><Button disabled={busy} theme="borderless" type="tertiary" icon={<Icon name="sliders-horizontal"/>} aria-label="动态设置"/></ActionMenu>
        <ActionMenu native items={actions}><Button disabled={busy} theme="borderless" type="tertiary" icon={<Icon name="ellipsis"/>} aria-label="动态操作"/></ActionMenu>
      </div></header>
      <div className="eva-activity__types" role="group" aria-label="动态类型">
        {['all', ...types].map(value => <Button key={value} aria-pressed={type === value} theme={type === value ? 'light' : 'borderless'} type={type === value ? 'primary' : 'tertiary'} onClick={() => setType(value)}>{value === 'all' ? '全部' : labels[value] || value}</Button>)}
      </div>
      {(error || store.getErrors?.().length > 0) && <div className="eva-activity__error" role="alert">{error || store.getErrors().join('；')}</div>}
      <div className="eva-activity__list" ref={list} tabIndex={-1} role="region" aria-label={archived ? '已归档动态' : '动态列表'} onKeyDown={keydown}>
        <List emptyContent="暂无动态" dataSource={groups} renderItem={group => {
          const renderRow = row => <ActivityRow key={row.key} row={row} grouped={group.grouped} selected={row.key === selectedKey} archived={archived} busy={busy} store={store} handlers={handlers} summaries={summaries} renderObjectIcon={renderObjectIcon} renderUnread={renderUnread} renderArchiveIcon={renderArchiveIcon} renderActor={renderActor}/>;
          return group.grouped ? <List.Item key={group.key} className="eva-activity__group">
            <div className="eva-activity__group-heading">{renderObjectIcon?.({...group.rows[0], parentId: null})}<span title={group.title}>{group.title}</span></div>
            <List dataSource={group.rows} renderItem={renderRow}/>
          </List.Item> : renderRow(group.rows[0]);
        }} />
      </div>
      <div className="eva-conversation-rail-resizer" data-eva-conversation-rail-resizer role="separator" aria-label="调整中间栏宽度" aria-orientation="vertical" tabIndex={0}/>
    </aside>
    <div className="eva-activity__detail">{selected && renderDetail(selected, selected.events.find(event => event.id === selectedEventId))}</div>
    <Dialog visible={confirmArchive} title="归档全部提醒？" onCancel={() => !busy && setConfirmArchive(false)} footer={<Actions onCancel={() => setConfirmArchive(false)} submitLabel="全部归档" busy={busy} onSubmit={async () => {if (await perform(() => store.clearAll())) {setConfirmArchive(false); onSelect(null);}}}/>}>
      <Dialog.Text>将当前提醒标为已读并移出列表，可在“已归档”中查看和恢复。有新动态时会重新出现。</Dialog.Text>
    </Dialog>
  </section>;
}
