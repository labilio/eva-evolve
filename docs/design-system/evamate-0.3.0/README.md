# EvaMate Design System 0.3.0 · AI 规范包

这是一套供代码生成模型、设计转代码工具和开发者共同使用的设计契约。它把 Figma 中的 Variables、Styles 与页面规律转换为稳定、可检索、可校验的工程文件，目标是让不同模型生成的 EvaMate 页面仍保持一致的颜色、字体、布局、背景、图标与深色模式。

本包只定义 Foundations 与页面装配规则，不提供或伪造具体组件库。

## 最短使用方式

1. AI 先读取 `AGENTS.md` 与 `manifest.json`。
2. 再读取 `DESIGN.md`，判断页面类型、层级和主题。
3. 实现时加载 `tokens.css`；需要跨端转换时读取 `tokens.dtcg.json`。
4. 文字、投影与网格从 `styles.json` 获取，页面骨架从 `layout-contracts.json` 获取。
5. 完成后执行 `node validate.mjs`，并逐项检查 `QUALITY-GATES.md`。

可直接交给模型的提示词见 `AI-PROMPT.md`。

## 文件导航

| 文件 | 角色 | 读取时机 |
| --- | --- | --- |
| `AGENTS.md` | AI 的强制执行协议 | 第一份 |
| `manifest.json` | 包版本、能力、文件顺序与数量清单 | 第一轮 |
| `DESIGN.md` | 视觉语言、主题、字体、布局、背景和图标规范 | 规划页面时 |
| `tokens.dtcg.json` | 自动生成的 DTCG 交换镜像，保留 Light/Dark 语义映射 | 生成代码前 |
| `tokens.json` | Figma Variables 的单一真相源 | 工具读取/维护时 |
| `tokens.css` | 可直接加载的 CSS Custom Properties | Web 实现时 |
| `styles.json` | 12 个文字、11 个效果、2 个网格样式 | 实现视觉样式时 |
| `layout-contracts.json` | 页面壳、内容列、编辑态分栏与响应策略 | 搭建页面骨架时 |
| `AI-PROMPT.md` | 可复制的模型任务约束 | 发起生成任务时 |
| `QUALITY-GATES.md` | 自动与人工验收清单 | 提交前 |
| `references/source.md` | Figma 来源、证据等级与限制 | 查证时 |
| `validate.mjs` | JSON、数量、别名、CSS 覆盖与契约校验 | 每次修改后 |

## 核心规则

- MUST 在产品代码中使用 `color/*` 语义令牌，不能直接使用 Primitive 色值。
- MUST 通过 `data-theme="light|dark"` 或等价主题上下文切换模式，不能对颜色做运行时反转。
- MUST 使用 4 px 基础网格与规范中的非等差关键值；不得把 6、10、14、22、26 px 擅自取整。
- MUST 使用 PingFang SC 作为中文 UI 字体；Praise 只用于 Eva 品牌装饰文字。
- MUST 使用一致的圆角线性图标，不能用 emoji 或字符代替界面图标。
- MUST 先建立页面层级，再填充内容；不要从孤立卡片开始拼凑页面。
- MUST NOT 把本包理解成组件库。本包提供的是令牌、样式和布局合同。

## 主题接入

```html
<html data-theme="light">
  <link rel="stylesheet" href="/path/to/tokens.css" />
</html>
```

```js
document.documentElement.dataset.theme = "dark";
```

所有业务样式引用语义变量，例如：

```css
.page {
  color: var(--evamate-color-text-primary);
  background: var(--evamate-color-surface-canvas);
}
```

不要在业务 CSS 中复制 `#1563EB`、`#1E1E1E` 等原始值。

## 验证

```bash
cd /Users/cjn/codefordesign/gdsforai/evamate-design-system-for-ai-0.3.0
node validate.mjs
```

修改令牌时只编辑 `tokens.json`，随后运行 `node build-artifacts.mjs` 重新生成 DTCG 与 CSS，再运行验证。生成文件带有源文件哈希，验证器会阻止漂移。

正式名称：**EvaMate Design System 0.3.0**

来源核验日期：2026-09-09
