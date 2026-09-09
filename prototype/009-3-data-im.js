(function () {
  'use strict';
  window.__EVA_IM_DEMO = {
    // Sparse initial project unread hints; conversation history and saved user state stay intact.
    projectUnreadSeeds: {
      "c-eva": { unread: 2, atMe: true },
      "th-demo-route": { unread: 1, atMe: false }
    },
    aiTeamSessions: [
  {
    "id": "team-assistant-welcome",
    "identityId": "ai-general",
    "title": "把今天的事情排出先后",
    "messages": [
      {
        "minute": 840,
        "ai": false,
        "text": "今天采购、质量和合同都在催。帮我排一下，先处理什么？"
      },
      {
        "minute": 841,
        "ai": true,
        "text": "先处理 A-2409 来料异常，它可能影响今天排产；其次确认两份到期合同；采购需求汇总可放到下午。\n我把每项的负责人、缺失证据和截止时间整理好了。"
      },
      {
        "minute": 842,
        "ai": false,
        "text": "给我一份十分钟晨会提纲，别只报进度。"
      },
      {
        "minute": 843,
        "ai": true,
        "text": "**晨会只讨论三件事：**\n- 林晓：复测证据是否齐全？\n- 何静：哪些合同条款需要拍板？\n- 周远：采购是否有交付缺口？"
      }
    ]
  },
  {
    "id": "team-persona-welcome",
    "identityId": "persona-initial",
    "title": "供应商催交期，这句话怎么回",
    "messages": [
      {
        "minute": 480,
        "ai": false,
        "text": "供应商催我确认恢复交期。我想回“应该没问题”，你觉得呢？"
      },
      {
        "minute": 481,
        "ai": true,
        "text": "这句话容易被理解成承诺。复测通过了，但现场放行和运输窗口还没确认。现在可以确认的是“正在复核”，还不是“何时恢复”。"
      },
      {
        "minute": 482,
        "ai": false,
        "text": "那替我拟一句，别写得像公文。"
      },
      {
        "minute": 483,
        "ai": true,
        "text": "可以这样回：\n\n> 复测材料我们已经收到，正在安排现场复核。放行和运输时间确认后，我第一时间给你明确交期。\n\n**有进展、有下一步，也不提前承诺。**"
      }
    ]
  },
  {
    "id": "team-rd-review",
    "identityId": "ai-rd",
    "title": "把评审意见变成可验收清单",
    "messages": [
      {
        "minute": 860,
        "ai": false,
        "text": "项目群聊这轮评审意见很多，帮我收成研发能执行的清单。"
      },
      {
        "minute": 861,
        "ai": true,
        "text": "这轮重点验收三项：未入群不能读历史、共享文件不扩大群权限、切换会话不串草稿。先查权限边界，再查交互。"
      },
      {
        "minute": 862,
        "ai": false,
        "text": "给测试同事一条能走通的路径。"
      },
      {
        "minute": 863,
        "ai": true,
        "text": "林晓转存整改报告 → 何静查看共享文件 → 确认何静仍不能读整改群历史。再往返消息与我的 AI，检查草稿是否保留。"
      }
    ]
  }
],
    channels: [
      { id: 'im-eva-octo', name: 'EVA + OCTO 融合推进群', color: '#7567d8', unread: 0, members: 6, lastAt: '2026-09-04T18:20:00+08:00', threads: [], demoOnly: true },
      { id: 'im-delivery', name: '项目交付推进', color: '#66789e', unread: 0, members: 5, lastAt: '2026-09-04T17:30:00+08:00', threads: [], demoOnly: true },
      { id: 'im-review', name: '方案评审', color: '#5f8798', unread: 0, members: 4, lastAt: '2026-09-04T16:42:00+08:00', threads: [], demoOnly: true },
      { id: 'im-meeting', name: '会议跟进', color: '#9a8062', unread: 0, members: 5, lastAt: '2026-09-04T15:40:00+08:00', threads: [], demoOnly: true },
    ],
    messages: {
      'im-eva-octo': [
        { kind: 'divider', text: '9月4日' },
        { kind: 'text', sender: { uid: 'u-haozong', name: '昊总', color: '#6f75a8', online: true }, time: '17:42', text: 'EVA+OCTO融合性怎么样了？' },
        { kind: 'text', sender: { uid: 'u-kangzhixi', name: '康执玺', color: '#4c83a5', online: true }, time: '17:45', text: '@Eva 项目管理专员 汇报一下最新进展和情况。', mentions: [{ name: '@Eva 项目管理专员', uid: 'b-eva-octo' }] },
        { kind: 'text', sender: { uid: 'b-eva-octo', name: 'Eva 项目管理专员', kind: 'project-agent', identityAppearance: window.EvaAIIdentity.projectAgentAppearance(), color: '#7567d8', ai: true, online: true }, time: '17:47', text: "### 项目进展与待确认项\n\n**进展**：消息、Loop 任务与团队文件的演示链路已贯通，统一 IM 会话框架正在收口。\n\n| 待确认项 | 影响 | 下一步 |\n| --- | --- | --- |\n| 任务触发后的身份与权限 | 可能影响可见范围 | 完成联调与权限核对 |\n| 数字员工异常恢复 | 失败后的处理不明确 | 确定重试与人工接管方式 |\n| 验收口径 | 影响交付判断 | 明确可验收结果与责任人 |\n\n> 上述为演示进展摘要，不代表已完成上线验收。" },
        { kind: 'text', sender: { uid: 'u-haozong', name: '昊总', color: '#6f75a8', online: true }, time: '17:55', text: '需要在月底前上线，并打通数字员工，让数字员工进入任务协作。' },
        { kind: 'text', sender: { uid: 'u-kangzhixi', name: '康执玺', color: '#4c83a5', online: true }, time: '18:02', text: '@Eva 项目管理专员 创建前面这个任务，并指定 @威少 做负责人。', mentions: [{ name: '@Eva 项目管理专员', uid: 'b-eva-octo' }, { name: '@威少', uid: 'u-weishao' }] },
        { kind: 'text', sender: { uid: 'b-eva-octo', name: 'Eva 项目管理专员', kind: 'project-agent', identityAppearance: window.EvaAIIdentity.projectAgentAppearance(), color: '#7567d8', ai: true, online: true }, time: '18:03', text: '任务已创建，负责人已指定为威少。' },
        { kind: 'refcard', sender: { uid: 'b-eva-octo', name: 'Eva 项目管理专员', kind: 'project-agent', identityAppearance: window.EvaAIIdentity.projectAgentAppearance(), color: '#7567d8', ai: true, online: true }, time: '18:03', ref: { target: 'issue', title: '月底前完成 EVA + OCTO 融合上线并接入数字员工', spaceName: 'EVA + OCTO 融合推进群', desc: '负责人：威少 · 截止：本月底', allowed: true, issueId: 'issue22' } }
      ],
      'im-delivery': [
        { kind: 'divider', text: '9月4日' },
        { kind: 'text', sender: { uid: 'u-chenbo', name: '陈博', color: '#8c658f', online: true }, time: '16:58', text: '客户演示环境已经更新，请把今天的交付风险和负责人一起收口。' },
        { kind: 'text', sender: { uid: 'u-wangyilin', name: '王宜林', color: '#557a94', online: true }, time: '17:02', text: '@王宜林的 AI 分身 请根据群内结论整理交付清单。', mentions: [{ name: '@王宜林的 AI 分身', uid: 'b-wangyilin' }] },
        { kind: 'text', sender: { uid: 'b-wangyilin', name: '王宜林的 AI 分身', color: '#7567d8', ai: true, online: true }, time: '17:05', text: "### 交付前检查清单\n\n- [ ] **演示环境**：确认入口与目标版本一致。\n- [ ] **关键链路**：逐项确认消息、任务、文件之间的跳转。\n- [ ] **现场兜底**：明确异常处理人和备用演示路径。\n\n**待补充**：请各项负责人确认自己的截止时间；确认前不标记完成。" },
        { kind: 'taskcard', sender: { uid: 'b-wangyilin', name: '王宜林的 AI 分身', color: '#7567d8', ai: true, online: true }, time: '17:06', note: '由群聊结论创建，负责人和截止时间已同步。' }
      ],
      'im-review': [
        { kind: 'divider', text: '9月4日' },
        { kind: 'text', sender: { uid: 'u-wangyilin', name: '王宜林', color: '#557a94', online: true }, time: '16:35', text: '@王宜林的 AI 分身 读取附件，给出本次评审最需要确认的三项。', mentions: [{ name: '@王宜林的 AI 分身', uid: 'b-wangyilin' }] },
        { kind: 'file', sender: { uid: 'u-chenbo', name: '陈博', color: '#8c658f', online: true }, time: '16:36', file: { name: 'EVA-OCTO融合方案评审稿.pdf', size: 2726297, extension: 'pdf' } },
        { kind: 'text', sender: { uid: 'b-wangyilin', name: '王宜林的 AI 分身', color: '#7567d8', ai: true, online: true }, time: '16:42', text: '需要确认：一、IM 内核与 Eva 外壳的边界；二、AI 身份与权限继承；三、上线前的回归范围。文档第 6、11、18 页分别给出了对应方案。' }
      ],
      'im-meeting': [
        { kind: 'divider', text: '9月4日' },
        { kind: 'text', sender: { uid: 'u-kangzhixi', name: '康执玺', color: '#4c83a5', online: true }, time: '15:22', text: '刚才会议里有结论、有行动项，也有一个待确认风险。' },
        { kind: 'text', sender: { uid: 'u-wangyilin', name: '王宜林', color: '#557a94', online: true }, time: '15:24', text: '@王宜林的 AI 分身 按这三类整理，并把行动项转成任务。', mentions: [{ name: '@王宜林的 AI 分身', uid: 'b-wangyilin' }] },
        { kind: 'text', sender: { uid: 'b-wangyilin', name: '王宜林的 AI 分身', color: '#7567d8', ai: true, online: true }, time: '15:28', text: '已完成分类：结论 2 项、行动项 3 项、待确认风险 1 项。行动项已转成任务并关联到原会议。' }
      ]
    }
  };
})();

// Contacts demo: additional personas of existing colleagues; no new people or projects.
window.__EVA_CONTACT_PERSONAS = [
  {id:'clone-zhouyuan',ownerId:'u-zhouyuan',name:'周远的 AI 分身'},
  {id:'clone-suhang',ownerId:'u-suhang',name:'苏航的 AI 分身'}
];
window.__EVA_CONTACT_IDENTITY_ALIASES = {'b-wangyilin':'persona-initial','clone-wangyilin-procurement':'persona-initial','contact-clone:lin:quality':'clone-linxiao','contact-clone:lin:report':'clone-linxiao'};

window.__EVA_IM_MARKDOWN_UPGRADES = {
  "已归为三项：成员权限、群文件共享、入口切换。每项都补了触发条件和预期结果。\n优先验证：未入群不能读历史；转存文件不授予来源群权限；切换会话不残留上一条草稿。": "### 评审意见 → 可验收清单\n\n| 范围 | 触发条件 | 预期结果 |\n| --- | --- | --- |\n| 成员权限 | 未加入整改群的成员打开会话 | 不可读取群历史 |\n| 文件共享 | 报告转存到项目团队文件 | 可读共享文件，不获得来源群权限 |\n| 入口切换 | 消息与我的 AI 往返 | 选中态正确，草稿不串会话 |\n\n**优先级**：先核对访问边界，再检查入口状态。以上是验收标准，不表示检查已通过。",
  "用林晓身份进入供应链项目 → 打开已加入的整改群 → 转存报告到项目团队文件 → 切换何静，只查看共享文件 → 确认她仍不能读取整改群历史。\n再往返消息与我的 AI，检查选中态、输入区和草稿。": "### 最小验收路径\n\n1. 以 **林晓** 身份进入供应链运营协同项目。\n2. 打开已加入的整改群，将报告转存到项目团队文件。\n3. 切换 **何静**，确认能查看共享报告。\n4. 尝试访问来源整改群，确认仍无法读取群历史。\n5. 往返“消息”和“我的 AI”，核对选中态、输入区和草稿。\n\n> 文件的共享范围与来源群的访问权限必须分开。\n\n- [ ] 文件内容与来源一致\n- [ ] 群历史没有额外开放\n- [ ] 草稿保留在原会话中",
  "23:10 巡检：发现一项失败——从项目群聊返回消息后，仍保留上一入口的筛选条件。已整理复现步骤和影响范围，其余检查通过。": "### 23:10 巡检 · 1 项异常\n\n**问题**：从项目群聊返回消息后，仍保留上一入口的筛选条件。\n\n**复现路径**\n1. 进入项目群聊并设置筛选。\n2. 返回消息入口。\n3. 观察列表是否仍使用原筛选。\n\n**影响**：可能误以为会话丢失；不代表消息数据被删除。\n\n> 当前是演示巡检记录。保留失败证据，修复后需重新执行入口往返。",
  "只需看一项发布决定。检查结果与复现记录已经放在摘要中；建议确认当前目标版本后再发布。你确认之前，我会继续观察新增失败。": "### 早间待办：确认是否发布\n\n- **已整理**：检查结果、失败复现与修复后的复核记录。\n- **待你确认**：当前目标版本是否就是计划交付的版本。\n- **仍未执行**：正式发布。\n\n> 检查通过与发布授权是两件事。你确认之前，继续观察新增失败。"
};

window.__EVA_IM_RICH_FOLLOWUPS = [];
window.__EVA_IM_COMPACT_COPY = {"### 十分钟晨会提纲\n\n1. **质量 · 林晓（4 分钟）**：复测证据是否齐全？何时能给出放行建议？\n2. **合同 · 何静（3 分钟）**：哪些条款需要今天拍板？\n3. **采购 · 周远（3 分钟）**：采购需求是否存在交付缺口？\n\n会后统一记录：**结论 / 负责人 / 截止时间**。\n\n> 未确认的交期保持“待核实”，不要在纪要中写成承诺。": "**晨会只讨论三件事：**\n- 林晓：复测证据是否齐全？\n- 何静：哪些合同条款需要拍板？\n- 周远：采购是否有交付缺口？", "### A-2409 · 夜间跟进摘要\n\n| 检查项 | 当前状态 | 后续动作 |\n| --- | --- | --- |\n| 原因分析 | 已收齐 | 核对与异常批次的对应关系 |\n| 复测证据 | 三项指标符合要求 | 质量负责人现场复核 |\n| 恢复交期 | 待确认 | 获得现场确认后再更新 |\n\n**需要你决定：是否安排质量负责人现场复核？**\n\n> 建议通过复核后再决定放行。供应商预计时间不等于已确认交期。": "复测记录已补齐，但现场放行和恢复交期仍待确认。建议今天安排质量负责人复核；通过后再讨论放行。", "### 评审意见 → 可验收清单\n\n| 范围 | 触发条件 | 预期结果 |\n| --- | --- | --- |\n| 成员权限 | 未加入整改群的成员打开会话 | 不可读取群历史 |\n| 文件共享 | 报告转存到项目团队文件 | 可读共享文件，不获得来源群权限 |\n| 入口切换 | 消息与我的 AI 往返 | 选中态正确，草稿不串会话 |\n\n**优先级**：先核对访问边界，再检查入口状态。以上是验收标准，不表示检查已通过。": "这轮重点验收三项：未入群不能读历史、共享文件不扩大群权限、切换会话不串草稿。先查权限边界，再查交互。", "### 最小验收路径\n\n1. 以 **林晓** 身份进入供应链运营协同项目。\n2. 打开已加入的整改群，将报告转存到项目团队文件。\n3. 切换 **何静**，确认能查看共享报告。\n4. 尝试访问来源整改群，确认仍无法读取群历史。\n5. 往返“消息”和“我的 AI”，核对选中态、输入区和草稿。\n\n> 文件的共享范围与来源群的访问权限必须分开。\n\n- [ ] 文件内容与来源一致\n- [ ] 群历史没有额外开放\n- [ ] 草稿保留在原会话中": "林晓转存整改报告 → 何静查看共享文件 → 确认何静仍不能读整改群历史。再往返消息与我的 AI，检查草稿是否保留。", "### 23:10 巡检 · 1 项异常\n\n**问题**：从项目群聊返回消息后，仍保留上一入口的筛选条件。\n\n**复现路径**\n1. 进入项目群聊并设置筛选。\n2. 返回消息入口。\n3. 观察列表是否仍使用原筛选。\n\n**影响**：可能误以为会话丢失；不代表消息数据被删除。\n\n> 当前是演示巡检记录。保留失败证据，修复后需重新执行入口往返。": "发现一个问题：从项目群返回消息后，旧筛选条件仍然保留。复现步骤已记录，需要修复后重走这条路径。", "### 早间待办：确认是否发布\n\n- **已整理**：检查结果、失败复现与修复后的复核记录。\n- **待你确认**：当前目标版本是否就是计划交付的版本。\n- **仍未执行**：正式发布。\n\n> 检查通过与发布授权是两件事。你确认之前，继续观察新增失败。": "检查结果和复现记录已整理。你只需确认目标版本与是否发布；确认前我不会执行发布。"};

window.__EVA_PERSONA_SHORT_DEMO = {"team-persona-welcome": ["A-2409 现在能恢复供货了吗？", "还不能确认。复测记录已补齐，但现场放行和运输窗口仍待确认，建议先安排质量复核。", "帮我列一下接下来要做的事。", "**下一步：**\n- 林晓核对批次与复测记录。\n- 质量负责人确认放行条件。\n- 放行后再确定运输和交期。"]};

window.__EVA_PERSONA_VARIETY_DEMO = {"team-persona-welcome": {"title": "供应商催交期，这句话怎么回", "texts": ["供应商催我确认恢复交期。我想回“应该没问题”，你觉得呢？", "这句话容易被理解成承诺。复测通过了，但现场放行和运输窗口还没确认。现在可以确认的是“正在复核”，还不是“何时恢复”。", "那替我拟一句，别写得像公文。", "可以这样回：\n\n> 复测材料我们已经收到，正在安排现场复核。放行和运输时间确认后，我第一时间给你明确交期。\n\n**有进展、有下一步，也不提前承诺。**"]}};

// Prototype-only L2 departments; these are illustrative, not HR directory data.
window.__EVA_CONTACT_L2_DEPARTMENTS={
  'u-wangyilin':'人工智能中心',
  'u-hejing':'数智化中心',
  'u-linxiao':'质量中心',
  'u-zhouyuan':'制造中心',
  'u-suhang':'研发中心'
};

// User-approved additional demo in the existing team-file project.
window.__EVA_DRIVE_CHAT_DEMO = [
  {id:'drive-product-design',name:'文件体验设计',threads:[{id:'drive-share-review',name:'分享链接权限评审'}],messages:{
    'drive-product-design':[
      {kind:'text',sender:{uid:'u-wangyilin',name:'王宜林'},time:'09:10',text:'这一轮先收口分享权限和上传恢复。DRIVE-1 的方案评审意见放到子区，DRIVE-2 继续补断网后的状态说明。'},
      {kind:'text',sender:{uid:'u-hejing',name:'何静'},time:'09:16',text:'分享链接需要明确有效期和撤销结果，不能让“能看文件”被理解成“加入来源群”。我把这点写进验收口径。'}],
    'drive-share-review':[{kind:'text',sender:{uid:'u-wangyilin',name:'王宜林'},time:'10:05',text:'DRIVE-1 评审结论：先支持查看权限；撤销后再次打开应提示链接失效，文件原有项目权限不变。待方案确认后再开发。'}]}},
  {id:'drive-development',name:'文件功能开发',threads:[{id:'drive-upload-recovery',name:'上传失败与重试'}],messages:{
    'drive-development':[
      {kind:'text',sender:{uid:'u-wangyilin',name:'王宜林'},time:'10:20',text:'DRIVE-3 的移动和复制先复用目标目录选择器。新增 DRIVE-7 跟进同名冲突处理，避免覆盖文件时没有确认。'},
      {kind:'text',sender:{uid:'u-linxiao',name:'林晓'},time:'10:28',text:'先按保留两份和取消两条路径实现，失败时保留原文件。完成后交给验收群复核。'}],
    'drive-upload-recovery':[{kind:'text',sender:{uid:'u-wangyilin',name:'王宜林'},time:'11:00',text:'DRIVE-2 还缺客户端重启场景：重新打开后能看到失败原因和重试入口，不能显示上传成功。'}]}},
  {id:'drive-acceptance',name:'文件验收与反馈',threads:[],messages:{
    'drive-acceptance':[
      {kind:'text',sender:{uid:'u-wangyilin',name:'王宜林'},time:'14:00',text:'DRIVE-8 检查批量操作反馈，DRIVE-9 检查搜索和空状态。请记录操作步骤、实际结果和截图，暂不把待验证项标成通过。'},
      {kind:'text',sender:{uid:'u-hejing',name:'何静'},time:'14:12',text:'收到。权限仍按 DRIVE-4 的矩阵检查，重点复核项目文件与来源群历史的隔离。'}]}}
];

window.__EVA_OFFICIAL_COMMUNITY_DEMO = {
  "id": "official-community",
  "name": "用户使用反馈与开发交流",
  "humans": [
    "u-wangyilin",
    "u-linxiao",
    "u-hejing",
    "u-zhouyuan"
  ],
  "cloneIds": [
    "b-wangyilin"
  ],
  "threads": [
    {
      "id": "official-upload-help",
      "name": "大文件上传失败反馈"
    },
    {
      "id": "official-sharing-help",
      "name": "分享链接权限答疑"
    },
    {
      "id": "official-meeting-help",
      "name": "用 AI 整理会议行动项"
    }
  ],
  "messages": {
    "official-community": [
      {
        "kind": "text",
        "senderId": "u-wangyilin",
        "time": "09:00",
        "text": "欢迎大家在这里反馈 Eva 的使用问题。请描述操作过程和期望结果，我们会结合 AI 分析、文件清单和任务跟进处理。"
      },
      {
        "kind": "text",
        "senderId": "u-hejing",
        "time": "09:05",
        "text": "我上传一个大文件时切换了网络，进度停住了。我开一个子区详细说一下。"
      },
      {
        "kind": "text",
        "senderId": "u-zhouyuan",
        "time": "09:08",
        "text": "我想确认分享文件会不会同时开放群历史，已在权限答疑子区补充场景。"
      },
      {
        "kind": "text",
        "senderId": "u-wangyilin",
        "time": "11:00",
        "text": "@Eva 项目管理专员 汇总今天这三条反馈的处理状态，区分已经给出的帮助和仍在开发的功能。"
      },
      {
        "kind": "text",
        "senderId": "project-agent:official",
        "time": "11:01",
        "text": "### 今天的反馈进展\n\n| 反馈 | 已提供 | 后续任务 |\n| --- | --- | --- |\n| 上传失败 | 排查清单和验收步骤 | EVA-101 进行中 |\n| 分享权限 | 规则说明与测试矩阵 | EVA-102 审核中 |\n| 会议行动项 | 可下载模板 | EVA-103 待办 |\n\n**这些是演示任务状态，不表示修复已上线。** 用户可先使用排查清单与模板，开发结果由团队复核后同步。"
      }
    ],
    "official-upload-help": [
      {
        "kind": "text",
        "senderId": "u-hejing",
        "time": "09:10",
        "text": "文件大约 800 MB，上传到一半从 Wi-Fi 切到有线后一直不动。重新点上传会不会多一份？"
      },
      {
        "kind": "text",
        "senderId": "u-wangyilin",
        "time": "09:12",
        "text": "@王宜林的 AI 分身 根据这个现象整理排查步骤和验收清单，缺少的信息先列出来，不要猜错误原因。"
      },
      {
        "kind": "text",
        "senderId": "b-wangyilin",
        "time": "09:13",
        "text": "### 先确认失败状态，再重试\n\n目前只能确认**切换网络后进度停止**，还不能判断上传是否完成。\n\n1. 查看文件列表中是否已出现目标文件。\n2. 记录客户端版本、发生时间和错误提示。\n3. 请开发侧确认重试是否复用原上传记录。\n\n> 暂时不要反复新建上传，避免产生重复项。\n\n我整理了排查与验收清单，见附件。"
      },
      {
        "kind": "file",
        "senderId": "b-wangyilin",
        "time": "09:14",
        "file": {
          "name": "EVA-上传恢复排查清单.md",
          "size": 552,
          "extension": "md"
        }
      },
      {
        "kind": "text",
        "senderId": "u-linxiao",
        "time": "09:18",
        "text": "这个提示确实不够清楚。我来跟进失败原因和重试反馈，验收会覆盖网络切换与客户端重启。"
      },
      {
        "kind": "text",
        "senderId": "u-wangyilin",
        "time": "09:20",
        "text": "@Eva 项目管理专员 把已确认范围登记为上传恢复任务，负责人林晓，先标进行中；没有复核前不要标完成。"
      },
      {
        "kind": "text",
        "senderId": "project-agent:official",
        "time": "09:21",
        "text": "已登记 EVA-101，关联上述排查清单。验收重点是失败记录保留、重试去重和重启后的恢复入口。"
      },
      {
        "kind": "refcard",
        "senderId": "project-agent:official",
        "time": "09:21",
        "ref": {
          "target": "issue",
          "title": "EVA-101 · 修复上传失败后的重试反馈",
          "spaceName": "EVA Official Space",
          "desc": "负责人：林晓 · 进行中",
          "allowed": true,
          "issueId": "official-101"
        }
      },
      {
        "kind": "text",
        "senderId": "u-hejing",
        "time": "09:25",
        "text": "明白，我先检查文件列表，补充版本和时间，后续在这条任务下面跟进。"
      }
    ],
    "official-sharing-help": [
      {
        "kind": "text",
        "senderId": "u-zhouyuan",
        "time": "10:00",
        "text": "我把项目文件分享给不在原群里的同事，他会看到原群聊天记录吗？"
      },
      {
        "kind": "text",
        "senderId": "u-wangyilin",
        "time": "10:02",
        "text": "@王宜林的 AI 分身 解释文件权限与群权限的区别，给一份开发可以直接复核的权限矩阵。"
      },
      {
        "kind": "text",
        "senderId": "b-wangyilin",
        "time": "10:03",
        "text": "### 分享文件不等于加入来源群\n\n- **文件访问**取决于项目权限或分享链接授权。\n- **群历史**仍取决于是否加入该群。\n- 撤销链接后，该链接应失效；接收者原有的项目权限不因此被撤销。\n\n我把关键场景整理为 CSV，所有检查项先标记为“待验证”，由开发团队逐项复核。"
      },
      {
        "kind": "file",
        "senderId": "b-wangyilin",
        "time": "10:04",
        "file": {
          "name": "EVA-分享权限验收矩阵.csv",
          "size": 321,
          "extension": "csv"
        }
      },
      {
        "kind": "text",
        "senderId": "u-wangyilin",
        "time": "10:07",
        "text": "@Eva 项目管理专员 登记权限隔离复核任务，由我负责，按附件矩阵验收。"
      },
      {
        "kind": "text",
        "senderId": "project-agent:official",
        "time": "10:08",
        "text": "已登记 EVA-102，当前审核中。完成条件：分享访问、撤销链接、来源群历史及跨项目访问均有复核记录。"
      },
      {
        "kind": "refcard",
        "senderId": "project-agent:official",
        "time": "10:08",
        "ref": {
          "target": "issue",
          "title": "EVA-102 · 验证分享链接与来源群权限隔离",
          "spaceName": "EVA Official Space",
          "desc": "负责人：王宜林 · 审核中",
          "allowed": true,
          "issueId": "official-102"
        }
      },
      {
        "kind": "text",
        "senderId": "u-zhouyuan",
        "time": "10:10",
        "text": "这样清楚了，我需要的是只共享文件，不把讨论内容一起开放。"
      }
    ],
    "official-meeting-help": [
      {
        "kind": "text",
        "senderId": "u-hejing",
        "time": "10:30",
        "text": "会议纪要很长，能不能让 AI 帮我整理下一步，但不要自动替大家安排时间？"
      },
      {
        "kind": "text",
        "senderId": "u-wangyilin",
        "time": "10:32",
        "text": "@王宜林的 AI 分身 给一个会议行动项模板，负责人和截止时间不明确的地方留待确认，并解释怎么转成任务。"
      },
      {
        "kind": "text",
        "senderId": "b-wangyilin",
        "time": "10:33",
        "text": "### 先整理，再确认\n\n| 字段 | 处理方式 |\n| --- | --- |\n| 行动项 | 从明确结论提取 |\n| 负责人 | 未点名则留“待指定” |\n| 截止时间 | 未约定则留“待确认” |\n| 完成标准 | 写可检查的结果 |\n\n人工确认后，再通过项目里的**新建任务**登记。分派给 AI 不等于立即执行。\n\n下面是可复用的 Markdown 模板。"
      },
      {
        "kind": "file",
        "senderId": "b-wangyilin",
        "time": "10:34",
        "file": {
          "name": "EVA-会议行动项模板.md",
          "size": 441,
          "extension": "md"
        }
      },
      {
        "kind": "text",
        "senderId": "u-hejing",
        "time": "10:36",
        "text": "这个流程合适，我会先让参会人确认，不让 AI 替大家承诺。"
      },
      {
        "kind": "text",
        "senderId": "u-wangyilin",
        "time": "10:38",
        "text": "@Eva 项目管理专员 登记一个文档改进任务，把这套上手示例加进说明，负责人是我。"
      },
      {
        "kind": "text",
        "senderId": "project-agent:official",
        "time": "10:39",
        "text": "已登记 EVA-103，待办。交付内容包括行动项模板、人工确认步骤和创建任务示例。"
      },
      {
        "kind": "refcard",
        "senderId": "project-agent:official",
        "time": "10:39",
        "ref": {
          "target": "issue",
          "title": "EVA-103 · 补充会议行动项上手示例",
          "spaceName": "EVA Official Space",
          "desc": "负责人：王宜林 · 待办",
          "allowed": true,
          "issueId": "official-103"
        }
      }
    ]
  }
};

window.__EVA_MY_AI_GROUP_STORIES=[
 {id:'supply-brief',name:'保供晨会',request:'请把供应链运营协同的晨会重点整理出来，按风险、证据、下一步排列。',reply:'## 今日保供晨会\n\n**先处理影响排产的事项，再讨论常规进度。**\n\n| 事项 | 当前风险 | 下一步 |\n| --- | --- | --- |\n| A-2409 来料异常 | 放行证据待补 | 复核 8D 与验证照片 |\n| 关键件交期 | 齐套窗口待确认 | 核对排产需求 |\n| 到期合同 | 续签条款待评审 | 汇总待决策项 |\n\n> 以上是演示材料整理，交期和放行结论仍由人类确认。',follow:'很好，请把晨会行动清单做成文件，每项写清需要确认什么。',file:'供应链晨会行动清单.md',content:'# 供应链晨会行动清单\n\n演示样本，不代表真实业务结论。\n\n- [ ] A-2409：确认隔离范围、复测结果和放行签字。\n- [ ] 关键件：确认需求日期、供应商交期和运输窗口。\n- [ ] 合同：确认续签范围、价格条款和审批材料。\n'},
 {id:'supplier-evidence',name:'供应商整改',request:'帮我检查 A-2409 整改证据是否完整，不要直接给放行结论。',reply:'## 整改证据核对\n\n### 已具备\n- 隔离措施说明\n- 初步原因分析\n\n### 仍需补充\n1. **长期措施验证**：复测样本与统计结果。\n2. **现场证据**：措施实施前后的照片。\n3. **签字记录**：质量负责人确认。\n\n**建议：保持待复核，暂不承诺恢复交付。**',follow:'按这个结构生成一份证据检查表，我来补齐材料并确认。',file:'A-2409整改证据检查表.csv',content:'检查项,当前情况,待补材料\n隔离措施,已有说明,隔离范围确认\n长期措施,待验证,复测样本与统计结果\n现场证据,待补充,实施前后照片\n放行签字,待确认,质量负责人签字\n'},
 {id:'contract-review',name:'合同评审',request:'整理本轮采购合同评审要点，区分已经明确和需要我决策的事项。',reply:'## 合同评审摘要\n\n**已明确**\n- 本轮先核对续签范围与到期节点。\n- 保留现有履约记录作为评审依据。\n\n**需要你决策**\n| 条目 | 待确认内容 |\n| --- | --- |\n| 价格调整 | 是否接受新的计价口径 |\n| 交付窗口 | 是否与实际排产一致 |\n| 违约责任 | 是否需要进一步评审 |\n\n> 我只整理条款差异，不代你确认商务条件。',follow:'生成评审提纲文件，保留待确认项，我会发给同事讨论。',file:'采购合同评审提纲.md',content:'# 采购合同评审提纲\n\n演示样本，仅供场景讨论。\n\n## 核对事项\n- 续签范围和到期节点\n- 计价口径与价格调整\n- 交付窗口与排产需求\n- 违约责任与履约记录\n\n## 人工确认\n逐项记录结论、依据与后续动作，未确认前不作对外承诺。\n'}
];
