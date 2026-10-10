import React from 'react';
import Popconfirm from '@douyinfe/semi-ui/lib/es/popconfirm';

const Anchor = React.forwardRef(function Anchor({target}, ref) {
  React.useImperativeHandle(ref, () => target, [target]);
  return null;
});

// Native rail actions keep their DOM trigger; the route's React owner controls
// the confirmation lifecycle and Semi owns the popup, focus and buttons.
export default function PersonalActionConfirm({request, onClose}) {
  const {kind, target, detail, onApply} = request;
  const conversation = kind === 'delete-conversation';
  return <Popconfirm visible={true} position="rightTop" className="eva-personal-delete-popconfirm"
    title={conversation ? '删除对话' : '删除文件夹'}
    content={conversation ? `删除“${detail.title}”？删除后无法恢复。` : '其中的对话会移回「最近」。'}
    okText="删除" okType="danger" cancelText="取消" cancelButtonProps={{autoFocus: true}}
    onConfirm={() => { onApply(); onClose(); }} onCancel={onClose}
    onClickOutSide={onClose} onEscKeyDown={onClose}
    onVisibleChange={visible => { if (!visible) onClose(); }}>
    <Anchor target={target}/>
  </Popconfirm>;
}
