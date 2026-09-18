# EvaMate AI 执行协议

本目录中的文件共同构成 EvaMate Design System 0.3.0 的工程事实。任何 AI 在生成、修改或审查 EvaMate 产品页面时，都必须遵守本协议。

## 触发范围

在以下任务中必须读取本规范：

- 创建 EvaMate 产品页、桌面应用界面、对话页、编辑器或设置页；
- 将 Figma 设计转换为代码；
- 修改颜色、主题、排版、布局、背景、图标、动效或无障碍表现；
- 审查现有页面是否符合 EvaMate 视觉语言。

以下任务不应套用本规范：营销活动页、移动端原生界面、第三方嵌入页，除非用户明确指定。

## 读取顺序

1. `manifest.json`
2. `DESIGN.md`
3. `tokens.dtcg.json` 或 `tokens.json`
4. `styles.json`
5. `layout-contracts.json`
6. `QUALITY-GATES.md`

出现冲突时，优先级为：用户当前明确要求 > 目标 Figma 页面 > 本文件的 MUST > `layout-contracts.json` > `tokens.dtcg.json` > `styles.json` > DESIGN.md 中的 SHOULD/MAY。

## 生成算法

1. 先声明页面意图、视口、主题和信息密度。
2. 从 `layout-contracts.json` 选择最接近的壳结构；没有匹配项时只组合已有 Foundations，不发明新的品牌视觉。
3. 建立 `canvas → persistent navigation → workspace → content region → overlay` 的层级。
4. 先绑定 surface、text、border，再加入排版、间距、圆角、图标和效果。
5. 用 `tokens.css` 的语义变量实现 Light/Dark；禁止在组件或页面内维护第二套颜色表。
6. 先完成 1200 × 800 基准态，再按响应策略处理更窄或更宽视口。
7. 对照 `QUALITY-GATES.md` 自检；运行 `node validate.mjs`。
8. 交付时列出使用的布局合同、主题、未能遵守的规则以及原因。

## 强制约束

- MUST 只在令牌文件内出现 Primitive 色值；产品样式只使用 Semantic CSS Variables。
- MUST 保持 Light/Dark 使用同名语义角色，切换映射，不替换 DOM 结构。
- MUST 使用 PingFang SC；Web 回退顺序为 `-apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif`。
- MUST 把语义字重 600 保留在代码中。Figma 当前以 PingFang SC Medium 兼容 Semibold，不代表工程字重降为 500。
- MUST 使用 4 px 基础网格，同时保留 2、6、10、14、22、26 等被设计稿明确使用的值。
- MUST 让主要文字、图标、边框和焦点状态分别使用对应语义角色，不能以透明度代替错误的角色选择。
- MUST 为键盘交互提供 2 px 焦点边框或等价可见焦点，焦点不能只依赖阴影。
- MUST 保证普通必要文字对比度至少 4.5:1；`text/tertiary` 在浅色模式仅用于非必要信息、占位或禁用提示。
- MUST 使用 24 × 24 源网格的圆角线性图标；按 12/14/16/18/20/24/32 px 光学尺寸渲染。
- MUST NOT 使用 emoji、彩色实心图标、粗黑阴影、彩色渐变按钮或大面积品牌蓝背景。
- MUST NOT 把所有圆角统一成一个值；圆角必须表达控件、面板、窗口之间的层级。
- MUST NOT 创建本规范未定义的“通用组件视觉”，也不能声称本包包含组件库。

## 输入与输出

AI 开始前应获得：页面目标、内容结构、目标技术栈、视口范围、默认主题。缺失时可使用 1200 × 800、Light 和 Web 作为基准，但必须在交付说明中披露。

AI 最终应交付：可运行页面、所用令牌清单、主题实现、响应策略、无障碍说明和验证结果。不得只交付截图。

## 失败处理

- 找不到某个语义角色：先检查是否选错概念；确实缺失时使用最邻近的现有角色，并记录为规范缺口，不能新增硬编码色。
- 字体不可用：保持字号、行高和字重语义，使用规定回退字体；不得换展示字体。
- 页面超出基准视口：遵循 `layout-contracts.json` 的响应策略，不能整体缩放界面。
- 无法达到对比度：优先升级文本语义层级，而不是随意修改 Primitive。
