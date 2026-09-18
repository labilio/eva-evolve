# EvaMate 页面生成提示词

将以下内容附加到产品页面开发任务中：

```text
你正在实现 EvaMate 产品页面。严格使用 `evamate-design-system-for-ai-0.3.0` 作为视觉与布局事实。

开始前：
1. 读取 AGENTS.md、manifest.json、DESIGN.md。
2. 读取 tokens.dtcg.json、tokens.json、styles.json、layout-contracts.json。
3. 说明页面意图、主行动、目标视口、默认主题，以及选择的布局合同。

实现约束：
- 业务代码只能使用 `--evamate-color-*` 语义颜色变量，禁止复制十六进制色值或直接消费 Primitive。
- 同一 DOM 结构必须支持 `data-theme="light"` 与 `data-theme="dark"`。
- 中文 UI 使用 PingFang SC；Hero 语义字重为 600。Praise 仅限品牌装饰文字。
- 以 4px 网格组织布局，保留规范中的 2/6/10/14/22/26px 特殊值。
- 优先使用 8/12/16/20px 层级圆角，不能把所有容器设为同一圆角。
- 图标使用 24×24 源网格的圆角线性风格；禁止 emoji、Unicode 字符和混用图标家族。
- 页面只保留一个强主行动，不使用彩色渐变按钮、重阴影或大面积品牌蓝。
- Light/Dark 通过语义映射实现，禁止 invert/filter 自动反相。
- 普通必要文字对比度至少 4.5:1；浅色 text/tertiary 只用于非必要信息。
- 支持键盘焦点、reduced motion、内容溢出和窄视口适配；不得整体缩放桌面页面。
- 本规范不包含组件。可以用项目已有组件实现，但不得声称新造组件是 EvaMate 官方组件。

完成后：
1. 运行 `node evamate-design-system-for-ai-0.3.0/validate.mjs`。
2. 按 QUALITY-GATES.md 检查 Light、Dark、1200×800 和窄视口。
3. 报告实际使用的布局合同、令牌、主题策略、验证结果和所有偏离项。
```

## 审查现有页面的提示词

```text
请以 `evamate-design-system-for-ai-0.3.0` 审查当前页面。按严重度输出问题：
P0 阻止交付；P1 明显破坏品牌或可用性；P2 一致性问题；P3 优化建议。

必须检查：语义颜色、Light/Dark、字体与文字层级、4px 网格、页面布局合同、圆角层级、背景与阴影、图标风格、对比度、键盘焦点、reduced motion、溢出与响应式。

每个问题给出：证据位置、违反的规范、建议令牌或布局合同、最小修复方案。没有证据时不要虚构问题。
```
