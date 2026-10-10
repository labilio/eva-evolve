# Tooltip 接入规则

提示使用运行时现有的 Semi Tooltip。使用默认 hover 触发与默认延迟，按需设置 content、position、closeOnEsc、clickTriggerToHide；不另存显隐状态、不另设显示/关闭计时器、不创建虚拟定位锚点。

React 控件直接包裹 `EvaTooltipComponent`（对 Semi Tooltip 的无状态导出）。触发子元素必须有真实 DOM；当前兼容运行时的 Button ref 不能可靠解析为 DOM，因此按钮外使用 inline-flex span 作为触发元素。组件随业务所有者卸载；角色导致提示含义变化时使用角色文案作为 key，关闭旧提示。

旧的声明式 DOM 表面仍保留 data-eva-tooltip、data-eva-tooltip-position 和 data-eva-tooltip-clamp 作为内容配置。`062-tooltip-adapter.js` 仅把 Semi 提供的事件回调接到真实节点，提供真实 DOM ref，并随节点移除卸载 Semi 组件。它不接管显隐或位置，不提供 show/hide API。MutationObserver 只维护节点挂载关系，ResizeObserver 只判断元素是否有尺寸以及文本是否实际截断；没有截断时不挂载 Tooltip。新 React 入口不要使用该兼容适配，应直接使用组件。

模态弹窗关闭并将焦点归还给旧 DOM 触发按钮时，适配层不把这次焦点归还当成新的提示触发。用户之后重新悬停或用键盘聚焦按钮，仍由 Semi 正常显示提示。

旧 DOM 点击后会同步重建按钮的入口，页面点击委托应在冒泡阶段运行，让按钮自己的 Tooltip 点击处理先完成。重建前后表示同一业务按钮时，使用稳定的 `data-eva-tooltip-key` 保留这次点击的关闭状态；焦点因重建离开但指针仍悬停时不重置，实际离开后重新允许显示。个人 Eva 侧栏依此处理；React 入口继续直接使用 Semi 组件。

已删除旧的 062-tooltip.js、062-tooltip.css、EvaTooltipBridge、EvaTooltipController、全局 pointer/focus 监听、悬停计时器与虚拟锚点。不得恢复这套逻辑。

验收覆盖持续悬停可见、位置在视口内、鼠标移开、任免切换、节点移除、节点隐藏、内容更新、未截断不提示、截断后提示及个人 Eva 路由往返。浏览器回归：`tests/browser/tooltip-lifecycle.mjs`；源码归属检查：`tests/tooltip-ownership.test.mjs`。
