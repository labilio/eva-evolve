# Tooltip 使用规范

本轮 Tooltip 整改依据 Semi Design、USWDS 与 W3C；仅约束提示的使用和交互，不改变业务动作、权限或导航。

## 使用条件

- 无文字的操作图标，可以用短提示说明动作；按钮仍须具有独立的无障碍名称。
- 已省略的名称可以补充全文；按实际承载文字的元素测量，完整显示时不提示。
- 简略时间、图表数据点等可以补充完整日期、单位和数值。
- 已有清晰文字的按钮、导航、完整姓名，不重复提示同一内容。
- 不给整行／整张卡片加通用动作提示，再与内部名称或按钮形成嵌套提示。
- 权限限制、错误、必须知道的操作条件直接显示，不仅放在 Tooltip 中。
- 可点击内容、长说明或复杂操作使用合适的 Popover、详情或内联说明。

## 交互与实现

- 提示支持鼠标悬停和键盘聚焦；指针可移入提示继续阅读；Esc 先关闭提示，不顺带关闭所在对话框。
- 点击触发业务操作、目标卸载或切换页面时，不遗留浮层。菜单打开时不能残留同入口的提示。
- Semi 拥有延迟、定位和显隐生命周期。禁止另写全局计时器、虚拟锚点或批量将所有 title 转成 Tooltip。
- `data-eva-tooltip` 只用于明确选定的兼容 DOM 入口。`data-eva-tooltip-clamp=""` 或 `"true"` 测量自身；内部文字截断时可指定后代选择器，例如 `"span"`。触发器仍保留在可聚焦的原按钮上。
- 用量图展开后的数据点提供日期、数值和键盘入口，不把整排热图变成大量额外 Tab 停靠点。
- Semi 2.103 的浮层插入检查仅认 `:hover`，运行时采用严格锚点兼容 `:focus-within`；升级 Semi 时必须复核该修正。鼠标打开的提示由可见实例转发 Esc 到 Semi 自身的键盘处理，不维护另一份显隐控制器。

## 验证

`tests/browser/tooltip-lifecycle.mjs` 检查持续显示、指针移入、Esc、键盘聚焦、截断、点击、内容更新、隐藏、卸载、菜单及路由往返。文件卡验证同一位置只能显示必要的一层提示；文件库验证状态说明不依赖悬停。

## 参考

- [Semi Design Tooltip](https://semi.design/zh-CN/show/tooltip)
- [USWDS Tooltip](https://designsystem.digital.gov/components/tooltip/)
- [W3C：悬停或聚焦出现的内容](https://www.w3.org/WAI/WCAG22/Understanding/content-on-hover-or-focus.html)
- [WAI-ARIA Tooltip Pattern](https://www.w3.org/WAI/ARIA/apg/patterns/tooltip/)
