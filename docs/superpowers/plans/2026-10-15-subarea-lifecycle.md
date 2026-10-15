# 子区生命周期 Implementation Plan

> **For agentic workers:** Use superpowers:executing-plans to implement this plan inline. User approved implementation in this chat.

**Goal:** 移除子区关注与隐藏，已归档列表通过垃圾桶及公共 Popconfirm 软删除。
**Architecture:** EvaMembership 与 EvaMyAITeamGroup 保留各自数据所有权；共享 EvaThreadList 呈现管理入口。删除保留原记录并撤销正常访问。
**Tech Stack:** JavaScript, React, shared Semi Popconfirm, node:test, Edge.
**Spec:** 本对话 2026-10-15 用户确认；更新 docs/消息关注与项目置顶.md。

## Global Constraints
- 不合并 main、不推送；不改变最近页布局、导航或聚合模式。
- 保留置顶、免打扰、父群成员继承、消息与草稿隔离。
- 活跃 ⇄ 归档 → 软删除；仅现有子区管理者可操作，删除唯一入口为已归档列表。
- 原型仅本地留存，不宣称真实服务器审计已接入。

## Review Focus
- 旧隐藏、关注数据不能继续影响显示。
- 活跃直接删除、同一次归档并删除、越权删除均拒绝。
- 已删除子区不能通过旧链接、转发或选中态继续访问。
- Popconfirm 取消和 Escape 无副作用，确认后焦点落到仍存在的列表入口。
- 普通群与 AI 小队一致；AI 单聊 session 不纳入子区管理。

### Task 1: 数据与迁移
- [x] 先新增生命周期及旧状态迁移测试并确认失败。
- [x] 修改 membership / AI team store：归档前置、软删除审计、拒绝访问、移除隐藏和独立关注。
- [x] 运行受影响 node:test 并核对留存数据。

### Task 2: 共享界面和规则
- [x] 清理所有子区关注、隐藏入口、筛选与提及恢复逻辑。
- [x] EvaThreadList 已归档行加入共享 Popconfirm、垃圾桶、删除回调。
- [x] 移除旧删除对话框和死状态，保持最近页面结构。
- [x] 更新对应产品规则和被新决定取代的测试。

### Task 3: 本地验证
- [x] 构建、patch-hash、语法与相关合同检查。
- [x] Edge 核对供应链项目的归档、恢复、取消删除、确认删除、刷新、往返及权限。
- [x] 检查 AI 小队入口和暗色、键盘；本地 URL 交用户验收。

## 验证结果
- npm test：620/620 通过；构建、manifest、project contract、patch-hash 与生成模块语法检查通过。
- Edge：项目与 AI 小队归档删除流程、取消/Escape、恢复、刷新、旧链接、入口往返与暗色已检查；共享侧栏 Escape 回归 8/8 通过。权限由数据层测试覆盖。
- 本地预览：http://127.0.0.1:4580；等待用户亲自验收，未推送、未合并。
