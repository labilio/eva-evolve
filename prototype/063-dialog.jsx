import React from 'react';
import Modal from '@douyinfe/semi-ui/lib/es/modal';
import Button from '@douyinfe/semi-ui/lib/es/button';
import {dialogText} from './063-dialog-theme.js';
import {DialogContent} from './063-dialog-focus.jsx';

export const dialogWidths = Object.freeze({compact:420,standard:480,wide:680,fileDetail:720,compose:600,preview:760,editor:920});

// One native Semi modal policy. Business callers choose a size, content and actions.
// compose/editor retain their existing custom content composition, not a second modal.
function defaultContainer(zIndex = 1000) {
  const id=zIndex===1000?'eva-dialog-portal':'eva-dialog-portal-'+zIndex;
  let host=document.getElementById(id);
  if(!host){host=document.createElement('div');host.id=id;host.className='eva-dialog-portal';host.style.zIndex=zIndex;document.body.appendChild(host);}
  return host;
}

export function Dialog({size, width, className='', okText='确定', cancelText='取消', cancelButtonProps, okButtonProps, getPopupContainer, zIndex=1000, accessibleName, initialFocus, selectInitialText=false, description=false, returnFocus, bodyStyle, ...props}) {
  const dialogId=React.useId();
  const opener=React.useRef(null),wasVisible=React.useRef(false);
  if(props.visible&&!wasVisible.current)opener.current=document.activeElement;
  wasVisible.current=props.visible;
  const focus=initialFocus||(props.okType==='danger'||okButtonProps?.type==='danger'||props.footer?.props?.danger?'cancel':'field');
  const renderContent=React.useCallback(node=><DialogContent node={node} visible={props.visible} initialFocus={focus} selectInitialText={selectInitialText} onCancel={props.onCancel} dialogId={dialogId} accessibleName={accessibleName} description={description} opener={opener.current} returnFocus={returnFocus}/>,[props.visible,focus,selectInitialText,props.onCancel,dialogId,accessibleName,description,returnFocus]);
  const container=React.useCallback(()=>defaultContainer(zIndex),[zIndex]);
  const variant=size || (width===420?'compact':width===680?'wide':width===600?'compose':width===760?'preview':width===920?'editor':'standard');
  if(!Object.hasOwn(dialogWidths,variant))throw new Error('Unknown Eva dialog size: '+variant);
  return <Modal {...props} okText={okText} cancelText={cancelText} getPopupContainer={getPopupContainer||container} zIndex={zIndex} width={dialogWidths[variant]} centered maskClosable closeOnEsc={false} modalRender={renderContent} bodyStyle={{...dialogText.body,...bodyStyle}}
    className={'eva-dialog eva-dialog--'+variant+' '+className}
    cancelButtonProps={{'data-eva-dialog-cancel':true,style:dialogText.button,'aria-label':typeof cancelText==='string'?cancelText:undefined,...cancelButtonProps,type:'tertiary',theme:'light'}}
    okButtonProps={{style:dialogText.button,'aria-label':typeof okText==='string'?okText:undefined,...okButtonProps,theme:'solid'}}/>;
}

export function Actions({onCancel,onSubmit,cancelLabel='取消',submitLabel='保存',busy=false,disabled=false,danger=false,form,compact=false,children}) {
  return <div className={'eva-dialog-actions'+(compact?' eva-dialog-actions--compact':'')}>
    {children}
    {onCancel&&<Button data-eva-dialog-cancel style={{...dialogText.button,margin:0}} htmlType="button" type="tertiary" theme="light" size={compact?'small':'default'} onClick={onCancel}>{cancelLabel}</Button>}
    {submitLabel&&<Button style={{...dialogText.button,margin:0}} htmlType={form?'submit':'button'} form={form} type={danger?'danger':'primary'} theme="solid" size={compact?'small':'default'} loading={busy} disabled={disabled} onClick={onSubmit}>{submitLabel}</Button>}
  </div>;
}
