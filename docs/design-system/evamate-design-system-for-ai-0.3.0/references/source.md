# 来源与证据

## Figma 真相源

- 文件：[Eva同学设计规范-内测版0909](https://www.figma.com/design/YfmZumn8azSodYXTmQXbC4/Eva%E5%90%8C%E5%AD%A6%E8%AE%BE%E8%AE%A1%E8%A7%84%E8%8C%83-%E5%86%85%E6%B5%8B%E7%89%880909?node-id=0-1)
- File key：`YfmZumn8azSodYXTmQXbC4`
- 参考页：`页面参考`，节点 `0:1`
- 参考画板：10 个，均为 1200 × 800
- 规范名称：EvaMate Design System 0.3.0
- 最后核验：2026-09-09

Figma 规范页：

| 页面 | Page ID | 主 Frame ID |
| --- | --- | --- |
| 00 · EvaMate 0.3.0 | `20:2699` | `21:2699` |
| 01 · Principles | `20:2700` | `22:2699` |
| 02 · Foundations · Color | `20:2701` | `23:2699` |
| 03 · Foundations · Typography | `20:2702` | `24:2699` |
| 04 · Foundations · Space & Layout | `20:2703` | `25:2699` |
| 05 · Foundations · Radius & Border | `20:2704` | `26:2699` |
| 06 · Foundations · Effects & Background | `20:2705` | `27:2699` |
| 07 · Foundations · Iconography | `20:2706` | `28:2699` |
| 08 · Theme & Accessibility | `20:2707` | `29:2699` |
| 90 · AI Usage Contract | `20:2708` | `30:2699` |

## Figma 库清单

- Variable Collections：5
- Variables：187
- Color Primitive：44，单模式 Value
- Color Semantic：56，Light/Dark 双模式，全部别名到 Primitive
- Dimension：56
- Typography：21
- Behavior：10
- Text Styles：12
- Effect Styles：11
- Grid Styles：2
- Paint Styles：0
- 本次规范创建的 Components / Component Sets / Instances：0

## 证据等级

- `[O] Observed`：直接读取自 Figma 页面、Variables 或 Styles。
- `[D] Derived`：从多个画板的重复几何与视觉规律归纳。
- `[R] Recommended`：为工程、响应式、无障碍或状态完整性补充的建议。

行业建议不能覆盖 `[O]`，但可以在不改变品牌事实的前提下补全源稿没有定义的生产边界。

## 采用的行业结构

- [Figma Variables Modes](https://help.figma.com/hc/en-us/articles/15343816063383-Modes-for-variables)：用同名语义变量承载 Light/Dark 映射。
- [Figma Tokens, variables, and styles](https://help.figma.com/hc/en-us/articles/18490793776023-Update-1-Tokens-variables-and-styles)：区分可复用变量与组合样式。
- [Design Tokens Community Group Format](https://www.designtokens.org/TR/2025.10/format/)：机器令牌使用 `$type`、`$value`、别名和扩展元数据。
- [Shopify Polaris Color Tokens](https://polaris.shopify.com/design/colors/color-tokens)：按用途消费颜色，不在业务层暴露原始色阶。
- [IBM Carbon Color Foundations](https://carbondesignsystem.com/elements/color/overview/)：以层级和交互角色组织主题颜色。
- [WCAG 2.2 Contrast Minimum](https://www.w3.org/WAI/WCAG22/Understanding/contrast-minimum.html)：普通必要文本目标 4.5:1。

## 已知限制

- 本包不包含组件、组件变体、Code Connect 或框架 UI 实现。
- Figma 环境缺少 PingFang SC Semibold；Figma 的 Hero Text Style 以 Medium 兼容，工程令牌仍为 600。
- 1200 × 800 是视觉基准；窄视口策略属于 `[R]`，不是原稿中的移动端设计。
- 原画板中的具体文案、用户头像和生成内容属于示例内容，不是品牌资产。
