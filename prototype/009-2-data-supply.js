(function () {
  'use strict';
  var T0 = window.__EVA_DEMO_TIME.T0;
  var T1 = window.__EVA_DEMO_TIME.T1;
  var supplySkills = [
    {
      id: 'sk-supply-procurement', workspace_id: 'prod', name: '间接采购需求分析',
      description: '归集跨部门采购需求，识别重复项、预算缺口与交期冲突',
      created_by: '王宜林', created_at: T0, updated_at: T1,
      content: '# 间接采购需求分析\n\n按品类、数量、预算、交期和使用部门整理需求，输出缺口清单与询价建议。', files: []
    },
    {
      id: 'sk-supply-sqe', workspace_id: 'prod', name: 'SQE质量问题研判',
      description: '分析供应商质量异常、8D 报告、临时措施和长期整改证据',
      created_by: '王宜林', created_at: T0, updated_at: T1,
      content: '# SQE质量问题研判\n\n核对异常范围、根因、临时处置、长期措施与验证记录，形成供应商整改建议。', files: []
    },
    {
      id: 'sk-supply-compliance', workspace_id: 'prod', name: '供应链合规风险检查',
      description: '检查供应商准入材料、关联关系、合同条款与履约风险',
      created_by: '王宜林', created_at: T0, updated_at: T1,
      content: '# 供应链合规风险检查\n\n按资质、关联关系、关键条款和履约记录识别风险，输出待补材料和处理建议。', files: []
    },
    {
      id: 'sk-supply-tender', workspace_id: 'prod', name: '招投标文件评审',
      description: '核对招标范围、评分规则、商务条款与评审记录的一致性',
      created_by: '王宜林', created_at: T0, updated_at: T1,
      content: '# 招投标文件评审\n\n按采购范围、资格条件、评分标准和商务条款逐项复核，输出风险项与修订建议。', files: []
    },
    {
      id: 'sk-supply-cost', workspace_id: 'prod', name: '供应链成本偏差分析',
      description: '拆解采购价格、物流费用、汇率与用量变化造成的成本偏差',
      created_by: '王宜林', created_at: T0, updated_at: T1,
      content: '# 供应链成本偏差分析\n\n统一预算、合同与实际发生口径，定位价差和量差并形成降本建议。', files: []
    },
    {
      id: 'sk-supply-kd', workspace_id: 'prod', name: 'KD排产风险分析',
      description: '结合需求、产能、物料齐套和运输周期识别排产风险',
      created_by: '王宜林', created_at: T0, updated_at: T1,
      content: '# KD排产风险分析\n\n核对需求计划、产能约束、齐套率和运输节点，输出风险等级与调整方案。', files: []
    },
    {
      id: 'sk-supply-contract', workspace_id: 'prod', name: '供应链合同全周期检查',
      description: '检查合同签订、履约、变更、续签与终止节点',
      created_by: '王宜林', created_at: T0, updated_at: T1,
      content: '# 供应链合同全周期检查\n\n识别即将到期、履约偏差和关键条款风险，形成续签或处置清单。', files: []
    }
  ];

  function supplyExpert(id, name, description, skillIds) {
    return {
      id: id, workspace_id: 'prod', runtime_id: 'rt-org', name: name,
      description: description,
      instructions: description + '。按“供应链运营协同”项目口径执行，结论、证据和待处理项挂回对应任务。',
      status: 'idle', model: 'qwen3.8-max', visibility: 'shared', max_concurrent_tasks: 2,
      created_at: T0, updated_at: T1, runtime_name: '组织共享 Runtime', owner_id: 'u-wangyilin', owner_name: '王宜林',
      skill_ids: skillIds,
      skills: supplySkills.filter(function (skill) { return skillIds.indexOf(skill.id) >= 0; })
    };
  }

  var supplyAgents = [
    supplyExpert('ag-supply-procurement', '间接采购专家', '负责需求归集、品类分析、询价比价与采购建议', ['sk-supply-procurement', 'sk-supply-compliance']),
    supplyExpert('ag-supply-tender', '招投标管理专家', '负责招标方案、资格条件、评分规则与评审过程管理', ['sk-supply-tender', 'sk-supply-compliance']),
    supplyExpert('ag-supply-sqe', 'SQE运营专家', '负责供应商质量异常研判、整改跟踪与验证闭环', ['sk-supply-sqe']),
    supplyExpert('ag-supply-cost', '供应链成本运营专家', '负责采购成本偏差分析、价格趋势研判与降本机会识别', ['sk-supply-cost', 'sk-supply-procurement']),
    supplyExpert('ag-supply-kd', '供应链KD排产专家', '负责需求、产能、齐套与运输节点的排产风险分析', ['sk-supply-kd']),
    supplyExpert('ag-supply-compliance', '供应链合规风控专家', '负责供应商准入、关联关系和履约环节的合规风险检查', ['sk-supply-compliance']),
    supplyExpert('ag-supply-contract', '供应链合同管理专家', '负责合同签订、履约、变更、续签与终止节点管理', ['sk-supply-contract', 'sk-supply-compliance'])
  ];

  var supplySquads = [{
    id: 'sq-supply-procurement', workspace_id: 'prod', name: '采购与招投标专家团',
    description: '联合完成需求归集、询价比价、招标文件与成本评审',
    instructions: '由间接采购专家担任团长。先汇总采购需求，再由招投标管理专家和供应链成本运营专家并行核对评审规则与成本口径，形成采购决策建议。',
    leader_id: 'ag-supply-procurement', creator_id: 'u-wangyilin', member_count: 3,
    members: [
      { member_type: 'agent', member_id: 'ag-supply-procurement', role: 'leader', member_name: '间接采购专家' },
      { member_type: 'agent', member_id: 'ag-supply-tender', role: '招投标管理', member_name: '招投标管理专家' },
      { member_type: 'agent', member_id: 'ag-supply-cost', role: '成本运营', member_name: '供应链成本运营专家' }
    ],
    created_at: T0, updated_at: T1, leader_name: '间接采购专家', creator_name: '王宜林'
  }, {
    id: 'sq-supply-risk', workspace_id: 'prod', name: '履约与风险专家团',
    description: '联合处理质量、排产、合规与合同履约风险',
    instructions: '由供应链合规风控专家担任团长。SQE运营专家、供应链KD排产专家和供应链合同管理专家分别核查质量、交付与合同风险，汇总为分级处置方案。',
    leader_id: 'ag-supply-compliance', creator_id: 'u-wangyilin', member_count: 4,
    members: [
      { member_type: 'agent', member_id: 'ag-supply-compliance', role: 'leader', member_name: '供应链合规风控专家' },
      { member_type: 'agent', member_id: 'ag-supply-sqe', role: '质量运营', member_name: 'SQE运营专家' },
      { member_type: 'agent', member_id: 'ag-supply-kd', role: 'KD排产', member_name: '供应链KD排产专家' },
      { member_type: 'agent', member_id: 'ag-supply-contract', role: '合同管理', member_name: '供应链合同管理专家' }
    ],
    created_at: T0, updated_at: T1, leader_name: '供应链合规风控专家', creator_name: '王宜林'
  }];

  var supplyProjects = [{
    id: 'p-supply', workspace_id: 'prod', title: '供应链运营协同',
    description: '协同推进间接采购、供应商质量与合规风控工作', icon: '📦',
    status: 'in_progress', priority: 'high', lead_type: 'member', lead_id: 'u-wangyilin',
    issue_count: 7, done_count: 1, created_at: T0, updated_at: T1, lead_name: '王宜林'
  }];

  function supplyTask(number, title, status, priority, assigneeType, assigneeId, assigneeName, description) {
    return {
      id: 'supply-' + number, workspace_id: 'prod', number: number,
      identifier: 'SC-' + (100 + number), title: title, description: description, status: status,
      priority: priority, assignee_type: assigneeType, assignee_id: assigneeId,
      assignee_name: assigneeName, creator_id: 'u-wangyilin', creator_name: '王宜林',
      creator_avatar: window.__EVA_CURRENT_USER_PORTRAIT,
      issuer_role_id: 'supply-role-product', issuer_role_name: '产品',
      project_id: 'p-supply', project_name: '供应链运营协同', position: number,
      created_at: T0, updated_at: T1
    };
  }

  var supplyIssues = [
    supplyTask(1, '完成本季度间接采购需求归集', 'in_progress', 'high', 'squad', 'sq-supply-procurement', '采购与招投标专家团', '合并行政、IT 和设备维保需求，确认数量、预算、交期与待补信息。'),
    supplyTask(2, '完成供应商招投标文件评审', 'in_review', 'high', 'agent', 'ag-supply-tender', '招投标管理专家', '复核资格条件、评分规则、技术标与商务标，标记影响公平性和履约的风险项。'),
    supplyTask(3, '处理关键供应商来料质量异常', 'in_progress', 'high', 'agent', 'ag-supply-sqe', 'SQE运营专家', '复核批次 A-2409 的隔离措施、8D 根因分析和长期整改证据。'),
    supplyTask(4, '分析核心品类采购成本偏差', 'todo', 'medium', 'agent', 'ag-supply-cost', '供应链成本运营专家', '拆解预算、合同与实际采购金额的价差、量差和物流费用影响。'),
    supplyTask(5, '评估下月KD排产与齐套风险', 'todo', 'high', 'agent', 'ag-supply-kd', '供应链KD排产专家', '结合需求计划、产能、物料齐套率和运输周期识别高风险节点。'),
    supplyTask(6, '复核新供应商准入合规材料', 'todo', 'high', 'squad', 'sq-supply-risk', '履约与风险专家团', '检查供应商资质、关联关系声明、制裁名单与关键履约条款。'),
    supplyTask(7, '完成到期采购合同续签检查', 'done', 'medium', 'agent', 'ag-supply-contract', '供应链合同管理专家', '核对三份到期合同的履约情况、价格调整、续签期限和终止条件。')
  ];

  var supplyTaskLabels = [
    {id: 'task-label-procurement', project_id: 'p-supply', name: '采购'},
    {id: 'task-label-quality', project_id: 'p-supply', name: '质量'},
    {id: 'task-label-supply-risk', project_id: 'p-supply', name: '供应风险'},
    {id: 'task-label-compliance', project_id: 'p-supply', name: '合规'}
  ];

  var supplyAgentTasks = {};
  supplyAgents.forEach(function (agent) {
    supplyAgentTasks[agent.id] = supplyIssues.filter(function (issue) { return issue.assignee_id === agent.id; }).map(function (issue, index) {
      return {
        id: 'at-' + agent.id + '-' + index, agent_id: agent.id, issue_id: issue.id,
        status: issue.status === 'done' ? 'completed' : issue.status === 'in_progress' ? 'running' : 'queued',
        created_at: issue.created_at, started_at: issue.created_at,
        completed_at: issue.status === 'done' ? issue.updated_at : null,
        kind: 'manual', trigger_summary: issue.title
      };
    });
  });

  window.__EVA_SUPPLY_CHAIN_DEMO = {
    overview: {
      status: '协作中', period: {start: '2026年9月1日', end: '2026年9月30日'}, stage: '风险处置与证据复核',
      background: '围绕采购交期、供应商质量与排产风险，集中协同处理影响保供的关键事项。',
      goals: ['明确物料缺口与恢复计划', '完成质量整改证据复核', '同步排产影响与待决策事项'],
      milestones: [['09月04日', '汇总保供风险', 'done'], ['09月07日', '复核整改证据与备选方案', 'active'], ['09月11日', '跟进恢复计划', 'pending']]
    },
    agents: supplyAgents, squads: supplySquads, skills: supplySkills, autopilots: [],
    projects: supplyProjects, issues: supplyIssues, taskLabels: supplyTaskLabels, agentTasks: supplyAgentTasks
  };
})();

// Membership demo identities: clone ownership is explicit and distinct from assistants.
window.__EVA_MEMBERSHIP_CLONES = [
  {id:'b-wangyilin',ownerId:'u-wangyilin',name:'王宜林的 AI 分身',active:true},
  {id:'clone-linxiao',ownerId:'u-linxiao',name:'林晓的 AI 分身',active:true},
  {id:'clone-hejing',ownerId:'u-hejing',name:'何静的 AI 分身',active:true}
];

// Review scenario belongs to the existing collaboration workspace (prod).
// p-supply is its task-board project, not its membership scope.
window.__EVA_SUPPLY_MEMBER_DEMO = {
  projectId:'prod', version:2,
  humans:[{id:'u-wangyilin',role:'owner'},{id:'u-linxiao',role:'member'},{id:'u-zhouyuan',role:'admin'},{id:'u-hejing',role:'member'}],
  cloneIds:['b-wangyilin','clone-linxiao'],
  group:{id:'supply-demo-rectification',name:'供应商整改协同',ownerId:'u-wangyilin',humans:[{id:'u-wangyilin',role:'member'},{id:'u-linxiao',role:'member'}],cloneIds:['clone-linxiao']},
  thread:{id:'supply-demo-evidence',name:'A-2409整改证据',status:1,created_at:'2026-09-02T10:00:00+08:00',creator_name:'林晓',message_count:1,member_count:2,unread:0},
  messages:[
    {kind:'text',senderId:'u-linxiao',time:'10:00',text:'A-2409 来料异常已隔离，整改证据已整理。何静已加入项目，可以查看共享的整改资料。'},
    {kind:'text',senderId:'u-wangyilin',time:'10:02',text:'先将分析报告共享给项目成员。是否对供应商承诺执行，由人类负责人确认。'},
    {kind:'file',senderId:'u-linxiao',time:'10:03',file:{name:'A-2409来料异常分析报告.pdf',size:42000,extension:'pdf',version:1,taskId:'SC-103'}}
  ]
};

// Small, explicit cast for the leadership prototype walkthrough.
window.__EVA_MEMBER_DEMO_IDS=["u-wangyilin","u-hejing","u-linxiao","u-zhouyuan","u-suhang"];

// Conversation fixtures stay in the supply-chain project. Stable IDs allow additive upgrades.
window.__EVA_SUPPLY_CHAT_CONTENT = [
  {scopeId:'all:prod',notice:'同步跨条线进展和待决事项；具体讨论留在对应群，确认后的结论回到这里。',messages:[
  [
    "u-wangyilin",
    "09:00",
    "今天先看 A-2409，会不会影响下午排产？"
  ],
  [
    "u-linxiao",
    "09:02",
    "异常批次已隔离，现有合格库存能撑到今天下班。供应商还缺连续验证数据，我在整改群催。"
  ],
  [
    "u-zhouyuan",
    "09:03",
    "我先保留原排产，备选顺序已经准备好。中午前需要一个明确结论。"
  ],
  [
    "u-wangyilin",
    "09:04",
    "@Eva 项目管理专员 帮我汇总一下，今天哪些事需要拍板？"
  ],
  [
    "project-agent:prod",
    "09:05",
    "**今天需要确认两件事**\n\n| 事项 | 当前缺口 | 下一步 |\n| --- | --- | --- |\n| A-2409 放行 | 连续验证数据 | 林晓收齐后发起现场复核 |\n| 是否调整排产 | 放行时间未定 | 周远评估备选方案，王宜林确认 |\n\n采购需求继续按 SC-101 推进，暂不占用这次决策。"
  ],
  [
    "u-wangyilin",
    "09:06",
    "好，先不承诺恢复交期。林晓 11 点前同步证据进展，周远把备选方案的影响带上。"
  ],
  [
    "u-linxiao",
    "10:48",
    "供应商补了数据，我已放进整改证据子区。还在核对样本批次，暂时不能按放行处理。"
  ],
  [
    "u-zhouyuan",
    "10:50",
    "备选方案会多一次换型。我把产能影响补到 SC-105，等质量结论一起确认。\n@Eva 项目管理专员 请结合刚才的更新，简要汇总还需要确认的事项。"
  ],
  [
    "project-agent:prod",
    "10:52",
    "收到，**待决事项仍是放行与排产**。\n\n- SC-103：等待批次核对与现场复核。\n- SC-105：备选方案已补影响说明。\n\n> 证据已收到，不等于已经放行。"
  ],
  [
    "u-wangyilin",
    "10:54",
    "按这个推进。细节留在对应群，有结论再同步这里。"
  ],
  {
    fixtureId: 'supply-chat-v3:all:prod:field-checklist-context',
    kind: 'text', senderId: 'u-linxiao', time: '11:02',
    text: '我把现场复核需要逐项确认的批次、量具、抽样和签字要求整理成清单。先发 Markdown 版，大家可以直接在线读，补充项继续在整改证据子区维护。'
  },
  {
    fixtureId: 'supply-chat-v3:all:prod:field-checklist-file',
    kind: 'file', senderId: 'u-linxiao', time: '11:03',
    file: {name: 'A-2409现场复核清单.md', size: 4860, extension: 'md', version: 3, taskId: 'SC-103'}
  },
  {
    fixtureId: 'supply-chat-v3:all:prod:schedule-impact-context',
    kind: 'text', senderId: 'u-zhouyuan', time: '11:07',
    text: '排产影响我拆成“维持原顺序”和“提前换型”两个场景，时间轴和受影响工序放在 HTML 里。这个版本只用于内部比较，还不是最终排产指令。'
  },
  {
    fixtureId: 'supply-chat-v3:all:prod:schedule-impact-file',
    kind: 'file', senderId: 'u-zhouyuan', time: '11:08',
    file: {name: 'A-2409排产影响测算.html', size: 12840, extension: 'html', version: 2, taskId: 'SC-105'}
  },
  {
    fixtureId: 'supply-chat-v3:all:prod:review-minutes-context',
    kind: 'text', senderId: 'u-hejing', time: '11:12',
    text: '临时放行评审纪要已整理。文档把“已核实事实”“待补证据”和“需要负责人拍板”分开写了，Word 版方便后续归档和会签。'
  },
  {
    fixtureId: 'supply-chat-v3:all:prod:review-minutes-file',
    kind: 'file', senderId: 'u-hejing', time: '11:13',
    file: {name: 'A-2409临时放行评审纪要.docx', size: 28416, extension: 'docx', version: 1, taskId: 'SC-103', previewUrl: 'prototype/assets/file-samples/A-2409临时放行评审纪要.docx.html'}
  },
  {
    fixtureId: 'supply-chat-v3:all:prod:analysis-report-context',
    kind: 'text', senderId: 'u-linxiao', time: '11:16',
    text: '分析报告 PDF 也补到这里，便于和前三份资料对照。报告记录的是当前分析结果，不代表质量放行已经完成。'
  },
  {
    fixtureId: 'supply-chat-v3:all:prod:analysis-report-file',
    kind: 'file', senderId: 'u-linxiao', time: '11:17',
    file: {name: 'A-2409来料异常分析报告.pdf', size: 42000, extension: 'pdf', version: 1, taskId: 'SC-103'}
  },
  {
    fixtureId: 'supply-chat-v3:all:prod:summary-request',
    kind: 'text', senderId: 'u-wangyilin', time: '11:20',
    text: '@Eva 项目管理专员 请按“文件用途、当前结论、还要谁确认”把这四份资料串起来，给大家一个阅读顺序。'
  },
  {
    fixtureId: 'supply-chat-v3:all:prod:summary-response',
    kind: 'text', senderId: 'project-agent:prod', time: '11:21',
    text: '**建议按决策顺序阅读**\n\n1. `A-2409现场复核清单.md`：先确认现场复核项是否完整；由林晓维护。\n2. `A-2409来料异常分析报告.pdf`：核对异常范围与分析依据；当前仍不能据此视为放行。\n3. `A-2409排产影响测算.html`：比较两种排产场景；由周远确认产能影响。\n4. `A-2409临时放行评审纪要.docx`：汇总事实、待补证据和会签意见。\n\n> 最终仍需王宜林根据质量复核与排产影响，人工确认是否临时放行、是否调整排产。'
  },
  {
    fixtureId: 'supply-chat-v3:all:prod:human-decision-gate',
    kind: 'text', senderId: 'u-wangyilin', time: '11:22',
    text: '收到。大家先按这个顺序看，质量复核和排产影响没有同时确认前，不对外承诺恢复时间，也不下发新的排产指令。'
  }
]},
  {scopeId:'supply-demo-rectification',notice:'跟进 A-2409 来料异常与供应商整改。证据放入“A-2409整改证据”子区；对外承诺和放行由人类负责人确认。',messages:[
    ['u-linxiao','10:06','补充现场情况：本批抽检 200 件，发现 12 件尺寸偏差。仓库已按批次隔离，同型号其他批次正在复核。'],
    ['u-wangyilin','10:09','先分开确认两件事：异常是否只涉及这一批，以及临时筛选方案能否稳定识别不合格件。'],
    ['u-linxiao','10:13','供应商提供了设备调整记录，但还没有调整后的连续生产验证。我把这项列为证据缺口，暂不建议关闭异常。'],
    ['u-wangyilin','10:18','按这个口径推进。今天先完成复测和影响范围确认，不直接承诺恢复供货。'],
    ['u-linxiao','10:24','待办已明确：我跟进复测记录和现场照片；供应商补连续验证数据；你确认临时放行条件。文件集中放子区，不在多个群重复传。'],
    ['u-wangyilin','10:28','可以。何静加入项目后先看共享的分析报告；需要参与整改讨论时，再单独添加进这个群。']
  ]},
  {scopeId:'supply-demo-evidence',messages:[
    ['u-linxiao','10:08','证据清单：① 来料抽检原始记录；② 批次隔离与标识照片；③ 设备调整记录；④ 调整后连续生产验证。前两项已收齐，后两项待补。'],
    ['u-wangyilin','10:14','复测记录请保留样本编号、测量工具和复核人，避免只有一张结论截图。'],
    ['u-linxiao','10:21','已通知现场按同一模板补齐。还要核对量具校准状态，供应商口头说明先不作为有效证据。'],
    ['u-wangyilin','10:30','收齐后先做内部复核。验证不通过就继续整改，不自动关闭 SC-103。']
  ]},
  {groupName:'采购与招投标',messages:[
    ['u-zhouyuan','16:05','本季度需求归集还有两个缺口：设备维保的服务范围、IT 配件的交付批次。先补口径，再进入询价。'],
    ['u-linxiao','16:08','供应商报价里有一项把运输费单列了。比价表需要统一含税、含运口径，不能只比较单价。'],
    ['u-wangyilin','16:12','同意。SC-101 先补齐需求；SC-102 的评审记录要写清技术偏差和商务偏差，不把两者合成一个分数。']
  ]},
  {groupName:'质量与排产',messages:[
    ['u-linxiao','16:15','A-2409 当前保持隔离。没有收到连续验证数据之前，排产请继续按已确认的合格库存计算。'],
    ['u-zhouyuan','16:19','我已在排产风险里单列这批物料。备选方案是调整装配顺序，暂不修改对客户的承诺日期。'],
    ['u-wangyilin','16:23','先把调整顺序后的产能影响算出来。是否启用备选方案，等质量验证和交付影响一起确认。']
  ]},
  {groupName:'合规与合同',messages:[
    ['u-zhouyuan','16:26','新供应商准入还缺关联关系声明，合同续签还要确认质保起算时间。两项分别跟踪，材料齐全不等于合同条款已通过。'],
    ['u-linxiao','16:30','供应商表示今天会补声明，我收到后先核对签章和主体名称。质量附件继续使用本轮确认的检验标准。'],
    ['u-wangyilin','16:35','未完成审核前不要通知供应商“准入通过”。续签条款有变化的部分单独标出，交给对应负责人确认。']
  ]}
];

// All-hands demo is maintained only in __EVA_SUPPLY_CHAT_CONTENT.
window.__EVA_PROJECT_AGENT_DEMO = [];

// Explicit user-requested Official community task fixtures.
window.__EVA_OFFICIAL_TASKS = [
  {
    "id": "official-101",
    "workspace_id": "official",
    "number": 101,
    "identifier": "EVA-101",
    "title": "修复上传失败后的重试反馈",
    "status": "in_progress",
    "priority": "medium",
    "assignee_type": "member",
    "assignee_id": "u-linxiao",
    "assignee_name": "林晓",
    "creator_id": "u-wangyilin",
    "creator_name": "王宜林",
    "project_id": null,
    "project_name": "EVA Official Space",
    "description": "来自 Official 用户反馈：断网后保留失败记录，重试不生成重复文件，补充客户端重启场景。",
    "position": 101,
    "created_at": "2026-09-08T09:00:00+08:00",
    "updated_at": "2026-09-08T11:00:00+08:00"
  },
  {
    "id": "official-102",
    "workspace_id": "official",
    "number": 102,
    "identifier": "EVA-102",
    "title": "验证分享链接与来源群权限隔离",
    "status": "in_review",
    "priority": "medium",
    "assignee_type": "member",
    "assignee_id": "u-wangyilin",
    "assignee_name": "王宜林",
    "creator_id": "u-wangyilin",
    "creator_name": "王宜林",
    "project_id": null,
    "project_name": "EVA Official Space",
    "description": "使用群内 AI 提供的权限矩阵核对分享范围；未通过的项保持待验证，不提前承诺上线。",
    "position": 102,
    "created_at": "2026-09-08T09:00:00+08:00",
    "updated_at": "2026-09-08T11:00:00+08:00"
  },
  {
    "id": "official-103",
    "workspace_id": "official",
    "number": 103,
    "identifier": "EVA-103",
    "title": "补充会议行动项上手示例",
    "status": "todo",
    "priority": "medium",
    "assignee_type": "member",
    "assignee_id": "u-wangyilin",
    "assignee_name": "王宜林",
    "creator_id": "u-wangyilin",
    "creator_name": "王宜林",
    "project_id": null,
    "project_name": "EVA Official Space",
    "description": "将会议行动项模板整理到上手说明，明确负责人和时间需人工确认，任务分派不自动启动 AI。",
    "position": 103,
    "created_at": "2026-09-08T09:00:00+08:00",
    "updated_at": "2026-09-08T11:00:00+08:00"
  }
];

// User-requested coverage of every seeded project and task lifecycle stage.
window.__EVA_CLIENT_TASKS = [
  {
    "id": "client-101",
    "workspace_id": "lab",
    "identifier": "CLIENT-101",
    "number": 101,
    "title": "确认客户试点范围与成功标准",
    "description": "演示记录：已整理试点场景、负责人及验收标准，并形成双方确认纪要。",
    "status": "done",
    "priority": "medium",
    "assignee_type": "member",
    "assignee_id": "u-wangyilin",
    "assignee_name": "王宜林",
    "creator_id": "u-wangyilin",
    "creator_name": "王宜林",
    "project_id": null,
    "project_name": "客户联合交付",
    "position": 101,
    "created_at": "2026-09-01T09:00:00+08:00",
    "updated_at": "2026-09-08T10:00:00+08:00"
  },
  {
    "id": "client-102",
    "workspace_id": "lab",
    "identifier": "CLIENT-102",
    "number": 102,
    "title": "评审首批交付方案与权限清单",
    "description": "方案已整理，等待客户确认交付范围、可见文件与项目成员边界。",
    "status": "in_review",
    "priority": "medium",
    "assignee_type": "member",
    "assignee_id": "u-hejing",
    "assignee_name": "何静",
    "creator_id": "u-wangyilin",
    "creator_name": "王宜林",
    "project_id": null,
    "project_name": "客户联合交付",
    "position": 102,
    "created_at": "2026-09-01T09:00:00+08:00",
    "updated_at": "2026-09-08T10:00:00+08:00"
  },
  {
    "id": "client-103",
    "workspace_id": "lab",
    "identifier": "CLIENT-103",
    "number": 103,
    "title": "联调客户演示环境与核心流程",
    "description": "按登录、项目访问、任务流转及文件读取路径逐项联调，记录阻塞和复现步骤。",
    "status": "in_progress",
    "priority": "medium",
    "assignee_type": "member",
    "assignee_id": "u-suhang",
    "assignee_name": "苏航",
    "creator_id": "u-wangyilin",
    "creator_name": "王宜林",
    "project_id": null,
    "project_name": "客户联合交付",
    "position": 103,
    "created_at": "2026-09-01T09:00:00+08:00",
    "updated_at": "2026-09-08T10:00:00+08:00"
  },
  {
    "id": "client-104",
    "workspace_id": "lab",
    "identifier": "CLIENT-104",
    "number": 104,
    "title": "准备客户培训与操作手册",
    "description": "基于已确认的功能准备操作步骤、常见问题和培训演示材料。",
    "status": "todo",
    "priority": "medium",
    "assignee_type": "member",
    "assignee_id": "u-wangyilin",
    "assignee_name": "王宜林",
    "creator_id": "u-wangyilin",
    "creator_name": "王宜林",
    "project_id": null,
    "project_name": "客户联合交付",
    "position": 104,
    "created_at": "2026-09-01T09:00:00+08:00",
    "updated_at": "2026-09-08T10:00:00+08:00"
  },
  {
    "id": "client-105",
    "workspace_id": "lab",
    "identifier": "CLIENT-105",
    "number": 105,
    "title": "收集第二批客户场景需求",
    "description": "先归集反馈和业务价值，范围未确认前不承诺排期。",
    "status": "backlog",
    "priority": "medium",
    "assignee_type": "member",
    "assignee_id": "u-hejing",
    "assignee_name": "何静",
    "creator_id": "u-wangyilin",
    "creator_name": "王宜林",
    "project_id": null,
    "project_name": "客户联合交付",
    "position": 105,
    "created_at": "2026-09-01T09:00:00+08:00",
    "updated_at": "2026-09-08T10:00:00+08:00"
  }
];

window.__EVA_OFFICIAL_TASKS.push(
  {...window.__EVA_OFFICIAL_TASKS[0],id:'official-104',number:104,identifier:'EVA-104',position:104,title:'发布用户反馈信息收集模板',status:'done',assignee_id:'u-wangyilin',assignee_name:'王宜林',description:'演示记录：已整理版本号、复现步骤、期望结果及脱敏要求，供用户反馈时参考。'},
  {...window.__EVA_OFFICIAL_TASKS[0],id:'official-105',number:105,identifier:'EVA-105',position:105,title:'整理社区高频问题候选清单',status:'backlog',assignee_id:'u-wangyilin',assignee_name:'王宜林',description:'归集用户交流中的重复问题，评估哪些内容进入下一版说明，暂未确认排期。'}
);
window.__EVA_SUPPLY_CHAIN_DEMO.issues.push({
  ...window.__EVA_SUPPLY_CHAIN_DEMO.issues[0],id:'supply-8',number:8,identifier:'SC-108',position:8,title:'收集下一季度供应商协同需求',status:'backlog',assignee_type:'member',assignee_id:'u-wangyilin',assignee_name:'王宜林',description:'归集采购、质量和合同团队的改进建议，待优先级评审后再进入执行。'
});
window.__EVA_SUPPLY_CHAIN_DEMO.projects.forEach(p=>{p.issue_count=window.__EVA_SUPPLY_CHAIN_DEMO.issues.filter(t=>t.project_id===p.id).length;p.done_count=window.__EVA_SUPPLY_CHAIN_DEMO.issues.filter(t=>t.project_id===p.id&&t.status==='done').length;});

window.__EVA_PROJECT_ROLE_DEMO={projectId:'prod',roles:[
  {id:'supply-role-product',name:'产品',description:'梳理协作需求与验收标准'},
  {id:'supply-role-front',name:'前端',description:'实现页面与交互'},
  {id:'supply-role-back',name:'后端',description:'数据与接口开发'},
  {id:'supply-role-hr',name:'HR',description:'人员协同与支持'}
],assignments:{'u-wangyilin':['supply-role-product'],'u-linxiao':['supply-role-front'],'u-hejing':['supply-role-hr'],'u-zhouyuan':['supply-role-back']}};

// Project automation fixtures are illustrative; no scheduler or external system is invoked.
(function(root){
  const time=root.__EVA_DEMO_TIME;
  const scenarios={
    prod:[
      ['daily-supply','每日保供风险检查','工作日 09:00','汇总缺料、延期交付与排产变化，形成待人工确认的风险清单。','supply-5','发现 2 项齐套风险：关键件交付晚于排产需求，已关联排产风险任务。','昨日物料清单附件缺失，检查未完成；请补齐清单后重试。'],
      ['quality','供应商整改证据跟进','工作日 15:00','核对 A-2409 整改证据和验证结论，整理仍需供应商补充的材料。','supply-3','已整理隔离措施、8D 报告与验证照片，仍待质量负责人确认长期措施。','已完成证据目录比对，标出 3 处待补材料。'],
      ['contracts','采购合同到期提醒','每周一 10:00','检查未来 30 天到期合同，整理续签节点及需要人类确认的商务事项。','supply-7','本轮 4 份合同进入续签窗口，已关联续签检查任务，未向供应商发送承诺。','已核对到期日期与负责人员，未发现新增逾期。']
    ],
    'drive-design':[
      ['delivery','每日文件功能交付汇总','工作日 17:30','汇总预览、上传重试和共享权限的开发进度，整理次日联调事项。',null,'需求与交互已对齐，上传重试待联调；整理 3 项次日确认事项。','已整理本周文件预览与共享权限变更。'],
      ['access','共享文件权限巡检','每周一 10:00','按现有权限矩阵整理 Owner、Manager、Editor 和群外成员的验收项。',null,'已整理 12 项权限检查结果：2 项需要人工复核，未改变任何成员权限。','验收样本链接失效，巡检中断；请补充有效测试文件。'],
      ['preview','文件预览问题归集','工作日 11:00','归集 PDF、图片和文档预览反馈，按复现条件去重并关联修复任务。',null,'合并 5 条同类预览反馈，补齐文件类型、大小与失败步骤。','已归集 3 条反馈，缺少复现文件的条目标记待补充。']
    ],
    official:[
      ['feedback','社区反馈每日归集','工作日 10:00','整理用户使用反馈，按上传、分享和会话问题分类并关联已有任务。','official-101','归集 8 条反馈，合并 3 条重复问题，上传重试反馈已关联 EVA-101。','已整理反馈摘要；涉及个人内容仅保留脱敏复现信息。'],
      ['faq','每周高频问题整理','每周五 16:00','汇总已确认答复和重复提问，形成待人工审核的 FAQ 草稿。','official-105','生成 6 条 FAQ 候选，其中分享范围说明需产品复核，未对外发布。','部分反馈引用已失效，草稿不完整；等待补充上下文。'],
      ['template','反馈信息完整性检查','工作日 14:00','检查反馈是否包含版本号、复现步骤与预期结果，整理需补充的信息。','official-104','发现 3 条反馈缺少版本号，已整理补充清单，未自动联系用户。','已核对 7 条反馈，5 条具备完整复现条件。']
    ],
    lab:[
      ['milestone','客户交付里程碑跟进','工作日 09:30','核对交付节点、负责人和验收材料，汇总偏差供内部交付团队确认。',null,'识别 1 项接口联调延期风险，建议调整内部验证顺序，未承诺新交付日期。','已核对本周 3 个里程碑，整理对应验收材料。'],
      ['risks','客户项目风险周报','每周五 17:00','汇总范围变更、接口依赖和验收风险，形成内部周报草稿。',null,'整理 2 项接口依赖和 1 项范围变更，等待交付负责人确认后对外沟通。','依赖清单缺少最新版本，周报生成失败；请更新材料。'],
      ['acceptance','交付验收材料检查','工作日 16:00','对照验收清单核对说明文档、测试记录和签收材料的完整性。',null,'已核对 9 项材料，缺少 2 份签收附件，生成待补材料清单。','已整理材料索引与版本差异，未代客户作出验收结论。']
    ]
  };
  const issues={prod:root.__EVA_SUPPLY_CHAIN_DEMO.issues,'drive-design':root.__EVA_DRIVE_DEMO.issues,official:root.__EVA_OFFICIAL_TASKS,lab:root.__EVA_CLIENT_TASKS};
  root.__EVA_PROJECT_AUTOMATIONS=Object.fromEntries(Object.entries(scenarios).map(([pid,rows])=>[pid,rows.map(([key,title,schedule,description,target,summary,previous],index)=>{
    const task=issues[pid].find(i=>i.id===target)||issues[pid][index],id='ap-'+pid+'-'+key;
    const clock=schedule.match(/\d{2}:\d{2}/)[0],weekly=schedule.startsWith('每周'),weekday=schedule.includes('周五')?5:1;
    const scheduled=(base,direction)=>{const d=new Date(base);d.setUTCHours(0,0,0,0);if(weekly){while(d.getUTCDay()!==weekday)d.setUTCDate(d.getUTCDate()+direction);}return d.toISOString().slice(0,10)+'T'+clock+':00+08:00';};
    const recent=scheduled(time.AUTOMATION_PREVIOUS,-1),previousDate=new Date(recent);previousDate.setUTCDate(previousDate.getUTCDate()-(weekly?7:3));
    const previousAt=previousDate.toISOString().slice(0,10)+'T'+clock+':00+08:00',nextAt=scheduled(time.AUTOMATION_NEXT,1);
    const runs=[{id:id+':recent',at:recent,status:'succeeded',summary,taskId:task?.id},{id:id+':previous',at:previousAt,status:previous.includes('失败')||previous.includes('中断')||previous.includes('未完成')||previous.includes('不完整')?'failed':'succeeded',summary:previous,taskId:task?.id}];
    return {id,workspace_id:pid,title,description,schedule_label:schedule,assignee_type:'agent',assignee_id:'project-agent:'+pid,assignee_name:'Eva 项目管理专员',status:'active',execution_mode:'create_issue',issue_title_template:'{{date}}-'+title,created_by_type:'member',created_by_id:'u-wangyilin',trigger_kinds:['schedule'],last_run_at:runs[0].at,last_run_status:runs[0].status,next_run_at:nextAt,created_at:time.T0,updated_at:time.AUTOMATION_RECENT,demo:true,runs};
  })]));
  root.__EVA_SUPPLY_CHAIN_DEMO.autopilots=root.__EVA_PROJECT_AUTOMATIONS.prod;
  // Keep the two existing file-project automations alongside the new scenarios.
  root.__EVA_DRIVE_DEMO.autopilots.push(...root.__EVA_PROJECT_AUTOMATIONS['drive-design']);
})(window);
