import React from 'react';
import {Popover} from './063-popover.jsx';
import PersonalRailForm from './063-personal-rail-form.jsx';

const Anchor = React.forwardRef(function Anchor({target}, ref) {
  React.useImperativeHandle(ref, () => target, [target]);
  return null;
});

export default function PersonalRenamePopover({request}) {
  const {target, onClose} = request;
  const closeOutside = event => {
    if (event.target.closest('.semi-select-option, .semi-select-dropdown')) return;
    onClose();
  };
  return <Popover visible trigger="custom" position="rightTop" contentClassName="eva-personal-rename-popover"
    content={<PersonalRailForm request={request}/>} onClickOutSide={closeOutside}
    onEscKeyDown={onClose} onVisibleChange={visible => { if (!visible) onClose(); }}>
    <Anchor target={target}/>
  </Popover>;
}
