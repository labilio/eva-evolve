export const COMMENT_STATUSES = ['open', 'approved', 'doing', 'done'];

export function partitionCommentsByCompletion(rows = []) {
  return rows.reduce((groups, row) => {
    groups[row.status === 'done' ? 'completed' : 'pending'].push(row);
    return groups;
  }, { pending: [], completed: [] });
}

export function pointWithinRect(rect, clientX, clientY) {
  const clamp = value => Math.max(0, Math.min(1, Number.isFinite(value) ? value : 0.5));
  const left = Number(rect?.left) || 0;
  const top = Number(rect?.top) || 0;
  const width = Math.max(1, Number(rect?.width) || 0);
  const height = Math.max(1, Number(rect?.height) || 0);
  return {
    rx: clamp((Number(clientX) - left) / width),
    ry: clamp((Number(clientY) - top) / height),
  };
}

const PROJECT_TAB_LABELS = [
  ['团队文件', 'files'],
  ['项目设置', 'settings'],
  ['自动化', 'automation'],
  ['群聊', 'channels'],
  ['任务', 'tasks'],
];

function projectTabFromText(value) {
  const text = String(value || '').replace(/\s+/g, ' ').trim();
  return PROJECT_TAB_LABELS.find(([label]) => text.startsWith(label))?.[1] || '';
}

export function buildProjectViewContext({ pagePath, projectId, projectName, tabLabel } = {}) {
  if (String(pagePath || '').split('?')[0] !== '#/collab' || !String(projectId || '').trim()) return null;
  return {
    kind: 'project',
    projectId: String(projectId),
    projectName: String(projectName || ''),
    tab: projectTabFromText(tabLabel) || 'tasks',
  };
}

export function inferProjectTab(quote) {
  const text = String(quote || '');
  if (/看板|分组|列表|筛选|新建任务/.test(text)) return 'tasks';
  return projectTabFromText(text);
}

export function pageLabel(pagePath) {
  const value = String(pagePath || '#/');
  const pathname = value.slice(1).split('?')[0];
  if (pathname === '/messages' && value.includes('evaIM=my-ai')) return '团队 · 我的AI';
  const labels = {
    '/guid': '个人 · Eva同学',
    '/messages': '团队 · 消息',
    '/contacts': '通讯录',
    '/drive': '文件库',
    '/collab': '项目',
    '/scheduled': '自动化任务',
  };
  if (labels[pathname]) return labels[pathname];
  if (pathname.startsWith('/eva-stub/')) return decodeURIComponent(pathname.slice('/eva-stub/'.length));
  return decodeURIComponent(pathname.slice(1) || '首页');
}

export function normalizeStatus(status) {
  return COMMENT_STATUSES.includes(status) ? status : 'open';
}

export function isVisiblePin(row, pagePath, mode = 'all') {
  if (row.page_path !== pagePath || mode === 'off') return false;
  if (mode === 'approved') return normalizeStatus(row.status) === 'approved';
  return true;
}

export function normalizePinMode(mode) {
  if (mode === 'all' || mode === 'approved') return 'all';
  return 'off';
}

export function buildAnchorRecord(snapshot = {}) {
  const clamp = value => Math.max(0, Math.min(1, Number.isFinite(Number(value)) ? Number(value) : 0.5));
  const record = {
    version: 1,
    page: String(snapshot.page || ''),
    selector: String(snapshot.selector || ''),
    anchorId: String(snapshot.anchorId || ''),
    quote: String(snapshot.quote || ''),
    target: {
      tag: String(snapshot.tag || ''),
      role: String(snapshot.role || ''),
      label: String(snapshot.label || ''),
      placeholder: String(snapshot.placeholder || ''),
      inputType: String(snapshot.inputType || ''),
      heading: String(snapshot.heading || ''),
    },
    point: { rx: clamp(snapshot.rx), ry: clamp(snapshot.ry) },
  };
  if (snapshot.view && typeof snapshot.view === 'object') {
    record.view = {
      kind: String(snapshot.view.kind || ''),
      projectId: String(snapshot.view.projectId || ''),
      projectName: String(snapshot.view.projectName || ''),
      tab: String(snapshot.view.tab || ''),
    };
  }
  return record;
}

export function createPageRequestGate(getPage) {
  let revision = 0;
  return {
    start() {
      revision += 1;
      return { page: getPage(), revision };
    },
    isCurrent(request) {
      return request?.revision === revision && request.page === getPage();
    },
  };
}

export function createPageChangeDetector(getPage, onChange) {
  let observedPage = getPage();
  return function detectPageChange() {
    const nextPage = getPage();
    if (nextPage === observedPage) return false;
    observedPage = nextPage;
    onChange(nextPage);
    return true;
  };
}

export function afterBrowserPaint(schedule = requestAnimationFrame) {
  return new Promise(resolve => schedule(() => schedule(resolve)));
}

export function clampFloatingPosition({ x, y, width, height, viewportWidth, viewportHeight, margin = 8 } = {}) {
  const maxX = Math.max(margin, Number(viewportWidth) - Number(width) - margin);
  const maxY = Math.max(margin, Number(viewportHeight) - Number(height) - margin);
  return {
    x: Math.min(maxX, Math.max(margin, Number(x) || 0)),
    y: Math.min(maxY, Math.max(margin, Number(y) || 0)),
  };
}

export function floatingPositionStyle({ x, y } = {}) {
  return {
    left: `${Number(x) || 0}px`,
    top: `${Number(y) || 0}px`,
    right: 'auto',
    bottom: 'auto',
  };
}

export function hasDragMoved(start, current, threshold = 5) {
  return Math.hypot(Number(current?.x) - Number(start?.x), Number(current?.y) - Number(start?.y)) >= threshold;
}
