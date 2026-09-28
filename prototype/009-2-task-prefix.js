(function (root) {
  'use strict';
  const valid = /^[A-Z]{1,10}$/;
  const upper = value => String(value || '').trim().toUpperCase();
  const history = project => Array.isArray(project.issue_prefix_history) ? project.issue_prefix_history : [];
  const claims = (projects, exceptId) => new Set(projects.filter(project => project.id !== exceptId).map(project => upper(project.issue_prefix)).filter(Boolean));
  const initials = name => {
    if (!root.pinyinPro?.pinyin) return '';
    return root.pinyinPro.pinyin(String(name || ''), { pattern: 'first', toneType: 'none', type: 'array' })
      .filter(part => /^[A-Za-z]$/.test(part)).join('').toUpperCase();
  };
  function suggest(name, projects, exceptId) {
    const letters = initials(name), occupied = claims(projects, exceptId);
    for (let length = Math.min(4, letters.length); length <= Math.min(10, letters.length); length++) {
      const candidate = letters.slice(0, length);
      if (valid.test(candidate) && !occupied.has(candidate)) return candidate;
    }
    return '';
  }
  function validate(prefix, projects, exceptId) {
    const normalized = upper(prefix);
    if (!valid.test(normalized)) throw new Error('任务前缀须为 1–10 个英文字母');
    if (claims(projects, exceptId).has(normalized)) throw new Error('该任务前缀已被其他项目使用');
    return normalized;
  }
  const number = issue => {
    const identifierNumber = Number(String(issue.identifier || '').match(/-(\d+)$/)?.[1]);
    return Number.isSafeInteger(identifierNumber) && identifierNumber > 0 ? identifierNumber : Number(issue.number) || 0;
  };
  const identifier = (project, issue) => upper(project.issue_prefix) + '-' + number(issue);
  function migrate(projects, issues, persist) {
    let changed = false;
    const next = projects.map(project => ({ ...project, issue_prefix_history: history(project).map(upper).filter(Boolean) }));
    for (const project of next) {
      const old = upper(project.issue_prefix) || String((issues[project.id] || [])[0]?.identifier || '').match(/^([A-Z0-9]+)-\d+$/i)?.[1]?.toUpperCase() || '';
      if (valid.test(old) && !claims(next, project.id).has(old)) {
        if (project.issue_prefix !== old) { project.issue_prefix = old; changed = true; }
        continue;
      }
      const replacement = suggest(project.name, next, project.id);
      if (!replacement) continue;
      if (old && old !== replacement) project.issue_prefix_history.push(old);
      project.issue_prefix = replacement;
      changed = true;
    }
    for (const project of next) for (const issue of issues[project.id] || []) {
      const previous = String(issue.identifier || '').match(/^([A-Za-z0-9]+)-\d+$/)?.[1]?.toUpperCase();
      if (previous && previous !== project.issue_prefix && !history(project).includes(previous)) {
        project.issue_prefix_history.push(previous);
        changed = true;
      }
    }
    if (changed) persist(next);
    for (const project of next) for (const issue of issues[project.id] || []) {
      const current = identifier(project, issue);
      if (issue.identifier !== current) issue.identifier = current;
    }
    return next;
  }
  function change(projects, issues, projectId, nextPrefix, persist) {
    const project = projects.find(item => item.id === projectId);
    if (!project) throw new Error('项目不存在');
    const prefix = validate(nextPrefix, projects, projectId), previous = upper(project.issue_prefix);
    if (prefix === previous) return projects;
    const next = projects.map(item => item.id === projectId ? { ...item, issue_prefix: prefix, issue_prefix_history: [...new Set([...history(item), previous].filter(Boolean))] } : item);
    persist(next);
    for (const issue of issues[projectId] || []) issue.identifier = identifier(next.find(item => item.id === projectId), issue);
    return next;
  }
  function resolve(project, issues, token) {
    const task = (issues[project.id] || []).find(issue => issue.id === token);
    if (task) return task;
    const match = String(token || '').match(/^([A-Za-z0-9]+)-(\d+)$/);
    if (!match) return null;
    const prefix = match[1].toUpperCase();
    if (prefix !== upper(project.issue_prefix) && !history(project).includes(prefix)) return null;
    return (issues[project.id] || []).find(issue => number(issue) === Number(match[2])) || null;
  }
  root.EvaTaskPrefix = Object.freeze({ initials, suggest, validate, number, identifier, migrate, change, resolve });
})(window);
