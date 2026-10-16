# 执行记录 — 2026-10-16-unified-work-inbox

目标完整保留，尚未完成。分支 `codex/unified-work-inbox`，基线 `090a68137d15dd4f37f399829ebdbc180e53ab2b`。没有提交、推送或合并；必须等用户本地验收后才能合并。

## 本轮实际变更

- 写入完整规格与四阶段实施计划。
- 新建 `064-activity-store.js`：跨来源、项目、对象聚合；按事件排序；预览三条；默认二十条；来源已读写回；账号独立清除记录；同时间新事件不被清除；每次操作重新校验权限；存储失败不修改内存状态；来源订阅清理。
- 新建 8 项核心行为测试，亲眼运行缺失实现失败后实现并通过。
- `009-2-data-supply.js` 既有任务提醒状态从整任务级改为账号/项目/事件级；保留 `EvaProjectReminderDemo` API 和原提醒数据，不另建任务数据源。增加 `markUnread` 和可选 eventIds。迁移旧默认账号预置事件的已读记录，保留后续新提醒。
- 新建 4 项任务事件读状态测试，先复现失败后通过。原 `message-reminders` 11 项全部仍通过。
- 新核心加入 index 和 manifest；128 项 manifest 检查通过，两个修改 JS 语法和差异空白检查通过。

## 已运行命令

`node --test tests/activity-store.test.mjs tests/task-reminder-events.test.mjs tests/message-reminders.test.mjs`：23/23通过。

`npm run check:manifest`：通过。`node --check prototype/009-2-data-supply.js`、`node --check prototype/064-activity-store.js`、`git diff --check`：通过。

尚未运行全量测试、构建、Edge新功能验收。当前浏览器仍不能展示新收件箱，不能称为可验收交付。

## 下一步从此继续

1. 完成 Task 2：把真实任务 `activity_log` 与 `evaLoopCommentsByTask` 接入现有任务提醒来源（当前仍仅预置事件）；任务订阅决定相关性，本人操作排除，显式提及按 ID；订阅取消保留其既定规则。
2. `009-6-patch-general.js` 中真实事务入口 `evaRecordTaskChanges`（约600行）、`evaAddTaskComment`（约885行）、`listComments`缓存（约990行）、`WKApp$1.mittBus` refresh。跨项目读取不得依赖当前页面 `issuesOf()`；使用目标项目数据源及权限。
3. 接 IM 来源：`009-5-patch-im.js` 的 `evaReminderRecords` 和 `evaReminderMark` 已提供团队/AI/squad/digital分流，但仅会话汇总，仍需准确源消息事件ID、已读边界、实时更新与精确定位。不能把每条历史消息都无条件算成新重要提醒。
4. 已核实截图版本属于旧 notification Inbox：归档通知并标已读，可查看和恢复。核心已支持；UI必须使用归档/恢复文案，不能按现代 Inbox 永久删除实现。
5. UI部分完全待做：共享右栏、原生React页面、拖拽宽度、筛选菜单、键盘、URL/记忆、项目Inbox占位升级和旧workboard删除。完整清单见规格。

## 已识别待处理边界

- 核心来源需要提供稳定事件ID及毫秒timestamp；任务预置目前仅补ID，适配时按共享演示时钟/原事件时间补时间，不能用当前时间导致刷新重排。
- 原任务自动已读调用 `getIssue(...).then(...markRead...).catch(...)` 已捕获保存失败，不会因新的写入错误破坏页面；UI显式操作仍应反馈失败。
- Huly源 `InboxNavigation.svelte` 与截图中的类型页签/菜单不完全一致，可能实际UI属于旧notification实现；需继续核对实际运行入口，完整迁移不能只照某个抽取文件。


## 第二轮进展

- 实际源适配 `064-activity-task-source.js` 已实现，`evaActivityTaskSource()` 在 `009-6` 中连接 `issuesOf(projectId)`、原始 `activity_log`、原评论缓存、任务订阅、membership权限与原未读状态。此函数目前尚无页面调用方；不能宣称浏览器已接好。
- 原任务提醒新增 connectSource，提供动态任务与事件来源，不建第二套任务记录。只读来源原地修改后结果更新、明确提及与本人操作排除、权限与账号校验均有行为测试。
- 用 Docker 本地 source map 又提取出 51 个 `notification-resources` 文件，保存在 `/tmp/eva-huly-inbox-source/plugins/notification-resources/`；这是截图 `/notification/` 的真正实现。此前 `inbox-resources` 是另一个入口，不能用来覆盖截图逻辑。
- 真正 Inbox：设置只有未读/已归档；类型 Tab 从对象类型生成；归档能恢复；头部菜单有全部已读/全部未读/全部归档，全部归档先确认；键盘还包括 Home/End/Delete；未读筛选保留当前阅读项；归档选中项后选择下一项否则上一项；归档/未读筛选变化清选择。
- `DocNotifyContextCard` 最近三组预览：相邻同人聊天/评论合并为一组，字段变更独立，头像名以稳定身份为准。核心已改为这一逻辑。
- 核心 clear/clearAll 现在是异步归档，先源已读，再保存归档元数据；restore不制造未读；新增 archived/unreadOnly/selectedKey过滤与 markAllUnread。
- 新的29项相关测试通过，归档恢复、未读过滤保留选择、三组聚合均先失败后实现通过。
- 任务适配新增时的构建成功（18977211 runtime bytes），patch hash `9e61a9e8c816cfbecc33ee7f4803a95bd2c1fe85093e2e73016709610219f17d`，生成模块语法及129项manifest通过。之后又改了普通064核心脚本与任务来源预览字段，dist需再次构建才能浏览器测试。

## 必须继续修正的来源细节

- 当前task source每次按当前订阅派生相关历史；取消订阅会使原已收到提醒消失，重新订阅可能带回历史。这尚不是完整通知投递语义，需要按源事件ID保留投递元数据（只存ID与收件人，不复制任务/评论），并监听原事务后实际投递；保持取消订阅不恢复的既有规则。
- 任务source尚缺成员分身的正式提及归主人映射，必须读取既有身份规则，不按显示名扫描。
- 当前Task1核心与Task2仅数据部分可测，Task3 UI完全待做；不要把这些新文件当作完整产品。
- 已开始读取 frontend-design-premium/upstream技能和三栏规范，组合输出有截断；UI实施前分段补读相应完整文件及GDS、公共组件/交互合同。规范已有设计上下文，不应另造风格。

## 第三轮：原生页面实际接入（未完成）

- 用户进一步明确：中栏全部逻辑按当前本地 Huly 源码，不能自行发明。重读 notification Inbox、GroupedListView、DocNotifyContextCard 和 comparator。
- 去掉错误的默认20条业务截断与同时间按ID排序；Huly同时间稳定排序，完整数据交给惰性列表。两项回归先失败后通过。现页面使用content-visibility降低离屏绘制，但不是Huly ListView的完整虚拟化，需继续核对。
- `064-activity-page.jsx/css` 已加入forms唯一构建链和manifest。原生路由直接渲染 `EvaActivityPage`，旧workboard DOM构造/注册和专用CSS已删除；保留025中的自动化与项目现有逻辑。
- `evaActivityStore` 当前只接任务source；此为施工中状态，不是缩减到任务版的交付。后续要加入团队、子区、AI等原来源。
- 中栏有全类型/动态类型tab、未读/归档设置、批量已读/未读/归档确认、逐项已读/归档/恢复；URL维护context/event；独立键盘焦点支持上下/Home/End/Enter/Delete；归档选中项打开下一项否则上一项。
- 宽度使用043/044公共控制器，扩展 `.eva-activity__rail`，不创建独立栏宽状态。共享header、Semi Button、ActionMenu、Dialog、Eva身份头像/姓名与未读徽标。
- 右侧直接渲染原 `IssueDetailPage`，共用任务数据/编辑/评论；嵌入close通过共享context委托调用者，原抽屉回退close不变。全屏暂调用原任务宿主，需完整往返验证；当前存在双关闭按钮外观问题待修。
- 当前任务delivery元数据已有按事件与收件人持久化，取消订阅保留旧投递/拒绝退订期间旧事件回补，4项task-source测试通过；仍缺全局启动、账号/权限切换、AI分身提及归属等完整边界。

### 实测证据

本地HTTP `http://127.0.0.1:4215`，Edge tab 791552444。
- 动态路由可渲染；显示实际SC任务和现有跨项目提醒。
- 打开SC-109复用原详情（标题、属性、父任务、动态、评论输入）。
- 归档SC-109后下一项SC-103在右侧打开；已归档筛选有SC-109，恢复后离开归档列表，返回全部仍已读。
- Home/Enter打开首项；共享separator ArrowRight得到270、Home回260。
- 页面截图 `/tmp/eva-activity-first-integration.png`（施工状态，非最终验收）。无控制台error。
- 31/31相关测试、131项manifest、最终模块语法检查通过；构建18979493 bytes，patch hash c83912c5b1412dd07be88b195bf1b965a07fe7bb9fc2e03cd9b791e38a8e90a5。
- 清理旧CSS后需要重新构建。全量npm test另在跑，日志 `/tmp/eva-activity-test-results.log`，不能提前声称通过。

### 下步必须补齐

1. IM、子区、AI等真实来源接入；保留原读位置/提及/权限，不以全部历史冒充通知。右侧用原ChannelsView conversationOnly；团队与各AI来源独立适配。
2. 精确评论/活动定位：当前event已入URL，但renderDetail尚未消费。摘要现在为纯文字，markdown/提及应复用现有呈现且避免显示原始语法。时间呈现要按既有公共能力，不保留简单月日作为自创行为。
3. 对照Huly模型动作补齐逐项菜单（当前只已读/未读/归档/恢复）；列表完整惰性加载、路由恢复、筛选保持与跨模块切换。
4. 任务详情父子任务/全屏/关闭/附件的嵌入上下文适配与精确返回，避免右侧重复关闭按钮。头像缺失的AI来源需按原身份统一解析。
5. 任务提醒原项目Inbox接入与全局启动、侧栏全局计数、演示时间、长名、权限、暗色和回归，最终用户验收前不合并。

### 本轮后续修正与回归

- 嵌入任务详情改用原page呈现，去掉panel遗留的第二个关闭按钮；Edge刷新后URL仍恢复SC-109，关闭任务详情按钮恰好1个。截图已更新。
- 全量677项首轮673通过、4失败：新增样式改变尾部装配顺序；详情close委托支持嵌入；侧栏工作板图标改Inbox；原workboard注册移除。这4项旧合同断言已对应更新，保留完整顺序、原生路由归属、图标与关闭行为检查，不删除检查。
- conversation-search 5项复跑通过；loop-subtasks与lucide合同在 `/tmp/eva-activity-contract-tests.log` 已通过（该次剩唯一样式顺序失败已另跑修正通过）。page-architecture全文件复跑日志 `/tmp/eva-activity-architecture-tests.log`；尚待结果，session87597。
- 最后构建18979492 bytes成功；最终模块语法、git diff --check通过。无提交、推送、合并。

## 第四轮：团队消息与子区接入、任务定位修复（仍未完成）

- 新增064-activity-chat-source，读取messageSource原群、子区、私聊消息和membership追加消息；收件记录仅存事件ID，不复制消息业务对象。
- 原EvaMembership持有notificationReadIds；动态与原聊天入口共用逐事件已读。原手动标未读保留markedUnread且不补造提及。21项成员/消息/聊天适配测试通过。
- store从侧栏生命周期启动，使离开动态时仍接收原来源变化。现已接任务和团队消息；AI独立来源仍待接入。
- 右侧复用原ChannelsView，新增hideNavigation显示配置，不能用conversationOnly冒充团队群场景；保留原聊天任务、子区、信息面板入口。原消息元素加稳定消息定位属性。
- Edge验证合规与合同群及本季度间接采购需求子区打开原消息，全部列表52项跨类型对象。截图/tmp/eva-activity-chat-integration.png。
- 原IssueDetailPage接入focusEventId；按原评论/活动ID定位并展开目标活动组。修复定位effect引用尚未初始化xi导致的崩溃，依赖改为已有ir状态。Edge刷新确认SC-103原评论cm-supply-3-cross-project-restricted高亮可见。
- 第四轮全量npm test 679/679通过（发生在最后任务定位补丁之前）；最后定位修复后相关store/source/subtasks 30/30通过。最终构建18983699字节、patch hash 824bf97e4b104b10f9870c6c756be4d58da7011df8af79cceff4cfe2122ed146；生成ES模块语法及git diff --check通过。
- 前轮page-architecture 29/29已通过。
- 仍需完成AI独立来源、Huly逐项菜单和列表行为完整核对、原项目Inbox及全局计数、任务全屏/返回、摘要呈现、权限/暗色/原IM状态回归。未获用户验收，未提交、推送或合并main。

## 第五轮：AI 原来源逐事件已读与接入隔离（仍未完成）

- 修正membership通知provider的范围：新增supports判断，未覆盖的会话继续原未读/提及/清除路径，逐事件写入不能落入未接入会话。空会话手动未读保持1，不补造消息；再次打开能清除标记。先增加两项失败回归，再修正通过。
- EvaAIPrivateConversations提供共享notifications/markNotifications/normalizeMessageIds，状态写在原session/group对象notificationReadIds，旧readAiMessageCount保留迁移兼容；未采用动态私有未读副本。
- EvaAITeam、EvaMyAITeamGroup、EvaDigitalEmployeesStore新增逐消息读写API。原markRead和原发送已读操作调用同一实现，明确的消息ID快照不会清除之后到达的回复。缺失ID的旧数字员工消息在原数据层补稳定会话内ID，发送后同样补齐。
- 小队持久化保留notificationReadIds与markedUnread；父群/子区互不清除，已删除子区拒绝写入。数字员工、助理、分身仍归各自原store。
- 69/69相关测试通过（包括新快照、刷新、父子隔离、删除边界）；构建、patch hash与生成模块语法、git diff --check通过。runtime字节/patch hash不变，因为本轮变更主要在独立数据脚本。
- Edge http://127.0.0.1:4215 原Agent入口验证：通用助理“把今天的事情排出先后”、小队“供应商整改”、数字员工“入职第一周 onboarding”打开后各自未读消失，刷新仍保持。原消息流、附件及输入框正常呈现。截图/tmp/eva-activity-ai-read-regression.png。
- 全量npm test仍在运行，session25570，日志/tmp/eva-activity-round5-tests.log。不要重复启动；先poll原handle。最后观察输出停在Notification主题测试，尚无最终汇总。
- AI事件读写底座已具备，但动态store尚未注册AI来源、右侧尚未接这些AI入口，不能称AI集成完成。下一步应接三个原store的notification API和原EvaAITeamPage右侧组件适配，保留AI模型边界。Huly菜单/列表、全局计数、原项目Inbox、精准返回等原待办继续保留。未提交、推送或合并main。
- 第五轮全量测试最终完成：684/684通过，session25570已退出0，耗时116545ms；此前“仍运行”记录现已被此结果取代。

## 第六轮：AI 实际接入、重复目录计算性能修正与列表视觉（仍未完成）

- 新增064-activity-ai-source.js并加入index/manifest。读取三个原AI stores的notifications/markNotifications；投递只存原事件ID，保留账号与成员边界，不把所有历史转成通知。
- 009-6注入evaActivityAICatalog/AISource，source注册为tasks/chat/ai。小队父群和子区、助理、分身、数字员工分开context。个人AI原型数据限原u-wangyilin账号。
- EvaAITeamPage增加activitySelection/activityMessageId/onActivitySelect配置，隐藏自身中栏，直接复用原右侧ChannelsView和草稿、发送、信息管理能力；嵌入选择由动态URL拥有，不回写原Agent入口的selection记忆。原完整入口默认行为不变。
- store.context支持只查原对象而不补造提醒：右侧切至没有收到提醒的原小队子区时保持内容。源权限仍检查。
- Edge实测动态打开研发助理、分身、小队原聊天。研发助理草稿在分身间往返保持且不串；测试草稿精确匹配后已恢复原值。原用户tab791552444被用户继续操作，后续验证单独创建Edge tab791552513，变量activityPerfTab，避免抢用户现场。
- 用户明确指出大圆圈、列表层级不足与切换巨卡。暂停剩余视觉任务先按systematic-debugging采样。CDP Profiler不支持，改为临时源耗时console采样，最终已移除。
- 采样根因：81个团队会话每轮collect耗时417–439ms，其中逐行目录/权限重建约100ms；ActivityPage为allRows/rows/selected连续三轮collect，主线程约1.3s。修复为同轮目录Map共用、membership版本改变时更新，运行时events闭包读取本轮catalog；页面筛选与选中复用allRows，不再次聚合。独立目录读取计数回归先失败再通过，权限仍每次检查。
- Edge修复后同路径Agent→动态：团队聚合12.4ms一轮，任务1.6ms，AI0.5ms；刷新观测团队18.4ms。只声明聚合耗时下降，不把它冒充端到端加载耗时。
- 视觉：移除24px空心占位大圆圈，复用EvaLoopStatusIcon 14px真实任务状态；编号/对象元信息用公共taskReference，标题用section字体，摘要降低字重与颜色；右侧归档/恢复改为已有Archive/ArchiveRestore Lucide图标。更新预览仍保持Huly最多三组事件。
- 摘要调用现有fromMarkdown+GFM解析器遍历文本，去除Markdown语法和裸URL，保留链接名称/提及文字/代码及图片alt。小队无绝对时间的原消息回退既有AI_REVIEW_START，避免按当前日期顶置。
- 截图/tmp/eva-activity-visual-performance-fix.png；DOM确认18个原任务状态glyph、59个归档icon，浏览器无error。
- 本轮AI/store等69项通过、integration-regressions5项通过，性能/消息/store31项通过。最终构建18988507字节，patch hash70da69944bff841c24203515ff84723263b33f4d710610d2b49ed1333ef578d5，生成模块语法、diff --check通过。
- 全量npm test正在运行session95087，/tmp/eva-activity-round6-tests.log；需poll原handle，不重复启动。临时profiling代码曾使VM tests因performance未注入失败，移除采样后31项已通过；不得修改测试环境掩盖采样遗留。
- 未完成清单继续：Huly全菜单/惰性列表/URL恢复逐项核对，原项目Inbox与全局计数，个人Eva/自动化等原规格剩余范围核查，任务详情全屏/附件/返回，AI子区管理与非提醒对象导航完整回归，暗色/长名/权限。用户尚未验收，未提交推送或合并。
- 第六轮全量测试最终完成：688/688通过，session95087退出0（134871ms）。取代上文运行中状态。临时性能采样代码已确认完全移除。
