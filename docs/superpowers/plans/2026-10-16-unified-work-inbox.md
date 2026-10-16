# Unified Work Inbox Implementation Plan

> **For agentic workers:** Use superpowers:executing-plans to implement inline, task by task. 用户已经明确要求开工，无需重复请求方案批准。

**Goal:** 将 Huly Inbox 完整交互移植到 Eva「动态」，接入原生数据和业务组件。

**Architecture:** 聚合核心只管理通知呈现与清除元数据。运行时适配器连接现有任务/IM数据和共享详情，React 路由页面负责列表及双栏布局，保留全局导航和标题栏。

**Tech Stack:** 现有 React、Semi/Eva 公共控件、Lucide、运行时构建补丁、Node 行为测试。

**Spec:** `docs/动态收件箱移植规格.md`

## Global Constraints

- 不合并 main，用户亲自测试后明确同意才可合并。
- 业务数据只有原来源；读状态写回原来源，清除独立于完成/退出/归档。
- 单一 Outlet 与 URL 导航状态；右栏共享原组件；默认全部。
- 明暗主题读取 Eva token，身份、数字未读、显式提及遵守公共合同。

## Review Focus

- 清除期间新事件到达，以及同时间戳事件，不应被误清除。
- 详情打开后成员权限撤销，列表和详情应即时失效。
- 相同任务 ID 跨项目、切换账号，不串通知状态。
- 中文组字与聊天草稿不被列表快捷键和导航破坏。
- 极窄窗口、长名称、空对象、存储失败应保留可用路径。

### Task 1: 聚合及清除核心

Files: 新建 `prototype/064-activity-store.js`、`tests/activity-store.test.mjs`。

Interface: `EvaActivity.createStore({storage, actorId, sources})`；来源提供 `id, list(actor), canRead(group,actor), markRead(group,eventIds,read,actor)`。返回 `items({type,limit}), markRead(key,read), clear(key), markAllRead(), clearAll(), subscribe(), getSnapshot()`。对象包含 `id, projectId, type, events`，事件包含稳定 `id, timestamp, unread`。来源负责相关性及源事件读取。

- [ ] 测试跨类型聚合、同 ID 隔离、三条预览、20条分页、已读后保留、清除后新事件重现、权限变更、存储失败、账号隔离。
- [ ] 运行 `node --test tests/activity-store.test.mjs`，先确认缺失行为失败，再实现核心并通过。
- [ ] 核心不得写源业务；保留来源字段供渲染适配器使用。

### Task 2: 原数据适配与事件更新

Files: `009-2-data-supply.js`、`009-5-patch-im.js`、`009-6-patch-general.js`、`062-task-subscriptions.js`（仅必要接口）、对应数据测试。

- [ ] 接入 Task 1 来源接口；任务事件与订阅、IM 消息与子区、AI会话使用现有数据；读写统一到原来源。
- [ ] 验证实际事务新增事件、已读跨入口同步、退出/归档/删除、明确提及和本人操作规则。
- [ ] 补齐来源行为测试并执行；保留现有任务、订阅、IM 回归。

### Task 3: 共享右栏与原生路由页面

Files: 新建 `prototype/064-activity-page.jsx`、`prototype/064-activity.css`；修改 `009-5`、`009-6`、`009-7`、`025-demo-0902-v2-pages.js`、`index.html`、`prototype-manifest.json`。

- [ ] 共享任务详情增加嵌入宿主；共享 IM 按来源配置会话，不复制消息流。
- [ ] 用聚合接口实现全部/分类、3条预览、分页、读/清除/批量操作、原生详情定位、用户显示偏好。
- [ ] 完成可调栏宽、键盘、选中/滚动记忆、返回、权限失效及各空态。
- [ ] 删除旧 workboard 原生桥及相关独立样式；同步 manifest 和入口装配。
- [ ] 将项目 Inbox 占位连接同一聚合组件及项目筛选，保留项目上下文。

### Task 4: 完整验收

- [ ] 在既有供应链演示源补足真实场景，不复制项目或人员。
- [ ] 对照规格逐项 Edge 验证；记录视口、URL、源码版本及截图。
- [ ] 运行相关测试、`npm test`、`npm run build`、`npm run check:manifest`、`npm run check:project`、`node tools/patch-hash.mjs`、`node --check dist/vendor/eva-runtime.module.js`。
- [ ] 输出可测试本地版本与差异说明，等待用户验收，不自动合并。
