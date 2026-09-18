---
name: EvaMate Design System
version: 0.3.0
status: foundations-stable
source: Figma YfmZumn8azSodYXTmQXbC4
reference_viewport: 1200x800
themes: [Light, Dark]
components_included: false
last_verified: 2026-09-09
---

# EvaMate Design System 0.3.0

## 0. 规范角色

本文件定义 EvaMate 产品页面的视觉语法，而不是某一张页面的像素说明。令牌解决“使用什么值”，布局合同解决“值如何组成页面”，本文件解决“为什么这样组合以及何时不能这样用”。

规范词：

- **MUST**：不满足就不能称为 EvaMate 0.3.0 实现。
- **SHOULD**：默认遵守，仅在明确产品理由下偏离。
- **MAY**：允许变化，但不得破坏 MUST。
- `[O]`：Figma 直接观测；`[D]`：由重复规律归纳；`[R]`：面向生产的补充建议。

## 1. 视觉身份

EvaMate 是“安静、轻盈、可信的智能工作台”。界面依赖克制的中性色层级、单一蓝色品牌焦点、宽松但精确的留白、圆角线性图标以及轻量玻璃和柔和投影建立辨识度。[D]

五个不可替换的信号：

1. 1200 × 800 桌面基准画布与 260/940 主分栏。[O]
2. 776 px 主内容列，位于工作区中央。[O]
3. `blue/600 = #1563EB` 作为浅色模式品牌主色；深色模式由同一语义角色映射到更亮蓝色。[O/R]
4. 8/12/16/20 px 逐级圆角，表达控件、卡片、浮层和窗口层级。[D]
5. 白与深灰表面、细边框、低透明阴影；不使用浓重装饰制造层次。[D]

## 2. 令牌策略

### 2.1 三层关系

```text
Primitive：原始颜色和值，只负责存储
    ↓ alias
Semantic：surface / text / icon / border / action / feedback / decoration
    ↓ consume
Page：布局、状态与内容
```

- 产品代码 MUST 只消费 Semantic Color。
- Primitive MUST NOT 出现在业务 CSS、JSX、Vue/Svelte 模板或运行时主题逻辑中。
- Dimension、Typography、Behavior 可直接消费，因为它们已按用途命名。
- Light/Dark 必须共享语义名称，只改变别名映射。

### 2.2 来源优先级

冲突时按以下顺序决策：当前用户明确要求 → 当前目标 Figma → 本文 MUST → `layout-contracts.json` → `tokens.dtcg.json` → `styles.json` → SHOULD/MAY。

## 3. 颜色与主题

### 3.1 Surface 层级

页面从低到高使用：

1. `color/surface/canvas`：应用最底层背景。
2. `color/surface/sidebar`：持久导航区域。
3. `color/surface/base`：正文、标准输入和主要内容表面。
4. `color/surface/subtle`：弱工作面、输入外层、选中前的分区。
5. `color/surface/raised`：Popover、菜单和浮层。
6. `color/surface/sunken`：编辑工作底面、内嵌区域。

`hover` 与 `pressed` 是覆盖层，不是新的永久表面。`selected` 用于弱选中；强选中应同时使用 `border/selected` 或 `action/primary`，但避免多处并列强蓝。[R]

### 3.2 文字与图标

- `text/primary`：标题、正文、主要标签。
- `text/secondary`：次级正文、帮助信息、次要操作。
- `text/tertiary`：占位、时间、非必要元信息；浅色模式对比度约 3.07:1，不承载必要普通文本。
- `text/brand` 与 `icon/brand`：品牌、链接、技能等明确蓝色语义。
- 反馈必须使用 danger/warning/success 角色，不能只靠文字描述或只靠颜色。

图标颜色必须来自 `color/icon/*`，不要借用文本变量。这样主题和禁用状态可独立演进。

### 3.3 深色模式

- 根节点以 `data-theme="dark"` 或框架等价机制切换。
- 禁止使用 CSS `filter: invert()`、全局混合模式或基于浅色值计算深色值。
- Dark 使用更深的 canvas、更亮的文字、更亮的品牌蓝和亮色发丝边。
- 图片、插画与用户内容不自动反相；只调整其容器、遮罩和边界。
- 主题切换不改变层级、排版、尺寸或信息架构。

### 3.4 品牌蓝配额

同一视觉区域只保留一个主要蓝色行动。蓝色可以同时出现在相关图标与文字中，但不能再叠加不必要的大面积蓝底、蓝色描边和蓝色阴影。[D]

## 4. 排版

### 4.1 字体

- UI：`PingFang SC`，回退 `-apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif`。
- 品牌装饰：`Praise Regular`，仅用于 Eva 气泡或品牌情绪字，不用于正文、导航、按钮和数字。
- 语义字重：Regular 400、Medium 500、Semibold 600。

Figma 当前环境没有 PingFang SC Semibold，`Display / Hero` 以 Medium 兼容展示；工程实现仍 MUST 保留 600 的语义字重。

### 4.2 文字层级

| Style | Font | Size/Line | Weight | 用途 |
| --- | --- | --- | --- | --- |
| Display / Hero | PingFang SC | 32/40 | 600 | 页面唯一 Hero 标题 |
| Title / Medium | PingFang SC | 16/24 | 500 | 应用名、任务标题、一级界面标题 |
| Title / Small | PingFang SC | 14/22 | 500 | 栏目标题、紧凑标题 |
| Body / Large | PingFang SC | 15/24 | 400 | 对话、输入、主要正文 |
| Body / Large Medium | PingFang SC | 15/24 | 500 | 技能提及、重点正文 |
| Body / Medium | PingFang SC | 14/22 | 400 | 导航、列表、辅助正文 |
| Body / Small | PingFang SC | 14/20 | 400 | 胶囊、紧凑正文 |
| Label / Small | PingFang SC | 12/20 | 400 | 元信息、工具标签 |
| Caption / Small | PingFang SC | 12/16 | 400 | 状态栏、次要说明 |
| Utility / Compact | PingFang SC | 12/12 | 400 | 极紧凑编辑器工具 |
| Badge / Compact | PingFang SC | 13/22 | 500 | 徽标、文件类型 |
| Brand / Mascot | Praise | 23/28 | 400 | 品牌装饰文字 |

一个区域只能有一个主标题。不得用字号堆砌层级；优先通过内容顺序、间距和字重组织信息。

## 5. 间距与布局

基础网格为 4 px。标准阶梯是 `0, 2, 4, 6, 8, 10, 12, 14, 16, 20, 22, 24, 26, 32, 40, 48, 64, 80`。

- 组件内部优先 8/12/16。
- 页面区块优先 24/32/40/48。
- 14 px 是桌面边缘安全距离和停靠输入的重要值。
- 2/6/10/22/26 来自实际密度需求，不得为了“整齐”删除。
- 相关项靠近、不同分区拉开；不要给所有间隔同一个值。

页面骨架以 `layout-contracts.json` 为准。1200 × 800 是验收基准，不是要求所有窗口只能固定尺寸。更窄视口通过折叠导航、保持内容最小宽和让次要面板移入抽屉响应，禁止整体缩放界面。

## 6. 圆角与边框

| 级别 | 值 | 语义 |
| --- | ---: | --- |
| Micro | 4/6 | 小标记、局部装饰 |
| Control | 8/10 | 导航项、按钮、紧凑控件 |
| Card | 12 | 卡片、胶囊、缩略图 |
| Panel | 16 | 输入面板、选择器、编辑画布 |
| Window | 20 | 应用外壳、大型容器 |
| Full | 999 | 圆形按钮和完全胶囊 |

外层半径 SHOULD 大于或等于内层半径。标准边框 1 px，发丝边 0.5 px，键盘焦点 2 px。结构分隔使用 `border/secondary` 或 `tertiary`；可交互轮廓使用 `primary`；选中与焦点不能混用。

## 7. 背景、玻璃与层级

- 纯内容工作区以 `surface/base` 或 `canvas` 为主，避免背景噪声。
- 玻璃只用于悬浮或持久导航表面，必须有可读的实色回退。
- Small blur 20：输入面板、选择器和浮层。
- Medium blur 90、Large blur 100：侧栏背景层；不能用于正文容器。
- Light 与 Dark 分别使用对应 Elevation 样式。不要让同一节点同时使用 Light/Dark 两套阴影。
- 遮罩使用 `surface/scrim`；模态开启时背景不得继续作为键盘焦点上下文。

## 8. 图标

- 形态：24 × 24 源网格、圆端点、圆连接、均匀线宽、无填充的线性图标。
- 光学尺寸：12 下拉/微型、14 紧凑、16 正文、18 导航、20 工具栏、24 标准、32 大型操作。
- 同一工具栏只能使用一个图标家族与一致笔画。
- 常用语义参考：`edit`、`clock-2`、`book-open`、`search`、`plus-circle`、`more-horizontal`、`chevron-down`、`mic`、`smile`、`folder-open`、`sidebar-close`、`terminal-square`。
- 图标按钮必须有可访问名称；图标不能代替状态文本的唯一表达。
- 不允许 emoji、Unicode 箭头、彩色实心图标或多套风格混用。

## 9. 动效

动效只解释状态变化，不承担装饰表演：

- instant 0 ms：无过渡的状态同步。
- fast 120 ms：hover、pressed、图标反馈。
- standard 180 ms：Popover、局部显隐、主题内表面变化。
- slow 240 ms：面板进入、布局级过渡。
- standard easing：`cubic-bezier(0.2, 0, 0, 1)`。

所有非必要动效 MUST 支持 `prefers-reduced-motion: reduce`，降为 instant 或无位移动画。

## 10. 无障碍

- 普通必要文字对比度至少 4.5:1；大号文字至少 3:1。
- Light：primary/base 约 16.67:1，secondary/base 约 8.86:1，brand/base 约 5.23:1。
- Dark：primary/base 约 15.56:1，secondary/base 约 10.38:1，brand/base 约 8.17:1。
- `text/tertiary` 浅色约 3.07:1，只用于非必要信息。
- 所有交互必须具备 hover、pressed、focus-visible、disabled 状态；颜色之外至少增加轮廓、文字、图标或形态线索。
- 焦点顺序遵循页面阅读顺序，浮层打开后焦点进入浮层并在关闭后回到触发点。

## 11. 页面生成协议

AI 或开发者应按以下顺序搭建：

1. 识别页面任务和主行动。
2. 选择 `standard-workspace` 或 `editor-workspace` 布局合同。
3. 放置 canvas、导航、workspace 和内容区。
4. 绑定 Light 主题并完成 1200 × 800 基准态。
5. 用文字样式建立信息层级，主标题最多一个。
6. 加入品牌蓝主行动、线性图标和必要效果。
7. 切换 Dark，检查每个语义角色，不做颜色反转。
8. 应用响应策略与 reduced motion。
9. 运行自动验证并完成人工视觉门禁。

## 12. 禁止项

- 不得使用未经定义的颜色、字体、阴影或圆角。
- 不得将 Primitive 颜色作为业务 API。
- 不得把桌面界面整体按比例缩放来适配窄屏。
- 不得用渐变、霓虹、重阴影、玻璃泛滥或大面积品牌蓝“增强视觉”。
- 不得把 `text/tertiary` 用于正文、表单说明或错误信息。
- 不得在没有组件事实时编造“官方 EvaMate 组件”。
- 不得把 Light 与 Dark 做成两套结构不同的页面。
