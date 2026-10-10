# Eva 设计、文案与公共组件

此目录是修改 Eva UI 和文案的阅读入口。官方指南提供依据，Eva 业务规范确定产品行为，公共组件负责复用实现；一个组件参数正确，不代表整个操作已经容易理解。

## 按任务阅读

| 修改内容 | 官方依据 | 项目实现合同 |
| --- | --- | --- |
| 表单、字段标签、占位符、帮助与错误 | [Semi Form 设计](https://semi.design/design/zh-CN/input/form)、[W3C 标签](https://www.w3.org/WAI/tutorials/forms/labels/) | [表单统一规范](../表单统一规范.md) |
| 单字段编辑、就地选择、浮层 | [Semi Popover](https://semi.design/zh-CN/show/popover)、[Select](https://semi.design/zh-CN/input/select)；同时检查操作是否需要确认提交 | [公共主题接入](../公共主题接入规范.md)、[组合评审](review.md) |
| 确认与模态操作 | [Semi Popconfirm](https://semi.design/zh-CN/feedback/popconfirm)、[W3C Dialog](https://www.w3.org/WAI/ARIA/apg/patterns/dialog-modal/) | [表单统一规范](../表单统一规范.md)、[弹窗失焦关闭](../弹窗失焦关闭规范.md) |
| 字体、颜色、间距、内容布局 | [Semi Tokens](https://semi.design/zh-CN/basic/tokens)、[Typography](https://semi.design/zh-CN/basic/typography)、[Space](https://semi.design/zh-CN/basic/space) | [公共主题接入](../公共主题接入规范.md)及对应业务规范 |
| 状态图标与品牌色 | [Ant Design 图标](https://ant.design/docs/spec/icon/?locale=zh-CN)、[Semi Tokens](https://semi.design/zh-CN/basic/tokens) | [状态图标颜色](../公共主题接入规范.md#状态图标的颜色)及对应业务规范 |
| 按钮、提示、空状态和中文文案 | [Ant 文案](https://ant.design/docs/spec/copywriting-cn/)、[Semi 文案](https://semi.design/zh-CN/experience/content-guidelines) | [文案使用](copywriting.md)、[组合评审](review.md) |

组件 API、设计指南、源码参数不是同一种依据。API 说明能力，设计指南说明适用条件，源码参数说明特定版本的默认实现。引用时标明是哪一种，不能把示例写法当成必须遵守的产品规则。

## 使用顺序

1. 明确用户要完成的任务及业务边界，查对应 Eva 专项规范。
2. 阅读相关官方章节的条件、例外和图例，不只搜索一句支持当前方案的话。
3. 按[采用边界](adoption.md)核对当前已确认取舍，查找公共实现；不重复发明控件。
4. 按[组合评审](review.md)检查完整操作，再执行对应合同与浏览器测试。
5. 新的产品取舍交用户确认；验收后把决定写回唯一合同，避免多处规则竞争。

参考指南保留官方链接，按任务阅读原文；不维护逐条版本、核对日期或快照校验。Eva 实际采用的规则写在对应规范，参数只在公共代码维护。

公共能力与测试的对应关系见[公共组件使用](components.md)。
