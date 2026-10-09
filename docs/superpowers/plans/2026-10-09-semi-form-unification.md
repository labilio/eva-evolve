# Eva Semi Form 统一实施计划

> 按用户已确认方案在当前会话实施；使用 executing-plans 工作流。用户已授权开工、本地截图与测试版，未授权合并 main。

**Goal:** 非自动化业务的提交式表单统一使用 Semi Form，统一反馈和提交行为，提供全部改动入口的前后截图及可访问的本地测试版。

**Architecture:** 使用同一个构建模块导出原生 Form、withField 和共享提交 Hook；semiGlobal 只定义默认参数，现有主题提供样式。业务保留字段规则、权限、事务及持久化；不建设 schema 表单框架，不复制业务控件。

**Tech Stack:** 现有 React/ReactDOM，Semi UI 2.103.0，esbuild，Edge/Playwright。

**Spec:** 本会话 2026-10-09 已确认的统一配置、公共交互、检查与例外方案。

## 约束
- 基线 origin/main = 009e5c9；分支 codex/folder-semi-form；保留已有新建分组试改。
- 自动化任务、评审批注工具不迁移。搜索、筛选、即时设置、聊天输入及无字段确认不强行使用提交式校验。
- 不改变身份、权限、数据源、路由、三栏、标题栏和业务事务。Demo 使用既有供应链项目。
- 空值/格式错误不能禁用提交；权限不足、加载及保存中仍保持限制。
- 初次无错，提交校验，失败后修改重验；字段错误行内展示；非字段失败表单级展示；取消重开不残留。
- 用户追加要求：保持既有字号、字重、行间距、标签层级、布局和控件尺寸；Semi 只接管数据与校验，不把原生默认排版当作新设计。以改前截图和 computed style 逐项比对，错误提示仅增加必要空间。
- 不引入第二个 React 渲染器；统一模块初始化一次；不修改 vendor 源文件。

## Review Focus
- 中文输入法 Enter 不提前提交；多行 Enter 保留换行。
- 重复提交、异步取消和切换对象后迟到结果不污染新表单。
- 数据层权限/重名/事务校验保留；存储失败不伪装成某个字段错误。
- 跨字段联动、初始值重置和自定义成员/日期/标签组件继续正常工作。
- 错误行增加高度后按钮可达、焦点可见、暗色可读。

## 执行清单
- [x] 检查 worktree、远端基线和既有修改。
- [ ] 记录所有提交式业务入口和例外，完成改前截图。
- [ ] 公共模块：原生默认配置、共享提交锁/再校验/焦点/生命周期；测试空提交、异步失败、重开。
- [ ] 迁移个人分组、重命名/移动、关注分类、个人助理及 AI 配置提交式入口。
- [ ] 迁移共用成员模板及调用方（项目、群、小队、添加/转让），保留身份和事务。
- [ ] 迁移项目设置、任务创建、标签/技能、文件命名及其他盘点出的提交式入口。
- [ ] 添加统一规范、入口清单、原生配置覆盖约束与检查，删除失效的手写错误实现。
- [ ] 完成相关测试、构建、manifest/project/补丁合同和模块语法检查。
- [ ] Edge 全入口空提交/修正/保存/重开/往返验收，逐项截图前后对比。
- [ ] 启动并核实本地测试版，汇报实际改动与验收证据，等待用户验收。

## 当前盘点（需继续检查调用链）
| 能力 | 实现入口 | 状态 |
|---|---|---|
| 新建个人分组 | 063-personal-folder-form.jsx / 009-7 | 已接公共模块，空提交/重开已有浏览器验收 |
| 重命名/移动个人会话和分组 | 052-personal-eva-gds.js | 待迁移 |
| 关注分类 | EvaConversationCategoryEditor / 009-5 | 待迁移 |
| 个人助理 | EvaAssistantEditor / 009-5 | 已迁移，创建、模板、跨页签、头像及编辑回显已验证 |
| AI 小队创建/编辑 | EvaAITeamGroupEditor / 009-5 | 核对共用成员模板 |
| 项目/群创建及成员添加 | MemberPicker / 009-2-members-ui.js | 公共组件已迁移，各调用方仍需完整验收 |
| 转让/项目角色/文件库保存 | 009-2-members-ui.js | 已迁移；角色、接任者、文件保存验收通过，转让各入口待覆盖 |
| 群聊资料编辑 | 009-2-chat-settings.js | 公共 EditRow 已迁移，群名已验收，其他字段待覆盖 |
| 项目设置 | 009-6-patch-general.js | 基本信息已迁移，名称、周期、动态目标/里程碑及前缀已验证 |
| 任务创建 | 049-loop-task-create.js | 已迁移；改用 Semi Button，业务单测20项及实际创建通过 |
| 技能创建/ZIP导入 | 058-project-skill-create.js | 已迁移；原ZIP完整业务回归及草稿切换、空提交通过 |
| 项目文件命名 | 009-1-project-files-ui.js / NameDialog | 已迁移，新建和重命名通过针对性验收 |
| 一级文件库及外部资源、移动、标签、快捷方式 | 020-mode-layer.js、009-1-project-files-ui.js | 已发现活跃入口，待迁移 |
| 子区创建 | ThreadCreateForm/Dialog | 待核对活跃调用 |
| 数字员工加入项目 | 047-digital-employees.js | 核对共用成员模板 |

## 进行中记录（不是完成声明）

- 统一构建模块已改为 `eva-forms.module.js`，通过 `createForms(React,ReactDOM)` 复用既有渲染器；现有所有已迁移入口共用这个模块的 Semi 实例。旧分组独立构建已移除。
- `063-forms.jsx` 导出原生 Form/withField、useSubmission、SubmissionError、原生输入/多行适配。`063-form-policy.js` 提交锁覆盖验证至保存阶段；重置隔离迟到结果。注意继续检查其他入口的生命周期和异步业务回调。
- 新建分组、MemberPicker、SinglePersonPicker、聊天信息 EditRow 已接入。MemberPicker 各业务调用方仍需逐项走完验收及截图；SinglePersonPicker 和 EditRow 尚需完整浏览器验收。
- Edge 测试 `personal-folder-form.mjs`、`form-migration.mjs` 合计 2/2 通过；提交锁单测 2/2 通过。构建、manifest(115)、project 检查通过（后续新增修改需复验）。
- MemberPicker 正常态 computed style 对比：字号/字重/行高、输入框与标签坐标尺寸、成员面板坐标尺寸、姓名坐标尺寸均与改前完全一致。证据脚本 `/tmp/eva-form-geometry.mjs`，截图 `/tmp/eva-forms-comparison/group-normal-{before,after}.png`。
- 旧 `member-picker-template.mjs` 在群聊信息的一条已不存在文案处超时。对未修改基线 `/tmp/eva-folder-before-dist` 重跑，完全相同位置失败；不可当作本次回归，也不可声称全套通过。继续用针对实际业务行为的迁移测试覆盖，并在最终报告如实说明。
- 改前独立静态产物 `/tmp/eva-folder-before-dist` 保留，供所有后续入口复现基线；前后截图目录 `/tmp/eva-forms-comparison`，原分组截图 `/tmp/eva-folder-form-comparison`。新截图不入仓。
- 本地 worktree 测试服务仍在 4902；这是开发中版本，不是全量迁移验收版。
- 聊天信息群聊名称：Edge 已验证空提交行内提示、修改后保存、重新进入读取；正常态字号/字重/行高及全部检查元素坐标尺寸与基线一致。截图 `chat-name-{normal,error}-{before,after}.png`。清空字段时 Semi 默认从 values 删除空值，显示层必须回退为空字符串而非旧初始值；已修正此项。

- 任务创建正常态标题、描述、工具栏、页脚的坐标尺寸、字号、字重和行高均与基线一致；空提交聚焦、修正后实际创建成功。新增 `tests/browser/task-form-migration.mjs` 通过。
- Ruling：撤掉未生效的 NameInputModal 迁移。项目 FilesView 已由独立 React 模块取代，真实入口是 `009-1-project-files-ui.js`；一级文件库另有 `020-mode-layer.js` 活跃表单，必须继续迁移，旧组件修改不能作为覆盖证明。
- 项目 NameDialog 接入公共 Form，保留原生输入框和父级 Dialog，直接调用原数据层的 createFolder/rename，保留权限和持久化。标签样式限定到直接子 span，避免原标签颜色覆盖 Semi 错误文字。
- 新建文件夹及重命名正常态输入框与基线相同：370×36、14px/21px、字重400。`tests/browser/file-name-form-migration.mjs` 的空值、空白、焦点、修正、Enter 保存、取消重开、重命名与刷新读取通过。截图 `file-name-{normal,error}-{before,after}.png` 和 `file-rename-{normal,error}-{before,after}.png`。
- 任务和文件命名两个新浏览器测试均已通过；构建、差异空白检查、项目文件模块与生成运行时语法检查通过。仍需完成全量迁移及最终验收。
- 本地 http://127.0.0.1:4902/ 返回 HTTP 200，响应根路径是本 worktree 的 dist；这是开发中版本，不是全量迁移验收版。

- 助理完整编辑器使用同一 Form 数据仓，原生控件经 withField/pure 接入；名称错误使用 Form.ErrorMessage，配置页签 keepState 保留内容。共用 validate 方法支持“快速创建”校验而不保存。原头像、模板和创建/编辑入口不变。正常态名称、简介、页签、正文和页脚的几何及文字与基线完全一致；截图 `assistant-{normal,error}-{before,after}.png`。
- 项目基本信息使用 Form 管理所有值，包括目标与里程碑数组；普通输入使用 Form.Input，原 textarea 经原生适配接入，保留正常布局。名称与周期校验字段内展示，前缀变更二次确认及数据层权限/前缀校验保留。正常态检查元素几何与字体全部等于基线；截图 `project-settings-{normal,error}-{before,after}.png`。
- 回归发现 onChange 内格式化不能作为 Form 字段值转换：Semi 的最终提交覆盖了内部 setValue，导致界面显示过滤后字母而校验仍收到原值。项目编辑和共用 MemberPicker 已统一改用原生 convert。`task-prefix.mjs` 增加等待弹窗成功关闭后再读数据，保留全部前缀及稳定链接断言。
- 助理迁移、原有头像流程、项目基本信息、两项任务前缀浏览器测试 5/5 通过；追加的模板空值替换、目标增删和里程碑保存读取也通过。构建、manifest 115、check:project、补丁 hash、生成模块语法及 diff 检查通过。
- 全量 npm test 结果 479 通过、19 失败；19 项都在 `tests/loop-task-create-ui.test.mjs` 的旧手写 React harness 缺少新 forms 依赖处失败，尚未到业务断言。必须适配测试宿主或迁为真实 React/浏览器测试并保留所有业务断言，不能删除或弱化。日志 `/tmp/eva-form-unit-suite.log`。
- 2026-10-09 用户追加控件审查：不能仅包一层 Form 后原封不动保留重复的基础控件。官方没有 Form.Button；标准提交/取消使用 Semi Button，普通字段优先 Form.Input/Select 等。已发现任务和技能的 LoopButton 是手写 button，项目文件 Dialog 页脚也是手写按钮，应纳入本次表单操作按钮统一，保留既有排版尺寸；复杂业务选择器通过 withField 保留。最终需检查标准输入是否确有必要保留原生适配，不能仅以保留外观为由留下所有手写输入。
- 待审公共交互：onValueChange 的重验应避免同一批变更重复触发，以及输入变化与异步 submit 校验互相覆盖；Semi 对被较新校验取代的 Promise 可能既不 resolve 也不 reject。后续需加入有实际重叠时序的测试并处理，不能仅靠提交锁单测声称完整。


### 本轮公共并发与标准控件收敛
- `createValidationQueue` 串行执行 Semi 校验，同类请求合并；校验途中值变化会重验最新值后才允许保存。重开/切换隔离旧队列和旧焦点回调。新增 `tests/browser/form-submission-concurrency.mjs` 使用真实 React/Semi 与受控异步校验，验证重叠输入、重复提交、关闭重开及迟到结果，已通过。
- 公共 submit capture 只接管当前 form 的事件；通过 Portal 渲染的子创建表单不会误触发外层提交。角色设置的真实 Portal 子表单（空提交与 Enter 创建）已验证。
- 任务标题换行转换改用原生 `convert`，描述移除重复 onChange 同步；创建/取消从手写 LoopButton 改为原生 Semi Button。项目文件命名从 NativeInput 改为 Form.Input，Dialog 页脚改为 Semi Button，命名表单通过原生 form 属性连接外部提交按钮。正常文字、按钮尺寸均按基线适配。
- 旧任务单测宿主升级：只模拟字段存储/渲染，提交生命周期使用实际 `useSubmission`；保留全部原业务断言。Form 校验/DOM 在真实浏览器另测。20项任务单测通过，全量单测曾恢复498/498，最终本轮复验进行中（日志 `/tmp/eva-form-unit-suite.log`）。
- 技能创建和ZIP导入均以 Form 数据仓管理名称/描述/正文，保留各模式草稿；ZIP包字段通过 withField 接入专用解析UI，解析器不改。按钮用 Semi，空值和重名允许点击后行内提示。原 ZIP 浏览器测试加入空提交、模式草稿保持、无包提交等断言并保留实际ZIP/二进制/编辑/隔离断言；4项相关测试通过。
- RoleAssignment 使用 Form.Select 管理角色；下拉中的 RoleCreator 使用独立 Form.Input。选择编辑哪个成员仍属于即时上下文切换，不当作待保存字段。原角色权限/重名复用行为不改。
- 成员移除中需选择群主接任者的流程使用同一公共 Form，数据层仍执行原 store.remove 事务。隔离浏览器夹具让现有供应链成员成为现有群主，验证空提交不移除、选人后真实转让和移除。无输入的数字员工移除和解散确认保持普通确认弹窗。
- FileLibrarySave 使用 Form.Select 管理目标文件库/文件夹，保留原保存事务和成功页。使用既有供应链附件，经原型内转发到现有私聊后验证保存到供应链文件库、打开位置、刷新回读；确认存储中恰好一份独立且来源明确的文件。
- 发现并保留基线行为：其他会话「方案评审」旧PDF被原来源权限检查拒绝；改前也相同，不作为本次成功路径或绕过权限。成功验收改用可访问的现有供应链附件。
- Semi withField 会覆盖 aria-labelledby 为 `{id}-label`；自定义布局中隐藏原生label时，外部标签已匹配该ID（角色、文件保存、移除接任者）。不能只给 Form.Select 传 aria-label，Select本身优先生成自己的标签属性。
- 截图/几何脚本新增 `/tmp/eva-skill-form-compare.mjs`、`/tmp/eva-role-form-compare.mjs`、`/tmp/eva-removal-form-compare.mjs`、`/tmp/eva-file-save-form-compare.mjs`。正常态比较断言全部通过。截图位于 `/tmp/eva-forms-comparison`，前缀 skill/skill-zip、role/role-create、member-removal、file-save；含正常态、错误态或成功态。
- 本轮尚未完成的主范围仍是个人重命名/移动、一级文件库与项目文件其他输入弹窗、活跃子区创建、所有共享成员调用方与其他原生输入适配审查，以及规范/检查和最终全部截图报告。不能把目前通过的入口视为全局迁移完成。

### 普通控件继续收敛与两个原生页面接入
- 助理名称/简介/正文改为 Form.Input/TextArea，项目背景/简介和群公告改为 Form.TextArea；删除公共 NativeInput/NativeTextarea 适配，避免只是包装手写基础控件。助理简介修正 Semi 包装带来的字体/4px 几何差异；完整助理两个浏览器测试通过，助理/项目/群公告正常态几何比较通过。
- 个人栏内重命名分组、对话重命名和移动使用 PersonalRailForm，通过已有 EvaPersonalPage 的 React portal 放回原栏内宿主，不新增 renderer 或窗口级覆盖。旧字段/错误 DOM 和 submit 监听已移除。改前后布局、输入和按钮几何/文字完全一致；浏览器验证空值、重名、Enter保存、取消重开、持久化、草稿保留及路由往返通过。
- 里程碑状态改为 Form.Select。发现官方受控 Select 将 onChange 延迟到弹出层退出动效完成，立即点保存会保存旧值；不是 Form 数据绑定错误。公共 Semi 实例统一 Select.motion=false，让值在立即保存前落实。保留立即选择后保存的浏览器断言，已通过，不用等待500ms掩盖产品问题。其余既有 Select 回归待本轮复验。
- 两个文件入口的普通提交弹窗收敛为共享 FileForm：命名、外部链接/文件夹、编辑、移动、快捷方式及一级文件库上传目标。原生文件库通过已有路由宿主 portal 接入；对应旧字段/提交分支已删除。保留数据层、权限、链接识别与域名二次确认。目前仅命名回归通过；新完整文件表单回归正在排错，不能宣称交付。
- 新模块纳入 manifest 和入口构建说明，当前117 blocks。文件标签旧两套实现仍待收敛，其他未完成范围沿用上表。

### 2026-10-09 后续进度与用户追加公共弹窗范围（以下覆盖上方过时待办）
- FileForm 已完成文件命名、外部链接/文件夹、编辑链接、移动、快捷方式、标签的双入口接入；删除不可达的上传目标分支。标签使用一个 withField 业务组件，URL 二次确认绑定确切地址。两个入口完整文件表单与标签浏览器 4/4 通过（公共 Dialog 外壳改造前）；真实文件生产提交函数的单测宿主已覆盖数据层调用。
- 个人栏、关注分类、AI 小队、项目创建、转让项目负责人、转让群主、数字员工加入项目均已接共享 Form。数字员工项目选择移除重复外层 Modal。独立调用方脚本已验证以上保存路径；还需持久化完整调用方回归和刷新最终截图。
- 群公告及 GROUP.md 使用原生 Form.TextArea；GROUP.md 保留编辑/只读、取消、原有文本空白。子区创建及转发内联新子区已使用 Form.Input；独立浏览器空提交、Enter 创建与正常字体对比通过。AI 会话重命名刚接公共 Form/Dialog，实际入口验收尚待完成。
- 独立代码审查发现一级文件库 change 上传监听缺失与 Escape 监听误绑 focusin，已修复。新增 `form-dialog-dismiss.mjs` 用真实上传和 Escape 操作回归，已通过。
- 用户授权进一步统一公共弹窗外壳及操作区：24px 外壳内边距和区段间距，8px 操作按钮间距，左灰色取消、右蓝色确认，危险操作红色；保留正文原有字号、字重、行高、字段层级和内部业务布局。宽度用 compact/standard/wide/compose/preview/editor 变体，复杂编辑器保留内容构成。
- 新增 `063-dialog.jsx/css`：公共 Dialog 使用原生 Semi Modal；Actions 使用原生 Semi Button。成员、角色、转让、文件保存、FileForm、新建分组已接入；任务/技能/助理/删除消息刚接入，待本轮构建后复验。内联个人栏、角色创建、任务、技能、子区创建与转发命名操作区已接 Actions。
- Semi 新版本 className 位于外层 popup，和旧版本 DOM 不同；公共 CSS 已改为准确的直接层级选择器，防止样式未命中或影响嵌套弹窗。云盘实际 computed style 验证 header/body/footer 左右24px、按钮gap8px。标题栏仍不被遮挡。
- 用户最新要求：所有产品弹窗点外部空白关闭，包括保存中。原生 Semi `maskClosable` 默认 true，统一 Dialog 强制保持 true；task/skill/assistant 的 busy 关闭拦截已取消，异步结果使用 isCurrent 隔离。更新《弹窗失焦关闭规范》，明确不是输入 blur 或切换窗口，不给原生 Modal 再叠加 document 监听。
- 新 Edge `form-dialog-dismiss.mjs` 4/4 通过：任务、技能保存中关闭重开后旧结果不干扰新草稿；云盘上传、Escape、外部关闭/重开清空、下拉选择不关父弹窗；助理内部切换焦点不关闭，点遮罩关闭并清除未保存草稿。助理完整 Form 保存回显测试另通过。公共 Dialog 最新扩接后的最终复验仍待完成。
- 任务业务单测宿主改用真实 Actions 组件而非模拟按钮结构，20/20通过；没有删除旧业务断言。
- 当前必须完成的剩余工作：公共外壳接入审查（包括旧子区对话框等）、消除旧重复外壳间距规则；AI 重命名及遗漏调用方验收；公共表单规范/入口清单/代码检查；最终全量单测和受影响浏览器检查；按最新公共视觉规则重拍全部 after（旧 before 不动）并输出成组对比图和测试版地址。未合并、未发布、未宣称全量交付。


### 2026-10-09 最终本地交付（覆盖上方开发中待办）
- 公共 Form、Dialog、Actions 及入口清单已落实于 `docs/表单统一规范.md`，AGENTS 引用，3 项架构门禁通过；无新的页面级表单框架。
- 用户指出的左标签偏低已在 MemberPicker 公共标签布局修复，正常及错误态中心差 0px，原文字字号/行高不变。
- 用户要求创建项目不填写前缀：创建字段已移除，保存经公共 suggest/validate 自动生成、去重。项目设置前缀编辑和稳定任务链接保留，两项浏览器回归通过。
- 审查发现的任务关闭后遗漏标签事务已修复：创建落库后完成所有标签保存，旧实例只停止 UI 回调；22 项任务事务单测覆盖。成员和技能旧遮罩规则排除公共 Dialog，避免标题栏二次偏移。
- 公共 Dialog 按显式 zIndex 使用同层级 Portal；转发面板中新建群聊可点击、可校验，Escape 只关闭子窗，父窗保留。危险移除按钮用原生 danger 主题。
- 任务创建居中后暴露选人菜单预算漏计“未指派”行，公共 AssigneePicker 补计该行；表格、批量、详情、新建四入口的搜索及标题栏边界通过。未重画业务选择器。
- 旧浏览器测试中的按钮可访问名、错误 DOM、已发布文案标点已对照实际入口更新；保留原来的保存、身份、几何、关闭与权限断言。错误聚焦等待实际完成，不在 requestAnimationFrame 前抢先断言。
- 最终验证：`npm test` 503/503；表单及相关浏览器 28/28；搜索 20/20；布局 11/11；popup-dismiss 1/1；member-picker-template 1/1。构建、manifest 119、项目/协作合同、patch-hash、生成 ES 模块语法与 diff 检查均通过。日志位于 /tmp/eva-delivery-unit.log、/tmp/eva-acceptance-browser.log、/tmp/eva-search-final.log、/tmp/eva-layout-search.log（布局通过；其中旧搜索失败已由最终搜索日志取代）、/tmp/eva-popup-final.log、/tmp/eva-picker-final.log。
- 45 组入口、83 组状态前后截图报告已生成，164 张原始截图；按业务分组，可筛选和放大。相同 Edge 1200×800 视口，before 来自隔离基线产物。少数共用入口用代表场景，缺少改前错误截图的两处明确标注，没有伪造。
- 报告保存于 `/Users/secret/.codex/visualizations/2026/10/09/01a11eb5-6c8b-7fe3-b36f-c60199473edc/form-review/index.html`，本地报告 `http://127.0.0.1:4902/artifacts/form-review/index.html`；测试版 `http://127.0.0.1:4902/` 已实际打开新建项目确认当前产物。
- 全局必填/可选标记仅完成原生 API 调研和推荐，尚未将其变成额外视觉改动；报告有明确说明。自动化和独立批注工具不在迁移范围。
- 无 commit、push、merge；等待用户亲自测试并明确同意后再合并。
