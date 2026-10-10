import React,{useRef} from 'react';
import {Popconfirm} from './063-popconfirm.jsx';
import {Button,FileIcon} from './063-file-controls.jsx';

export function PersonalDelete({title,onConfirm}) {
 const host=useRef(null);
 const returnFocus=()=>host.current?.querySelector('button');
 return <span ref={host}><Popconfirm returnFocus={returnFocus} title={'删除“'+title+'”？'} content="删除后无法恢复" okText="删除对话" okButtonProps={{type:'danger'}} position="rightTop" onConfirm={onConfirm}>
  <Button type="tertiary" theme="borderless" onClick={event=>event.stopPropagation()} icon={<FileIcon name="trash-2"/>} aria-label={'删除对话：'+title} data-eva-tooltip="删除"/>
 </Popconfirm></span>;
}
