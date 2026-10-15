# 弹窗正文留白核查

本轮范围为 Eva 产品弹窗的组合留白，不改变权限、保存时机、信息架构或已确认的复杂编辑器尺寸；独立批注工具不属于产品弹窗。

## 原因

外壳统一不等于任意内容组合已经统一：原生 p 的默认外边距、Semi 字段的上下 padding、业务容器 margin 可以叠加。接任者弹窗实际测得正文 padding 为24px，但首段还有14px上外距，说明之后再叠加字段12px内距。旧矩阵只核对外壳与字段 CSS，没有测量首尾内容实际边界。

## 源码清单与处理边界

| 入口族 | 共同实现 | 处理 |
| --- | --- | --- |
| 群主/项目负责人转让、转让并退出 | SinglePersonPicker | 使用 Dialog.Fields，后果说明移至候选列表后；短列表自然高度 |
| 群聊退出、解散、清空、失败重试 | ChatSettings / Dialog | Typography 正文、公共首尾边界；重试混排使用 Dialog.Fields |
| 项目归档、恢复、删除 | 009-6 / Dialog | 混排正文与字段使用 Dialog.Fields，保留校验及危险操作行为 |
| 文件移至回收站、永久删除 | FileConfirmation | 使用 Dialog.Text；不改可恢复性 |
| 会话文件存到文件库、移除项目成员时指定接任者 | FileLibrarySave / Members | 使用 Dialog.Fields；清除业务字段首尾重复 margin，保留卡片内部 padding |
| AI 小队解散 | 009-5 / Dialog | 使用 Dialog.Text；不改消息、草稿、子区删除规则 |
| 群/项目创建、批量拉人、AI 小队成员 | MemberPicker | 保留双栏固定工作区与候选/已选独立滚动，不套用单选短列表压缩 |
| 文件创建/重命名/移动/快捷方式 | FileForm | 使用 Dialog.Fields / Dialog.Text；移除说明尾部12px默认外距与字段、警告、源文件卡片的重复 margin；行内标签浮层不改变布局 |
| 个人分组、角色设置、技能、子区创建 | 各自 Form + Dialog | 保留原字段容器；通过既有14场景矩阵验证不增加外距 |
| AI 管理员授权 | ContentStack + Card / InfoList | 已有明确内容组合，不改变卡片内部留白 |
| 任务 compose、助理 editor、设置工作区、身份/头像编辑、文件详情/预览、数字员工信息卡 | 各业务所有者 | 不属于普通短确认；保留预览、编辑与滚动空间，不全局清空内部 p/Card/Section |

公共样式对旧的直属确认段落只消除首尾外距，不深入富文本。新增标准内容通过公共组合接入；此清单不是对第三方 vendor 内任意弹窗的全部迁移声明。
