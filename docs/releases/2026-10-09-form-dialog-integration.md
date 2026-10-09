# Form / Dialog 合并记录（用户授权合并）

## 状态与范围决定

- 日期：2026-10-09；工作分支：`codex/folder-semi-form`
- 用户已明确授权本轮成果合并远端 main；连接中心例外按下节处理
- 用户于本轮明确要求“合并远端 main”，据此执行提交、合并与推送
- 独立演示版已结束使用，后续直接打开真实原型本地测试版，不再另写独立报告

### 连接中心：不纳入本轮验收

用户明确反馈：

> 连接中心里面这个改的不对，不过不要管了，连接中心不是我们要改的地方

据此，连接中心改动不属于本轮认可成果，暂不继续修改。用户随后授权合并远端 main。合并准备时已将连接中心专属改动及其公共接入从待提交范围排除，恢复其原有实现；原稿留存在本地 `.local/excluded-connection/`，不随本次提交发布。

涉及 `028-connection-center-functional-v2.css`、`029-connection-center-v2-functional.js`、新增 `063-connection-dialog.jsx`，以及公共入口、路由接入、文档与测试中的连接中心相关部分。公共文件包含其他改动，不能整文件回退。

## 本轮公共实现

- 使用 Semi Form 管理字段、校验与错误展示，公共提交逻辑处理保存状态与重复提交
- 使用公共 Dialog / Actions 维护弹窗标题、正文、按钮区、分割线、主题参数与焦点行为
- 初始焦点、重命名选中原值、嵌套菜单 Escape、关闭后返回入口按公共实现管理；依据 [W3C Dialog 模式](https://www.w3.org/WAI/ARIA/apg/patterns/dialog-modal/)
- 必填与选填混合时，仅必填字段显示 Semi 必填标记；单字段重命名等不强行加星号，必填校验仍保留
- 删除任务标题红竖线、助理名称红下划线和无调用方错误样式；短校验提示不加句号
- 消除标准弹窗正文与首尾字段叠加留白，保留字段之间的正常间距
- 保留 Eva 颜色、圆角、字体家族、身份与菜单业务组件、业务流程和权限；复杂任务及助理编辑器保留内部布局
- 自动化、批注、Octo 聊天内容、身份卡及文件预览不做本轮排版重构

| 公共位置 | 参数 |
| --- | --- |
| 标题 | 左对齐，16px / 500 / 25.144px |
| 标题区 | 约 48px 起，长标题可增高，下边线 1px |
| 正文 | 14px / 400 / 22px；左右 20px，上下 24px |
| 分组文字 | 14px / 500 / 22px |
| 辅助文字 | 12px / 400 / 18px |
| 按钮区 | 上边线 1px；上下 16px，左右 20px |
| 操作按钮 | 右对齐，间距 12px，常规高度 32px；14px / 400 / 22px |

实现入口为 `prototype/063-*` 公共模块，业务规范见 [表单统一规范](../表单统一规范.md)。标题区与按钮区不强求等高。

## 验证记录的边界

原报告记录上一轮 504 项代码测试、28 项 Edge 浏览器回归通过，以及构建、装配清单、项目合同和运行时语法检查通过。这些是对应当时工作稿的历史结果，不代表之后每次改动均重新运行全部测试，也不替代用户验收。

后续追加了必填标记策略、错误装饰清理及重复留白回归。留白检查覆盖 14 个标准弹窗场景；测试入口包括 `tests/required-label-policy.test.mjs`、`tests/browser/required-label-policy.mjs` 和 `tests/browser/dialog-form-spacing.mjs`。正式合并前仍须针对最终待合并代码按仓库规范验证。

## 原截图报告归档

以下将原报告的 18 组真实原型对比直接并入本记录，截图资源与记录一起保存。均为 Edge、1200 × 800、100% 缩放。它们是分阶段快照：后面的必填标记和留白修复会更新前面快照中的表现，不能把前面的“修改后”一律当作最终状态。连接中心截图不纳入本轮成果展示。

### 1. 新建文件夹

| 修改前 | 修改后 |
| --- | --- |
| ![修改前](assets/2026-10-09-form-dialog/folder-before.png) | ![修改后](assets/2026-10-09-form-dialog/folder-after.png) |

### 2. 新建文件夹 · 空提交

| 修改前 | 修改后 |
| --- | --- |
| ![修改前](assets/2026-10-09-form-dialog/folder-error-before.png) | ![修改后](assets/2026-10-09-form-dialog/folder-error-after.png) |

### 3. 重命名 · 原名称选中

| 修改前 | 修改后 |
| --- | --- |
| ![修改前](assets/2026-10-09-form-dialog/rename-before.png) | ![修改后](assets/2026-10-09-form-dialog/rename-after.png) |

### 4. 移动文件夹

| 修改前 | 修改后 |
| --- | --- |
| ![修改前](assets/2026-10-09-form-dialog/move-before.png) | ![修改后](assets/2026-10-09-form-dialog/move-after.png) |

### 5. 创建快捷方式

| 修改前 | 修改后 |
| --- | --- |
| ![修改前](assets/2026-10-09-form-dialog/shortcut-before.png) | ![修改后](assets/2026-10-09-form-dialog/shortcut-after.png) |

### 6. 添加项目成员

| 修改前 | 修改后 |
| --- | --- |
| ![修改前](assets/2026-10-09-form-dialog/member-before.png) | ![修改后](assets/2026-10-09-form-dialog/member-after.png) |

### 7. 设置项目角色

| 修改前 | 修改后 |
| --- | --- |
| ![修改前](assets/2026-10-09-form-dialog/role-before.png) | ![修改后](assets/2026-10-09-form-dialog/role-after.png) |

### 8. 设置项目角色 · 新建角色

| 修改前 | 修改后 |
| --- | --- |
| ![修改前](assets/2026-10-09-form-dialog/role-new-before.png) | ![修改后](assets/2026-10-09-form-dialog/role-new-after.png) |

### 9. 新建技能 · 空白起草

| 修改前 | 修改后 |
| --- | --- |
| ![修改前](assets/2026-10-09-form-dialog/skill-before.png) | ![修改后](assets/2026-10-09-form-dialog/skill-after.png) |

### 10. 新建技能 · ZIP 导入

| 修改前 | 修改后 |
| --- | --- |
| ![修改前](assets/2026-10-09-form-dialog/skill-zip-before.png) | ![修改后](assets/2026-10-09-form-dialog/skill-zip-after.png) |

### 11. 新建子区

| 修改前 | 修改后 |
| --- | --- |
| ![修改前](assets/2026-10-09-form-dialog/thread-before.png) | ![修改后](assets/2026-10-09-form-dialog/thread-after.png) |

### 12. 新建项目

| 修改前 | 修改后 |
| --- | --- |
| ![修改前](assets/2026-10-09-form-dialog/project-before.png) | ![修改后](assets/2026-10-09-form-dialog/project-after.png) |

### 13. 新建群聊

| 修改前 | 修改后 |
| --- | --- |
| ![修改前](assets/2026-10-09-form-dialog/group-before.png) | ![修改后](assets/2026-10-09-form-dialog/group-after.png) |

### 14. 个人 Eva · 新建分组

| 修改前 | 修改后 |
| --- | --- |
| ![修改前](assets/2026-10-09-form-dialog/personal-folder-before.png) | ![修改后](assets/2026-10-09-form-dialog/personal-folder-after.png) |

### 15. 清理：任务标题错误装饰

| 修改前 | 修改后 |
| --- | --- |
| ![修改前](assets/2026-10-09-form-dialog/cleanup-task-before.png) | ![修改后](assets/2026-10-09-form-dialog/cleanup-task-after.png) |

### 16. 清理：助理名称错误装饰

| 修改前 | 修改后 |
| --- | --- |
| ![修改前](assets/2026-10-09-form-dialog/cleanup-assistant-before.png) | ![修改后](assets/2026-10-09-form-dialog/cleanup-assistant-after.png) |

### 17. 混合表单：Semi 原生必填标记

| 修改前 | 修改后 |
| --- | --- |
| ![修改前](assets/2026-10-09-form-dialog/required-label-before.png) | ![修改后](assets/2026-10-09-form-dialog/required-label-after.png) |

### 18. 新建分组：消除正文与字段重复留白

| 修改前 | 修改后 |
| --- | --- |
| ![修改前](assets/2026-10-09-form-dialog/spacing-before.png) | ![修改后](assets/2026-10-09-form-dialog/spacing-after.png) |


## 远端整合记录

- 整合基线：`origin/main` 的 `0d90f16cde84431c5a396faa05ebeac21f3bd9ba`
- 表单工作稿提交：`e17be18`
- 逐段整合标题资源入口、聊天设置依赖、成员 UI、IM 补丁与通用运行时冲突；保留远端 Tooltip 生命周期修复、AI 授权、GROUP.md 编辑预览/删除、任务筛选及定向数据读取
- 远端新增子区创建保留重名检查、打开已有/归档子区、创建记录与创建后跳转；表单改接公共 Form / Dialog，空提交可显示错误且支持遮罩关闭
- GROUP.md 保留远端较新的完整编辑器，移除本分支旧版平行实现；该编辑器未在本轮重新迁移为公共 Form，不声称全站表单已无例外
- 连接中心专属源码相对远端基线无改动；本地备份不进入 Git

## 本次整合验证

- `npm test`：515 项通过
- Edge 表单、焦点、留白、子区、GROUP.md 与 Tooltip 回归：49 项；首次 48 项通过，子区重名错误提示修复后相关 2 项重跑通过
- Edge 搜索、按钮、标题与成员选择器回归：33 项通过
- 构建、manifest、项目合同、协作合同、消息路由合同、补丁哈希、生成模块语法与差异格式检查通过
- 版本更新为 `10-09 v6`；远端提交及 GitHub CI 状态以 Git 历史和质量检查为准，本记录不声称 Vercel 已完成部署
