# 公共组件使用

业务统一从 `prototype/063-forms-entry.jsx` 接入；旧运行时使用注入的 `forms`。具体参数和行为分别由[公共主题接入规范](../公共主题接入规范.md)、[表单统一规范](../表单统一规范.md)维护，本页只说明选用及职责。

## 现有组合

| 任务 | 公共入口 | 谁负责组合 | 主要回归 |
| --- | --- | --- | --- |
| 模态填写、重命名、选择后提交 | Dialog + Form + Actions + useSubmission | Dialog 管正文外侧留白；Form 管字段；Actions 管页脚 | `tests/browser/dialog-form-spacing.mjs`、`tests/browser/dialog-focus-theme.mjs` |
| 轻量浮层内填写或选择后保存 | Popover + FloatingForm + useSubmission | Popover 管标题及外壳；FloatingForm 管字段之间及字段到按钮间距 | `tests/browser/floating-policy.mjs` |
| 简短的二次确认 | Popconfirm | 公共确认框管图标、正文、按钮和异步确认反馈；业务决定后果与危险性 | `tests/browser/floating-policy.mjs` |
| 菜单后打开编辑或确认 | ActionMenu | 公共菜单保留稳定触发器，在菜单关闭后打开对应浮层 | `tests/browser/business-overlays.mjs` |
| 文件编辑、文件标签 | FileForm | 同一业务组件供文件库、项目文件及文件详情调用 | `tests/browser/file-tags-form-migration.mjs` |
| 关联父任务 | ParentTaskForm | 复用 FloatingForm，业务负责候选及关联事务 | `tests/browser/business-overlays.mjs` |

普通信息 Popover 不强制添加按钮；Popconfirm 的紧凑按钮不用于填写型表单。不要按容器名字猜测里面所有控件的尺寸。

## 任意内容如何组合

每段空间只有一个所有者：外壳管内容到边缘，布局管相邻内容，控件管自身标签、帮助和错误。业务选择内容顺序及含义，不再给公共字段叠加 padding 或调整字号抵消另一层样式。

文字按用途选公共 `typography` 的 title、section、body、auxiliary；字段标签由所在 Form 的公共主题管理。不要把正文套上标题样式，也不要因为进入 Popover 就把所有文字缩小。

`FloatingForm.Fields` 是浮层表单内的字段分组，不是通用 Card、Modal 或页面布局组件。它只在 FloatingForm 内使用，分组间距仍由公共组合控制。

## 新内容与当前边界

公共出口已有 Semi Card；目前没有 Typography React 组件或 Space 组件；`typography` 是共享参数对象。不能把这些能力说成已经完成，更不能允许业务自行导入一套原生组件后各自改样式。

公共化不意味着重新设计，也不要求给每个原生组件再包一层。现有原生能力和全局主题已经满足要求时直接复用；只有需要反复使用的 Eva 配置或行为才在公共层统一维护。Card 自身的标题、正文、内边距归 Card；外层只管理 Card 与相邻元素的距离。不能用 Popover 的后代 CSS 改写 Card 内部所有标题，也不能把父容器的字号继承当成 Card 已正确适配的证明。具体选用 Card 还是普通内容组，应先判断是否真的需要独立分组和表面。

例如“设为 AI 管理员”中的灰底身份卡，使用公共 Semi Card 配合成员身份组件；Modal 正文负责外侧留白，卡片填充可用宽度，现有对齐无需重新设计。收口时保持现有外观、身份内容与授权行为，先消除重复配置，不另外发明卡片字号或密度。

新增组合至少验证正常内容、长文案、错误提示、隐藏内容和窄窗口下的实际几何；有交互再验证键盘与提交/取消。现有测试覆盖代表结构与已迁移业务，不穷举所有组合。

## 文案与行为一起检查

先按[完整任务评审](review.md)检查入口、标题、字段、提示和按钮合起来是否清楚。公共组件不能只靠字符串相同就自动删标签；文案精简也不能改变保存时机、权限或撤销能力。

机器能检查公共入口、实际尺寸、可访问名称和交互结果；不能以测试通过代替完整任务的人工验收。指南参考保留官方链接，不建立版本登记或资料校验门槛。

## Card 接入

`forms.Card` 底层使用 Semi，默认普通表面；`tone="muted"` 选择已有浅灰语义表面，不改变成员身份组件。圆角消费 `--eva-radius-control`，内容留白消费 `--eva-space-4`，灰底消费 `--eva-surface-subtle`。公共主题通过 Semi 原生 Sass 参数接入，不在业务重复设置 bodyStyle 或覆盖内部类。

当前迁入“设为 AI 管理员”中的身份卡；项目列表等旧 Card 尚未因此自动迁移。回归 `tests/browser/card-composition.mjs` 检查实际留白、对齐、token 变化传递及授权/取消/撤销。

## 静态说明列表

公共出口 `InfoList` 基于 Semi List / List.Item；业务传 `items: [{id, icon, title, description?}]`，id 使用稳定业务标识。用于权限或功能的静态说明，不承载点击、选择或开关。空列表不渲染，无描述不留第二行空位。

列表只负责内部图文排版、换行和行间距，外层 Modal / Popover / 页面负责周围留白。字阶由 `063-ui-theme.js` 管理，间距、颜色、圆角消费现有 token；Semi Sass 参数与必要组合 CSS 均集中在公共层。不要复制到业务 CSS。当前接入：设置 AI 管理员的三项权限说明。真实授权、取消与 token 联动回归见 `tests/browser/card-composition.mjs`。

## Card 与说明列表的组合

使用公共 `ContentStack` 排列相邻内容，`ContentStack.Section` 将可选 `description` 与内容归为一组。外层间距引用 `--eva-space-5`，组内引用 `--eva-space-3`；统一拉伸到宿主可用宽度，无外侧留白。说明文字复用 `typography.auxiliary`。省略说明不会留下说明空位。

Card 继续拥有内部 padding，InfoList 继续拥有行内对齐；组合容器只对齐组件外边缘，不越层修改头像或文字。业务不得再用负 margin、单独 gap 或 Modal footer margin 修补这一组合。这里是轻量 CSS 布局容器，不是新增 Semi 组件或万能表单布局，不抵消任意子组件自带的外边距。当前唯一接入为 AI 管理员授权说明，验收覆盖外边缘、相邻距离及授权行为。

说明列表的图标区域与文字块沿用 Semi List.Item 默认顶部对齐，不额外指定居中；标题或描述换行时，图标仍保持在文字块顶部。
