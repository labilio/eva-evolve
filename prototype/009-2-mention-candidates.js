(function (root) {
  'use strict';

  // 提及候选的唯一数据源：联系人、AI 分身、数字员工、本地助理、专家、专家团。
  // IM 与项目任务评论共用同一份身份数据和同一个 MentionPicker 组件渲染。
  const ORDER = [
    { kind: 'assistant', label: '本地助理' },
    { kind: 'human', label: '联系人' },
    { kind: 'clone', label: 'AI 分身' },
    { kind: 'employee', label: '数字员工' },
    { kind: 'agent', label: '专家' },
    { kind: 'squad', label: '专家团' }
  ];

  const normalize = value => String(value ?? '').normalize('NFKC').toLocaleLowerCase();
  const matches = (name, needle) => !needle || normalize(name).includes(needle);

  function expertAppearance(agent) {
    const logo = agent?.avatar || root.__EVA_COLLEAGUE_PORTRAIT;
    return { name: agent?.name || '', sourceName: 'Eva', avatar: logo, logo };
  }

  function squadAppearance(squad) {
    const avatar = root.EvaAvatar.squadUri(squad?.id);
    return { name: squad?.name || '', sourceName: 'Eva', avatar, logo: avatar };
  }

  function flat(options) {
    const { store, actorId, projectId, scopeId, agents = [], squads = [], query = '' } = options || {};
    if (!store) return [];
    const needle = normalize(String(query).trim());
    const snapshot = store.snapshot();
    const project = projectId ? snapshot.projects[projectId] : null;
    const scope = project || (scopeId ? snapshot.groups[scopeId] : null);
    const result = [];

    const team = root.EvaAITeam ? root.EvaAITeam.getSnapshot() : null;
    (team?.localAssistants || []).forEach(local => {
      if (matches(local.name, needle)) {
        result.push({ id: local.id, name: local.name, kind: 'assistant', tokenId: local.id, tokenType: 'agent', appearance: root.EvaAIIdentity.assistantAppearance(local) });
      }
    });

    (scope?.humans || []).map(entry => store.person(entry.id)).filter(Boolean).forEach(person => {
      if (matches(person.name, needle)) {
        result.push({ id: person.id, name: person.name, kind: 'human', tokenId: person.id, tokenType: 'member' });
      }
    });

    const clones = (scope?.cloneIds || []).map(id => store.clone(id)).filter(Boolean)
      .sort((a, b) => Number(b.ownerId === actorId) - Number(a.ownerId === actorId));
    clones.forEach(clone => {
      if (matches(clone.name, needle)) {
        result.push({ id: clone.id, name: clone.name, kind: 'clone', tokenId: clone.id, tokenType: 'agent', appearance: root.EvaAIIdentity.cloneAppearance(store.person(clone.ownerId)) });
      }
    });

    (scope?.employeeIds || []).map(id => store.employee(id)).filter(Boolean).forEach(employee => {
      if (matches(employee.name, needle)) {
        result.push({ id: employee.id, name: employee.name, kind: 'employee', tokenId: employee.id, tokenType: 'agent', appearance: employee.identityAppearance });
      }
    });

    agents.forEach(agent => {
      if (matches(agent.name, needle)) {
        result.push({ id: agent.id, name: agent.name, kind: 'agent', tokenId: agent.id, tokenType: 'agent', appearance: expertAppearance(agent) });
      }
    });

    squads.forEach(squad => {
      if (matches(squad.name, needle)) {
        result.push({ id: squad.id, name: squad.name, kind: 'squad', tokenId: squad.id, tokenType: 'squad', appearance: squadAppearance(squad) });
      }
    });

    return result;
  }

  root.EvaMentionCandidates = Object.freeze({ ORDER, flat, expertAppearance, squadAppearance });
})(window);
