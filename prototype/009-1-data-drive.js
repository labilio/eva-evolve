(function () {
  'use strict';
  var T0 = window.__EVA_DEMO_TIME.T0;
  var T1 = window.__EVA_DEMO_TIME.T1;
  var skills = [
    {
      id: 'sk-drive-requirement', workspace_id: 'drive-design', name: '云盘需求拆解',
      description: '把功能目标拆成用户场景、边界条件、验收标准和待确认事项',
      created_by: '王宜林', created_at: T0, updated_at: T1,
      content: '# 云盘需求拆解\n\n识别用户目标、文件对象、权限边界和异常路径，输出可执行任务清单。', files: []
    },
    {
      id: 'sk-drive-interaction', workspace_id: 'drive-design', name: '交互规范检查',
      description: '检查文件上传、移动、复制、分享等流程的状态与反馈是否完整',
      created_by: '王宜林', created_at: T0, updated_at: T1,
      content: '# 交互规范检查\n\n覆盖默认、悬停、处理中、成功、失败、无权限和空状态。', files: []
    },
    {
      id: 'sk-drive-permission', workspace_id: 'drive-design', name: '文件权限矩阵检查',
      description: '核对个人文件、项目文件、群聊文件及分享链接的权限边界',
      created_by: '王宜林', created_at: T0, updated_at: T1,
      content: '# 文件权限矩阵检查\n\n按文件归属、操作者身份和操作类型检查可见、可编辑、可下载与可分享范围。', files: []
    },
    {
      id: 'sk-drive-regression', workspace_id: 'drive-design', name: '云盘回归检查单',
      description: '按固定用例检查上传、预览、移动、复制、删除和分享链路',
      created_by: '王宜林', created_at: T0, updated_at: T1,
      content: '# 云盘回归检查单\n\n逐项执行核心文件操作并记录预期结果、实际结果和阻塞问题。', files: []
    }
  ];

  function expert(id, name, description, model, skillIds) {
    return {
      id: id, workspace_id: 'drive-design', runtime_id: 'rt-org', name: name,
      description: description,
      instructions: description + '。按“团队文件功能设计”项目口径执行，结论和交付物挂回对应任务。',
      status: 'idle', model: model, visibility: 'shared', max_concurrent_tasks: 2,
      created_at: T0, updated_at: T1, runtime_name: '组织共享 Runtime', owner_id: 'u-wangyilin', owner_name: '王宜林',
      skill_ids: skillIds,
      skills: skills.filter(function (skill) { return skillIds.indexOf(skill.id) >= 0; })
    };
  }

  var agents = [
    expert('ag-drive-product', '云盘产品专家', '负责场景梳理、需求拆解、优先级判断和验收口径', 'qwen3.8-max', ['sk-drive-requirement', 'sk-drive-permission']),
    expert('ag-drive-ux', '云盘交互设计专家', '负责文件操作流程、状态反馈、异常路径和交互一致性', 'qwen3.8-max', ['sk-drive-interaction', 'sk-drive-permission']),
    expert('ag-drive-fe', '云盘前端开发专家', '负责把确认后的云盘交互实现为可验证的前端功能', 'qwen3.7-plus', ['sk-drive-interaction', 'sk-drive-regression']),
    expert('ag-drive-qa', '云盘测试验收专家', '负责权限、文件操作和异常恢复的回归测试与验收', 'qwen3.7-plus', ['sk-drive-permission', 'sk-drive-regression'])
  ];

  var squads = [{
    id: 'sq-drive-delivery', workspace_id: 'drive-design', name: '云盘功能交付团',
    description: '从需求拆解、交互设计到开发和回归验收的一体化专家编队',
    instructions: '由云盘产品专家担任团长。先确认目标和权限边界，再分派设计、开发与测试任务；存在阻塞时回到原任务说明，最终由团长汇总交付物。',
    leader_id: 'ag-drive-product', creator_id: 'u-wangyilin', member_count: 4,
    members: [
      { member_type: 'agent', member_id: 'ag-drive-product', role: 'leader', member_name: '云盘产品专家' },
      { member_type: 'agent', member_id: 'ag-drive-ux', role: '交互设计', member_name: '云盘交互设计专家' },
      { member_type: 'agent', member_id: 'ag-drive-fe', role: '前端实现', member_name: '云盘前端开发专家' },
      { member_type: 'agent', member_id: 'ag-drive-qa', role: '测试验收', member_name: '云盘测试验收专家' }
    ],
    created_at: T0, updated_at: T1, leader_name: '云盘产品专家', creator_name: '王宜林'
  }];

  var autopilots = [
    {
      id: 'ap-drive-daily', workspace_id: 'drive-design', title: '每日云盘设计进展汇总',
      description: '汇总当天需求、交互、开发和测试任务的进展、阻塞与下一步，并生成项目任务',
      assignee_type: 'squad', assignee_id: 'sq-drive-delivery', assignee_name: '云盘功能交付团',
      status: 'active', execution_mode: 'create_issue', issue_title_template: '{{date}}-云盘设计进展汇总',
      created_by_type: 'member', created_by_id: 'u-wangyilin', trigger_kinds: ['schedule'],
      last_run_at: '2026-09-02T09:00:00Z', next_run_at: '2026-09-03T09:00:00Z',
      last_run_status: 'succeeded', created_at: T0, updated_at: T1
    },
    {
      id: 'ap-drive-permission', workspace_id: 'drive-design', title: '每周文件权限回归检查',
      description: '每周检查项目文件、群聊文件和分享链接的权限矩阵，发现异常时自动创建待处理任务',
      assignee_type: 'agent', assignee_id: 'ag-drive-qa', assignee_name: '云盘测试验收专家',
      status: 'active', execution_mode: 'create_issue', issue_title_template: '{{date}}-文件权限回归检查',
      created_by_type: 'member', created_by_id: 'u-wangyilin', trigger_kinds: ['schedule'],
      last_run_at: '2026-08-31T10:00:00Z', next_run_at: '2026-09-07T10:00:00Z',
      last_run_status: 'succeeded', created_at: T0, updated_at: T1
    }
  ];

  var projects = [{
    id: 'p-drive', workspace_id: 'drive-design', title: '团队文件功能设计',
    description: '完善文件上传、移动、复制、分享和权限体验', icon: '☁️',
    status: 'in_progress', priority: 'high', lead_type: 'member', lead_id: 'u-wangyilin',
    issue_count: 9, done_count: 1, created_at: T0, updated_at: T1, lead_name: '王宜林'
  }];

  function task(number, title, status, priority, assigneeType, assigneeId, assigneeName, extra) {
    return Object.assign({
      id: 'drive-' + number, workspace_id: 'drive-design', number: number,
      identifier: 'DRIVE-' + number, title: title, description: null, status: status,
      priority: priority, assignee_type: assigneeType, assignee_id: assigneeId,
      assignee_name: assigneeName, creator_id: 'u-wangyilin', creator_name: '王宜林',
      creator_avatar: window.__EVA_CURRENT_USER_PORTRAIT,
      project_id: 'p-drive', project_name: '团队文件功能设计', position: number,
      created_at: T0, updated_at: T1
    }, extra || {});
  }

  var issues = [
    task(1, '完成共享链接权限方案', 'in_progress', 'high', 'squad', 'sq-drive-delivery', '云盘功能交付团', {
      description: '梳理项目文件和群聊文件生成分享链接后的查看、下载、有效期与撤销规则，由专家团完成方案、交互与验收口径。'
    }),
    task(2, '设计大文件上传失败恢复流程', 'in_review', 'medium', 'agent', 'ag-drive-ux', '云盘交互设计专家', {
      description: '覆盖断网、超时、空间不足和客户端退出后的失败提示、保留状态与重试入口。'
    }),
    task(3, '实现文件移动与复制交互', 'todo', 'high', 'agent', 'ag-drive-fe', '云盘前端开发专家', {
      description: '复用现有文件选择与目标目录组件，实现移动、复制、同名冲突和操作反馈。'
    }),
    task(4, '执行文件权限回归检查', 'todo', 'medium', 'agent', 'ag-drive-qa', '云盘测试验收专家', {
      description: '由“每周文件权限回归检查”自动化任务生成，核对个人、项目、群聊和分享链接四类文件权限。',
      automation_id: 'ap-drive-permission'
    }),
    task(5, '补齐云盘空状态与错误提示', 'backlog', 'low', 'agent', 'ag-drive-product', '云盘产品专家', {
      description: '统一空文件夹、无权限、文件不存在和网络失败时的提示与下一步操作。'
    }),
    task(6, '每日云盘设计进展汇总', 'done', 'low', 'squad', 'sq-drive-delivery', '云盘功能交付团', {
      description: '由“每日云盘设计进展汇总”自动化任务生成，已汇总当天进展、阻塞和下一步。',
      automation_id: 'ap-drive-daily', updated_at: '2026-09-02T09:08:00Z'
    })
  ];

  issues.push(
    task(7, '补齐同名文件冲突处理', 'in_progress', 'high', 'member', 'u-linxiao', '林晓', {description:'移动或复制遇到同名文件时提供保留两份与取消路径；失败不删除原文件，在文件功能开发群复核。'}),
    task(8, '验收批量文件操作反馈', 'todo', 'medium', 'member', 'u-hejing', '何静', {description:'覆盖部分成功、部分失败与无权限文件，逐项说明结果并允许重试失败项；在文件验收与反馈群记录复现步骤。'}),
    task(9, '完善文件搜索与空状态说明', 'in_review', 'medium', 'member', 'u-wangyilin', '王宜林', {description:'区分无匹配结果、文件夹为空与无访问权限，搜索结果仅展示当前可访问文件；评审后补充验收记录。'})
  );

  var agentTasks = {};
  agents.forEach(function (agent) {
    agentTasks[agent.id] = issues.filter(function (issue) { return issue.assignee_id === agent.id; }).map(function (issue, index) {
      return {
        id: 'at-' + agent.id + '-' + index, agent_id: agent.id, issue_id: issue.id,
        status: issue.status === 'done' ? 'completed' : issue.status === 'in_progress' ? 'running' : 'queued',
        created_at: issue.created_at, started_at: issue.created_at,
        completed_at: issue.status === 'done' ? issue.updated_at : null,
        kind: issue.automation_id ? 'autopilot' : 'manual', trigger_summary: issue.title
      };
    });
  });

  window.__EVA_DRIVE_DEMO = {
    agents: agents, squads: squads, skills: skills, autopilots: autopilots,
    projects: projects, issues: issues, agentTasks: agentTasks
  };
})();

// Local sample assets for prototype preview/download; never real supplier records.
window.__EVA_FILE_SAMPLE_URLS = {
  'A-2409来料异常分析报告.pdf': 'prototype/assets/file-samples/a-2409-demo.pdf'
};

Object.assign(window.__EVA_FILE_SAMPLE_URLS, {"EVA-上传恢复排查清单.md": "prototype/assets/file-samples/EVA-上传恢复排查清单.md", "EVA-分享权限验收矩阵.csv": "prototype/assets/file-samples/EVA-分享权限验收矩阵.csv", "EVA-会议行动项模板.md": "prototype/assets/file-samples/EVA-会议行动项模板.md"});

Object.assign(window.__EVA_FILE_SAMPLE_URLS, {
  'A-2409现场复核清单.md': 'prototype/assets/file-samples/A-2409现场复核清单.md',
  'A-2409排产影响测算.html': 'prototype/assets/file-samples/A-2409排产影响测算.html',
  'A-2409临时放行评审纪要.docx': 'prototype/assets/file-samples/A-2409临时放行评审纪要.docx.html'
});

Object.assign(window.__EVA_FILE_SAMPLE_URLS, {"供应链晨会行动清单.md":"prototype/assets/file-samples/供应链晨会行动清单.md","A-2409整改证据检查表.csv":"prototype/assets/file-samples/A-2409整改证据检查表.csv","采购合同评审提纲.md":"prototype/assets/file-samples/采购合同评审提纲.md"});

window.__EVA_FILE_DOWNLOAD_FALLBACK_URL = 'prototype/assets/file-samples/file-placeholder.txt';

Object.assign(window.__EVA_FILE_SAMPLE_URLS, {
  '项目复盘备忘.md': 'prototype/assets/file-samples/EVA-会议行动项模板.md',
  '0905-供应链周会纪要.md': 'prototype/assets/file-samples/EVA-会议行动项模板.md',
  'EVA-分享权限验收矩阵.xlsx': 'prototype/assets/file-samples/EVA-分享权限验收矩阵.csv',
  '本季度间接采购需求清单.xlsx': 'prototype/assets/file-samples/EVA-分享权限验收矩阵.csv',
  '核心供应商资质汇总.xlsx': 'prototype/assets/file-samples/EVA-分享权限验收矩阵.csv',
  '秋季发布会素材清单.xlsx': 'prototype/assets/file-samples/EVA-分享权限验收矩阵.csv',
  '合作方准入检查表.xlsx': 'prototype/assets/file-samples/EVA-分享权限验收矩阵.csv'
});

window.__EVA_FILE_PREVIEW_FIXTURES = Object.assign(window.__EVA_FILE_PREVIEW_FIXTURES || {}, {
  'A-2409临时放行评审纪要.docx': {
    pages: [
      {kicker:'供应商质量评审',title:'A-2409 临时放行评审纪要',subtitle:'会议日期：2026-09-08 · 待评审',paragraphs:['A-2409 异常批次已隔离，供应商验证数据与现场复核仍待确认。本纪要用于记录事实、证据缺口和人工决策事项。'],sections:[{title:'一、评审结论',text:'当前资料不足以自动得出临时放行结论。质量复核和排产影响确认后，由王宜林作最终人工决定。'},{title:'二、执行条件',text:'上线前完成 100% 外观检查与关键尺寸复测；异常件单独隔离，并由 SQE 每日汇总复核结果。'}]},
      {kicker:'会议纪要 · 第 2 页',title:'责任人与跟进计划',subtitle:'所有事项须在关闭前留存验证记录',paragraphs:['供应商需在两个工作日内提交 8D 初版，采购负责同步后续交付节奏，生产计划根据复测结果滚动调整。'],sections:[{title:'三、行动项',text:'林晓：完成复测清单；周远：确认补货节点；王宜林：组织 9 月 10 日关闭评审。'},{title:'四、签署',text:'会签尚未完成。质量复核人与项目负责人确认前，不下发放行或排产指令。'}]}
    ]
  },
  'EVA-分享权限验收矩阵.xlsx': {
    sheets: [
      {name:'权限验收',columns:['场景','Owner','Manager','Editor','结果'],rows:[['查看与下载','允许','允许','允许','通过'],['上传与新建','允许','允许','允许','通过'],['成员管理','允许','允许','禁止','通过'],['永久删除','允许','允许','禁止','通过'],['转移所有权','允许','禁止','禁止','通过']]},
      {name:'回归记录',columns:['日期','版本','执行人','通过率'],rows:[['09-05','V3.8','王宜林','100%'],['09-06','V3.9','何静','100%'],['09-07','V4.0','林晓','100%']]}
    ]
  },
  'UI设计师发展前景.pptx': {
    slides: [
      {eyebrow:'2026 行业观察',title:'UI 设计师的发展前景',subtitle:'从界面执行走向体验决策',accent:'violet'},
      {eyebrow:'01 · 行业变化',title:'交付物正在改变',subtitle:'团队更关注业务判断、系统一致性与落地效率',bullets:['AI 降低基础界面制作成本','复杂业务需要更强的信息架构能力','设计与产品、研发的边界继续融合'],accent:'blue'},
      {eyebrow:'02 · 岗位路径',title:'三条可持续成长路线',subtitle:'专家、产品体验负责人、设计工程方向',metric:'3 条路径',accent:'orange'},
      {eyebrow:'03 · 核心能力',title:'把能力建立在问题上',subtitle:'研究、决策、系统化与协作将成为共同底座',bullets:['定义问题','建立证据','推动决策','验证结果'],accent:'green'},
      {eyebrow:'04 · 团队行动',title:'下一步从真实项目开始',subtitle:'用一个季度完成能力盘点和岗位升级试点',metric:'90 天计划',accent:'violet'},
      {eyebrow:'结论',title:'界面能力仍重要，但不再是终点',subtitle:'持续创造可验证的体验价值',accent:'blue'}
    ]
  },
  '项目复盘备忘.md': {
    markdown:{title:'项目复盘备忘',summary:'记录本轮文件库改造中的关键判断、验证结果与后续行动。',sections:[{title:'本轮结论',paragraph:'文件预览与文件信息需要拆成两条清晰路径，用户点击文件名时只进入内容阅读。',items:['预览固定从右侧栏打开','点击内容区即可关闭预览','文件信息仅由三点菜单进入']},{title:'后续行动',paragraph:'补齐不同格式的演示内容，并用同一套验收口径覆盖个人文件和项目文件。',items:['检查 Word 分页效果','检查 Excel 横向滚动','检查 PPT 翻页与 ZIP 目录']}]}
  },
  '品牌视觉素材.zip': {
    archive:{originalSize:'42.8 MB',compressedSize:'24.6 MB',entries:[{path:'品牌规范/',type:'folder',size:'—'},{path:'品牌规范/Logo 使用说明.pdf',type:'PDF',size:'2.4 MB'},{path:'Logo/Octo_Primary.svg',type:'SVG',size:'128 KB'},{path:'Logo/Octo_Monochrome.svg',type:'SVG',size:'96 KB'},{path:'发布物料/秋季发布会-KV.png',type:'PNG',size:'18.7 MB'},{path:'字体/README.txt',type:'TXT',size:'4 KB'}]}
  },
  '新供应商准入合规材料.zip': {
    archive:{originalSize:'31.2 MB',compressedSize:'18 MB',entries:[{path:'01-企业资质/',type:'folder',size:'—'},{path:'01-企业资质/营业执照.pdf',type:'PDF',size:'3.1 MB'},{path:'02-质量体系/ISO9001.pdf',type:'PDF',size:'4.8 MB'},{path:'03-准入检查/现场审核表.xlsx',type:'XLSX',size:'680 KB'},{path:'04-整改记录/问题关闭说明.docx',type:'DOCX',size:'320 KB'}]}
  }
});

// External-link samples stay in the demo-data registry; the file model consumes them as normal resources.
window.__EVA_EXTERNAL_LINK_SAMPLES = [{
  id: 'prod-feishu-docs-link',
  spaceId: 'prod',
  projectId: 'prod',
  area: 'project',
  parent_id: 0,
  name: '供应链项目飞书协作文档',
  type: 'external_link',
  size: 0,
  extension: '',
  external: {url: 'https://www.feishu.cn/', provider: 'feishu', kind: 'document', host: 'www.feishu.cn'},
  creator: '王宜林',
  editor: '未编辑过',
  createdBy: '王宜林',
  updatedBy: '王宜林',
  createdAt: '2026-09-07T14:22:00+08:00',
  updated_at: '2026-09-07T14:22:00+08:00',
  tags: ['协作入口'],
  systemRelations: [],
  source: {type: 'external-link', label: '手动添加外部链接'},
  description: '外部协作文档入口；内容与版本仍由飞书维护'
}, {
  id: 'prod-feishu-folder-link',
  spaceId: 'prod',
  projectId: 'prod',
  area: 'project',
  parent_id: 0,
  name: '供应商飞书交付资料',
  type: 'external_link',
  size: 0,
  extension: '',
  external: {
    url: 'https://example.feishu.cn/drive/folder/fldcnEvaSupplierDemo',
    canonicalUrl: 'https://example.feishu.cn/drive/folder/fldcnEvaSupplierDemo',
    provider: 'feishu',
    kind: 'folder',
    detectedKind: 'folder',
    detection: 'pattern',
    host: 'example.feishu.cn',
    resourceKey: 'feishu:folder:fldcnEvaSupplierDemo'
  },
  creator: '王宜林',
  editor: '未编辑过',
  createdBy: '王宜林',
  updatedBy: '王宜林',
  createdAt: '2026-09-09T10:20:00+08:00',
  updated_at: '2026-09-09T10:20:00+08:00',
  tags: ['供应商', '外部协作'],
  systemRelations: [],
  source: {type: 'external-link', label: '手动添加外部文件夹'},
  description: '外部文件夹访问入口；内容与版本由飞书维护'
}];
