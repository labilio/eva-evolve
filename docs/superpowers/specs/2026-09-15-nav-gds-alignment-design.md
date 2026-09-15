# 主菜单选中态对齐 GDS 2.0 规范（P0-A）

日期：2026-09-15
范围：一级导航（`.layout-sider`）的 hover / 选中 / 圆角表面态，及其 token 解耦
状态：待评审

## 1. 目标

让一级导航的交互表面符合 Eva GDS for AI 2.0，并把导航状态色从 IM 气泡色中解耦，使其可独立随浅色／暗色主题切换。

本次**不改**任何运行时几何（行高、宽度、缩进、顶栏）。几何改造属 P0-B，另出规格。

## 2. 依据

规范 §2.1 规定冲突时的来源优先级为「基准图 > 本文件 MUST 规则 > components.json > tokens」。三层依据一致：

| 层级 | 依据 | 内容 |
|---|---|---|
| 基准图（最高） | `UI 规范/gds-for-ai2.0/assets/reference/01-home.png` | 选中项「新建任务」为白底 + 浅灰细描边；未选项无底色；品牌蓝只出现在 Hi 气泡与发送按钮 |
| MUST 规则 | design.md §1.3 | MUST NOT 用大面积品牌蓝背景替代白色与细边框体系 |
| 观测值 `[O]` | design.md §7.2 | 选中为白色底 + `#DBDBDB` 边框；圆角 8 |
| 配额规则 | design.md §3.2 | 品牌蓝 MAY 用于线性图标、选中边框和发送按钮；不得用来铺满普通卡片 |
| 状态补全 `[R]` | design.md §13 | hover 只用 `surface.subtle` 或 6% 黑透明层；pressed 增加到 9%，均不改变尺寸 |
| 暗色要求 | design.md §3.4 | `nav-hover` / `nav-selected` 属项目层扩展令牌，MUST 提供暗色对应值，落在应用侧 token 层 |

关于 §1.2 签名第 3 条「品牌蓝……只负责主行动、选中和品牌识别」与 §7.2 的张力：§3.2 把品牌蓝在选中态中的位置限定为「选中边框」，§7.2 针对侧栏这一具体场景给出中性 `#DBDBDB`。按就近优先，侧栏导航选中态不使用品牌蓝。

## 3. 现状事实

| # | 位置 | 现状 | 与规范的关系 |
|---|---|---|---|
| F1 | `prototype/047-gds-tokens.css:79` | `--eva-nav-selected: #dce9ff` | 违反 §1.3：浅蓝铺满选中项 |
| F2 | `prototype/012-mode-layer.css:78` | 选中项 `color: var(--eva-nav-accent)`（`#1563eb`） | 违反 §3.2：蓝底 + 蓝字同时出现 |
| F3 | `prototype/047-gds-tokens.css:78` | `--eva-nav-hover: #e2e3e5` | 不符 §13：既非 `surface.subtle` 也非 6% 黑透明层 |
| F4 | `prototype/047-gds-tokens.css:92` | `--eva-im-bubble-outgoing: var(--eva-nav-selected)` | 耦合：导航选中色与 IM 外发气泡色共用同一 token |
| F4b | `prototype/017-im-shell.css:417` | `.eva-im-mention-options > button.is-active { background: var(--eva-nav-selected) }` | 耦合：@提及下拉的选中项也消费同一 token。`grep -rn "eva-nav-selected" prototype/` 共三个消费方，此为第三个 |
| F5 | `prototype/043-final-layout-convergence.css:144` | 选中项 `border-radius: 10px !important` | 不符 §7.2：应为 8px（已有 `--eva-radius-control: 8px`） |
| F6 | `prototype/057-gds-dark-tokens.css:48-49` | 暗色硬写 `--eva-nav-hover: #2f2f2f`、`--eva-nav-selected: #1e3a63` | 硬编码，不随语义 token 变化 |
| F7 | `prototype/047-gds-tokens.css:157,159` | `--eva-icon-nav: 18px`、`--eva-icon-stroke: 1.5` | 已符合 §7.2 与 `icon.size.navigation`，无需改动 |

## 4. 设计决策

### D1 — 先解耦全部同名消费方，再动导航

`--eva-nav-selected` 当前有三个消费方（`grep -rn "eva-nav-selected" prototype/`）：导航选中（`012-mode-layer.css:79`）、IM 外发气泡（`047-gds-tokens.css:92`）、@提及下拉选中项（`017-im-shell.css:417`）。导航选中态改为白色后，后两者若继续引用会同时失效——气泡变白、@提及下拉白底叠白底选中项不可见。因此必须先把三者拆成三个独立 token，再改导航。

**IM 外发气泡**：`047-gds-tokens.css:91` 现有注释为 `/* User-confirmed: outgoing bubbles exactly match navigation selection. */`。本次改造推翻这条已确认决定：规范要求导航选中为白底，而气泡必须保持浅蓝，两者不可能继续相等。

```css
--eva-im-bubble-outgoing: #dce9ff;   /* 从 var(--eva-nav-selected) 改为字面值，值不变 */
```

**取值保持 `#dce9ff` 不变，不改成 `#dce8ff`。** 本次只做解耦，不动视觉。设计师稿实测为 `#dce8ff`，但 `UI Html/2026-09-14-EVA设计对比/EVA设计差异分析.md` 第 24 项自己的结论是「肉眼差异很小，不值得单独引入第二种品牌浅蓝」；引入 1/255 通道差会制造两个"看起来差不多但不是同一个值"的浅蓝，收益为零。

**@提及下拉选中项**：新增独立 token，语义是"列表项选中"，不是"导航选中"：

```css
--eva-list-option-selected: #dce9ff;  /* @提及等下拉列表的选中项，与导航选中态无关 */
```

`017-im-shell.css:417` 改为引用 `--eva-list-option-selected`。

暗色下两者沿用 `057-gds-dark-tokens.css` 现有策略（该文件第 58 行已说明其暗色处理方式），需各补一条显式定义，替代原先经 `--eva-nav-selected` 间接获得的 `#1e3a63`。

### D2 — 导航状态 token 全部改为引用语义 token

`047-gds-tokens.css` 导航段改为：

```css
/* 导航交互表面 · GDS §7.2 / §13：白底 + 中性细描边，品牌蓝不出场 */
--eva-nav-hover: var(--eva-overlay-hover);            /* rgba(0,0,0,.06) */
--eva-nav-pressed: var(--eva-overlay-pressed);        /* rgba(0,0,0,.09) */
--eva-nav-selected: var(--eva-surface-primary);       /* #ffffff */
--eva-nav-selected-border: var(--eva-border-subtle);  /* #dbdbdb */
--eva-nav-selected-text: var(--eva-text-primary);     /* #1e1e1e */
```

`--eva-nav-accent` 保留但不再用于选中态背景或文字，仅供后续需要品牌蓝的导航元素使用。

因为五个值全部引用语义 token，而 `057-gds-dark-tokens.css` 已把 `--eva-overlay-hover`（第 43 行）、`--eva-border-subtle`（第 34 行）、`--eva-surface-primary`（第 13 行）重指为暗色值，暗色态自动跟随。据此 **删除** `057` 第 48–49 行的两条硬编码导航覆盖。

### D2b — 被否决的组合解：白底 + 品牌蓝细指示条

除「纯白卡」与「浅蓝铺满」外，存在第三个候选：选中项白底 + 左侧 2–3px 品牌蓝竖指示条。它同时成立于两条依据——品牌蓝只占极小面积（不违反"高饱和色只用于极小面积聚焦点"），且 GDS §3.2 明确「品牌蓝 MAY 用于……选中边框」。

**本次不采用**，理由是基准图 `assets/reference/01-home.png` 中选中项没有任何蓝色元素，而 §2.1 规定基准图是最高优先级依据。指示条属于在基准图之外新增视觉概念，不符合"用最少新概念解决同一问题"。

保留此候选作为风险预案：若第 8 节的辨识度风险在真机上成立，优先启用指示条，而不是回退蓝底。

### D3 — 选中态用内描边，避免回流

`012-mode-layer.css` 选中规则改为白底 + 内描边 + 深色文字：

```css
.eva-nav-entry .box-border.cursor-pointer:active,
.eva-personal-entry:active,
.eva-nav-entry .box-border.cursor-pointer.bg-fill-3,
.eva-personal-entry.is-selected {
  color: var(--eva-nav-selected-text) !important;
  background: var(--eva-nav-selected) !important;
  box-shadow: inset 0 0 0 1px var(--eva-nav-selected-border);
}
```

用 `inset box-shadow` 而非 `border`，因为运行时的行几何由 vendor 的 Tailwind 类持有，加真实边框会挤压内容 1px。这也符合基准图中「浅灰**内**描边」的观察，以及 §13「hover / pressed 不改变尺寸」的要求。

选中文字沿用现有 `font-weight: var(--eva-fw-medium)`（`012-mode-layer.css:85`）。字重不是颜色手段，规范未禁止，且基准图中「新建任务」呈中等字重。

### D4 — pressed 与 hover 分离

现状 `:active` 与 `.bg-fill-3`（选中）共用一条规则，导致按下时直接呈现选中态。拆开：`:hover` → `--eva-nav-hover`，`:active` → `--eva-nav-pressed`，选中 → D3 的白卡。符合 §13 对三态的区分。

### D5 — 选中圆角收为 8px

`043-final-layout-convergence.css:144` 的 `border-radius: 10px !important` 改为 `var(--eva-radius-control)`（8px）。

## 5. 不在本次范围

以下项经核对属几何或骨架，留给 P0-B：

- 导航行高（现测 34px 常规 / 38px Eva；规范 §7.2 要求 38–39px。注意设计师稿用的是 40px，与规范不符，以规范为准）
- 一级导航宽度 180px、二级栏 260px
- 全宽顶栏与窗口控制
- 二级导航容器形态，及需要新增的 `two-level-navigation` 布局契约

划分依据是 `012-mode-layer.css:69` 的既有政策：「Keep runtime geometry and selection ownership; adapt its utility colors here」。本层只改表面色与圆角，不动运行时几何。

**P0-B 将覆盖 AGENTS.md 的现行基准，需一并更新文档。** AGENTS.md「项目级三栏式视觉一致性」一节写明「全局导航默认展开 180px、折叠 80px；中栏默认 260px，可在 220–480px 拖拽」，并注明这是 2026-09-07（main `a6213ed`）用户确认的基准、「不得再以旧标准回退已认可样式」。P0-B 把一级导航改为约 240px 属于覆盖该条款，依据是用户 2026-09-15 的明确决定（以融合产品截图为框架基准）。实施 P0-B 时必须同步修改 AGENTS.md 该节与 `docs/三栏式现行视觉规范.md`，否则文档与实现互相矛盾。

## 6. 待确认项

**GDS 的适用范围。** AGENTS.md 明确「GDS 的适用范围是个人 Eva 体验。团队 IM 仍以 Octo-Web 成熟 IM 能力为标准」。但一级导航是全局外壳，同时承载消息、项目、通讯录等团队入口。本规格用 GDS §7.2 的侧栏条款去规定全局导航，属于把 GDS 适用范围从「个人 Eva 体验」扩展到「全局导航外壳」。

这不影响本次改动的技术正确性（导航是外壳而非 IM 业务组件），但需要一句明确认可，以免日后与 AGENTS.md 的范围条款冲突。若不认可，本规格应缩小到只作用于 `/guid`、`/conversation/:id` 路由下的导航态，代价是导航在不同路由下呈现两套选中样式——不建议。

## 7. 验收

1. 浅色下一级导航选中项为纯白底 + `#dbdbdb` 内描边 + `#1e1e1e` 文字，无任何蓝色底或蓝色文字。
2. hover 为 6% 黑透明层，pressed 为 9%，两者与选中态视觉可区分，且行尺寸无变化。
3. 选中项圆角为 8px。
4. 切到暗色：选中项为 `#242424` 底 + `#4a4a4a` 内描边 + 浅色文字；hover/pressed 为白透明层。`057` 中不再存在导航状态的硬编码色值。
5. IM 外发气泡在浅色下仍为 `#dce9ff`（值不变，仅解除对导航 token 的引用），暗色下为 `057` 定义值，均不随导航选中态变化。
6. **@提及下拉的选中项仍为 `#dce9ff` 可见高亮**，未变白。验证路径：任意 IM 输入框输入 `@` 唤出候选列表，用方向键移动选中项，确认高亮全程可见（浅色与暗色各验一次）。
7. `grep -rn "eva-nav-selected" prototype/` 只剩两处：`047-gds-tokens.css` 的定义与 `012-mode-layer.css` 的导航消费；`017-im-shell.css` 与 `--eva-im-bubble-outgoing` 均已改为各自独立 token。
8. `grep -n "#e2e3e5" prototype/*.css` 无命中（`#dce9ff` 应仍有命中，见第 5、6 条）。
9. 1280×720 与 900px 宽视口下，导航行无横向溢出、无 1px 抖动。
10. 按 CONTRIBUTING.md 产品源码分级，推送前执行 `npm test`、`npm run build`、`npm run check:manifest`、`npm run check:project`（含侧栏选中态合同）。

## 8. 风险

- **推翻既有决定**：D1 反转了 `047:91` 标注为 User-confirmed 的耦合。已在第 4 节说明理由（规范优先），需评审确认。
- **选中态对比度下降**：白底 + `#dbdbdb` 描边在浅灰玻璃侧栏上的区分度弱于现在的浅蓝。基准图证明这是规范意图，但若真机上辨识度不足，按 D2b 启用「白底 + 品牌蓝细指示条」预案，**不得回退到蓝底**。
- **公共 token 的连带影响**：本次动的是三个入口共用的公共 token。AGENTS.md 要求「修改公共 token 仍需核对所有入口」。第 7 节第 6–7 条即为该核对的验收形式；实施时若 `grep` 发现新增消费方，必须先处理再改导航。
- **`!important` 叠加**：`012-mode-layer.css` 已使用 `!important` 覆盖运行时工具类。新增的 `box-shadow` 无同名竞争者，无需 `!important`；若实测被覆盖，应查明来源层而非直接加 `!important`。
