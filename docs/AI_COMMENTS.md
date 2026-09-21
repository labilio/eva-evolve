# AI／Codex 云端批注接口

批注既可以由人在网页侧栏创建，也可以由 Codex 等 AI 直接通过仓库命令写入。两种入口使用同一个 Supabase 数据源，创建后会立即出现在对应页面的共享批注中。

Supabase 仅承载共享批注，不是 Eva 云盘、聊天、项目或任务的业务后端。产品演示数据与浏览器本地存储的边界统一遵循 [AGENTS.md「数据存储边界」](../AGENTS.md#数据存储边界)；排查本地上传或文件预览问题时，不得据此推导出需要修改批注数据库。

## 创建批注

```powershell
npm run comments -- add `
  --page "#/guid" `
  --selector "[data-eva-nav-id='my-ai']" `
  --label "我的 AI" `
  --kind ui `
  --body "调整这个入口的间距"
```

必须提供 `--page`，并在 `--selector`、`--anchor-id`、`--quote` 中至少提供一个。优先顺序是稳定元素 ID／`data-*` 选择器、可辨识的引用文案、普通 CSS 选择器。不要使用依赖 DOM 序号的脆弱选择器。

批注类型：

- `copy`：改文案
- `ui`：调整 UI
- `rebuild`：重做
- `function`：补充／优化功能（默认）
- `ready`：已基本定稿

可选定位参数：`--tag`、`--role`、`--label`、`--placeholder`、`--input-type`、`--heading`、`--rx`、`--ry`。命令返回数据库中的完整 JSON 记录和批注 ID。

## 查询批注

```powershell
npm run comments -- list
npm run comments -- list --page "#/guid"
```

不带 `--page` 查询整个 Demo 的全部共享批注；带 `--page` 只查询指定页面。AI 在重复创建意见前应先查询，避免同一问题被重复提交。

## 回复批注

```powershell
npm run comments -- reply `
  --id "批注 UUID" `
  --body "已补充复现条件"
```

## 更新状态

```powershell
npm run comments -- status --id "批注 UUID" --status doing
npm run comments -- status --id "批注 UUID" --status open
npm run comments -- status --id "批注 UUID" --status done
```

## 删除批注

```powershell
npm run comments -- delete --id "批注 UUID"
```

批注是项目内的共享评审数据，所有访问者和协作 AI 都能查看、回复、改状态和删除。删除会同时删除其回复且无法撤销，执行前必须确认目标批注 ID。

状态只有：`open`（待讨论）、`approved`（Pending，兼容旧存储值）、`doing`（原型修改中）、`done`（原型已改完）。`ready`（已基本定稿）是批注类型，不是状态。Pending 不代表批准产品意见；创建 `ready` 类型仍须人工明确确认，并提供 `--confirmed-by-user`。

```powershell
npm run comments -- add `
  --page "#/guid" `
  --selector "[data-eva-nav-id='my-ai']" `
  --kind ready `
  --body "这一部分已经基本定稿" `
  --confirmed-by-user
```

## 署名

默认署名是 `Codex`。临时覆盖使用 `--author "设计评审 AI"`；同一台电脑长期使用可以设置环境变量 `EVA_REVIEW_AUTHOR`。使用 AI 名称或“姓名的 Codex”，不要冒充真实同事。

网页中的人工批注和回复可以不填写姓名；空姓名会统一保存并显示为“匿名同事”。填写过一次的姓名仍会保存在当前浏览器中，后续自动沿用。

## AI 执行规则

1. 用户要求“批注、评审、记录意见，但不要改代码”时，使用本命令，不修改产品源码。
2. 创建前确认页面路径和具体元素；无法可靠定位时先向用户确认，不创建悬空批注。
3. 创建后返回批注 ID、页面、定位对象、类型和意见摘要。
4. `ready` 类型必须来自本轮人工确认；AI 推断、旧对话授权和“看起来合理”都不算确认。
5. 本命令使用前端相同的 publishable key 和现有 RLS，不需要也禁止使用 Supabase secret/service-role key。
6. 删除属于共享操作；只能删除用户明确指定或本轮联调产生的批注，不得批量清理未知批注。

## 开发工作台与认领

批注侧栏顶部“开发工作台”在新标签页打开 `/review/developer.html`，按一级功能菜单展示共享批注大表。复用原批注、讨论、四种状态，仅增加 `claimed_by` / `claimed_at` 共享署名。姓名不构成身份认证或访问权限。

默认展示全部状态、全部认领者；可以主动筛选已确认、未认领。状态修改后当前行保留原位，重新筛选或手动加载更新时再应用筛选；已改完不删除或归档。勾选可跨筛选保留；普通复制不更改状态，认领并复制在数据库事务中检查全部所选项，冲突时全部不认领。任意状态的未认领批注均可认领，认领成功状态为修改中。释放认领保留原状态；后续可再次认领。

```sh
npm run comments -- list --ids <UUID,UUID>
npm run comments -- claim --ids <UUID,UUID> --author "开发者姓名"
npm run comments -- unclaim --ids <UUID,UUID> --author "原认领者姓名"
```

提示词包含仓库、实际前端构建 commit/分支/版本、页面 URL、批注 UUID、原文、完整讨论、定位数据及源码检索起点。源码参照不能代替读取当前职责清单。构建元信息由构建过程生成，不维护第二套正式版本号。AI 接手先刷新批注；复制文本本身不代表执行或发布授权。

开发结果复用 `reply`，回填修改说明、commit/PR、预览地址和验证结果后，用原有 `status` 命令更新实际进度。不得将“原型已改完”表述为人工验收通过。

### 状态与认领分开

侧栏、开发工作台及 CLI 进入 doing 或 done 时认领未认领批注；已有他人认领则拒绝覆盖。切换 open、approved（Pending）仅更新状态，保留认领者。释放认领显式清空认领但保留状态。姓名仅为共享署名，不是账号权限。历史状态未记录操作人，禁止推测补齐。

网页操作人和批注提交姓名共用 eva-review-author；跨标签同步署名。服务端批注变化仍只提示更新，人工加载后更新列表，不能因此自动重绘输入框。


## 2026-09-09 状态与个人视图修订（取代旧认领约定）

approved 仅保留存储兼容，显示为 Pending，表示已关注但暂时阻塞；不代表人工批准。状态颜色为待讨论橙、Pending 紫、修改中蓝、已改完绿。任何未认领批注均可认领并进入 doing；保留原子批量冲突检查。进入 doing 或 done 时认领，其他状态保留负责人，不能覆盖他人认领。CLI 的 approved 不再要求人工确认标志，ready 类型仍要求。

左侧底部与我相关含我认领的、我提出的，按共享操作人姓名精确匹配，包含已改完，姓名缺失提示填写；继续应用表头筛选且不改变排序。

## 侧栏行为、共享范围与定位验收

（自 AGENTS.md 下沉，与「AI 执行规则」同效；涉及批注侧栏、定位或验收的改动同样适用。）

- 原型批注是独立评审工具层（源码 `review/`，数据库迁移 `supabase/migrations/`），不是 Eva 产品 UI；不得把批注列表塞进 Eva 页面布局，也不得劫持 Eva 原有“反馈问题”入口。页面右上角的轻量“批注”入口只负责打开覆盖式侧栏：侧栏默认隐藏、不得挤压或改写 Eva 布局；批注按当前 hash 页面归类，但不是按访问者隔离。
- 所有同事访问同一 Vercel 站点时，读写的是同一个 Supabase 项目 `eva-demo-comments`，因此能看到同一页面下的共享批注；姓名只用于评审署名，不等同于账号体系；网页端可留空，统一显示为「匿名同事」。前端只能使用 Supabase publishable key；禁止把 secret/service-role key 写入浏览器代码。公开表必须启用 RLS，匿名访问仅允许 `SELECT` 和受约束的 `INSERT`，不得给客户端更新或删除权限。
- 批注定位保存的 `selector` 与 `rx/ry` 必须基于同一个实际元素：先生成并解析选择器，再以解析到的元素矩形计算相对坐标；禁止用 CSS 偏移修正定位误差。批注位于项目、设置等嵌套视图时，除一级路由外还必须保存拥有者 ID 与当前页签；定位时通过该 React 状态拥有者公开的事件合同恢复上下文，禁止模拟点击、读取旧全局开关或仅凭通用文案猜测所属项目。
- 批注改动必须验证：入口默认收起、侧栏覆盖而不占位、提交后可见、刷新后仍可读取、不同页面筛选正确；联调产生的测试批注在验证后清理。
