# Eva Evolve

Eva 桌面端交互原型的在线进度预览。

多人、多电脑和 AI 协作请先阅读 [`CONTRIBUTING.md`](CONTRIBUTING.md)。普通开发使用功能分支和 Vercel Preview；`main` 只接收经过人工确认的正式发布。

## 当前入口

- 唯一页面入口：`index.html`
- 可维护业务模块：`prototype/`
- 构建兼容依赖：`vendor/`（仅作为构建输入，不作为产品实现参照）
- 模块加载顺序：`prototype-manifest.json`
- 客户设计规范：`docs/design-system/gds-for-ai2.0/README.md`（GDS for AI 2.0）
- AI／Codex 云端批注：`docs/AI_COMMENTS.md`
- 文件库角色、权限动作与任务产出设计：[`docs/file-library-permissions/index.html`](docs/file-library-permissions/index.html)
- 团队文件与文件库需求及修改计划：[`docs/团队文件与文件库需求文档.md`](docs/团队文件与文件库需求文档.md)

本地使用 `npm start` 后访问 `http://127.0.0.1:4173`。应用通过 HTTP 加载；线上由 GitHub `main` 自动发布到 Vercel。

## 演示项目

今后需要预置人员和内容的功能，统一放在 **供应链运营协同**（协作项目 ID：`prod`；任务看板项目 ID：`p-supply`）项目中。人员与分身、邀请、群聊及子区、消息、任务和文件应在同一项目内形成可直接体验的流程；新增功能不再另外创建默认演示项目。

评审与 Edge 测试默认从“项目 → 供应链运营协同”开始。数据位置、权限边界和临时测试数据的处理见 [演示数据约定](docs/演示数据约定.md)。

演示时可直接照着 [供应链演示与验收教程](docs/供应链运营协同-演示与验收教程.md) 操作，包含角色切换、按钮路径、预期结果和讲解话术。

## 发布流程

GitHub `main` 是唯一生产发布入口：本地修改经明确授权 commit 并 push 后，由 Vercel 自动部署。日常更新不运行 `vercel deploy`；该命令只用于用户明确要求的临时预览或 CLI 排障。

发布前后必须分别确认状态，不能把它们混称为“已经上线”：

1. **本地已修改**：工作区文件已更新，尚未代表 GitHub 或线上发生变化。
2. **GitHub main 已推送**：目标 commit 已到远端 `main`，尚未代表 Vercel 构建完成。
3. **Vercel 已部署**：生产部署成功且对应目标 commit，尚未代表页面交互已经人工检查。
4. **浏览器已验收**：等待自动部署生效后，在目标线上地址逐入口验证，并核对页面最近更新时间。

用户未授权 commit/push 时，工作停留在“本地已修改”。部署失败或浏览器未检查时，必须如实停留在相应状态。

## 三栏式页面视觉规范

个人「Eva 同学」「我的 AI」与团队「消息」的三栏外观遵循项目级一致性规则：以既有个人 Eva、团队消息为基准，新模块对齐同类元素的宽度、字体、配色和交互样式。外观统一不改变各模块的功能、信息结构或 AI 标适用场景。

完整约束及验收要求见 [AGENTS.md：项目级三栏式视觉一致性](AGENTS.md#项目级三栏式视觉一致性)。

## 实施边界

- 团队 IM 入口共享一套 `EvaIMConversation`/Octo-Web IM 内核，只替换数据和入口配置。
- Eva 页面外壳及通用界面优先使用既有封装或 Semi UI，不重造成熟 IM 组件。
- 图标使用 Lucide；相同语义允许并应复用同一图标，不设“每个图标只能出现一次”的限制。
- `vendor/` 中的兼容运行时不具有产品或设计解释权；Eva 的新增功能不得参考 AionUI。


## 手动同步旧仓库

本仓库是 `labilio/eva-evolve`，旧仓库为 `labilio/eva-demo-progress`。线上入口为 https://eva-evolve.vercel.app/ 。保留共同 Git 历史，但不是 GitHub 原生 Fork，因此没有文件列表上的 Sync fork 按钮。

进入 [Actions → 同步旧仓库](https://github.com/labilio/eva-evolve/actions/workflows/sync-upstream.yml)，点击 **Run workflow**，选择 **main** 后运行。工作流必须先合入默认分支，按钮才会出现；不配置定时同步。

- 没有新提交：显示“无需创建 PR”。
- 有更新：从新 main 创建独立合并分支，自动创建同步 PR；保留新仓库的 `release.json`，不自动合并或发布。
- 已有未处理同步 PR：返回该 PR 链接，不重复创建。请先合并或关闭它，再同步下一批更新。
- 业务文件冲突：停止并在日志列出文件，不推送冲突状态，不使用强制覆盖。
- GitHub 可能要求在机器人创建的 PR 上点击 **Approve workflows to run** 才会启动质量检查。验收 Vercel Preview 后，仍按正常流程人工确认合并、更新版本号。

首次启用需在仓库 Settings → Actions → General → Workflow permissions 允许 **Allow GitHub Actions to create and approve pull requests**。工作流仅创建 PR，没有自动批准或合并步骤，不需要额外 PAT。
