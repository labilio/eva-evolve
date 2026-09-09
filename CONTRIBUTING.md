# Eva Evolve 协作与发布流程

本仓库为 `labilio/eva-evolve`，线上为 https://eva-evolve.vercel.app/ 。旧仓库 `labilio/eva-demo-progress` 的发布纪律不自动覆盖本仓库。开工先读 `AGENTS.md` 和相关业务规范。

## 小改动直接发布

允许小改动直接推送 `main`，不强制创建 PR。用户提出的小范围文案、样式、兼容修复或配置修改，默认授权完成必要检查后 commit / push；不重复索要上线确认。用户明确说“不 push”“只预览”或“先评审”时遵从。

1. 检查 `git status`，不得覆盖他人未提交内容。多人或多个 AI 同时工作时使用独立工作区。
2. `git fetch origin`，从最新 `origin/main` 开始；可以在干净 main 上开发，也可以在独立分支完成后直接推送到 main。
3. 修改后运行相关测试、`npm run build`、项目合同及必要的浏览器验收；有失败不能声称通过。
4. 产品界面或功能发布运行 `npm run release:bump` 更新版本号；纯文档、测试及开发流程配置修改不更新产品版本号。唯一版本数据源为 `release.json`。
5. 推送前再次 fetch。若远端 main 已前进，先逐项整合并重新验证受影响内容，再普通 push；禁止强推覆盖。
6. push 后核对 GitHub 质量检查和 Vercel Production 的目标 commit。UI 改动还要验证线上页面。

## 大改动与可选 PR

跨模块改造、权限/身份边界调整或需要评审的工作，继续使用功能分支、Vercel Preview 和 PR。同步旧仓库仍先生成同步 PR，处理冲突及验收后再合并；不自动覆盖新仓库。复杂发布保持人工明确确认合并。

PR 是评审方式，不是所有修改的必经步骤。每个 PR 需提供目标 commit、Preview 和验证结果。使用中文提交信息，不混入无关文件。

## 必要保护

- GitHub 禁止强推和删除 `main`，管理员同样受约束。
- 不配置强制 PR 或推送前必须已有 CI 结果的门槛，以允许直接 push。
- 每次 push main 自动运行 Eva quality gate；CI 与 Vercel 独立运行，CI 是推送后的检测，不是上线前的阻断。失败后立即检查原因，必要时用 revert 提交回退，不用 reset/force push。
- 不直接修改旧仓库；通过普通 Git 合并吸收上游，不使用整文件 ours/theirs 处理业务冲突。
- 不上传令牌、密码、私有环境文件；前端只使用允许公开的配置。

## 状态汇报

分别说明本地已修改、GitHub main 已推送、Vercel 已部署、浏览器已验收。文档要求与 GitHub 实际配置分开核实，不能把构建成功当作交互通过。
