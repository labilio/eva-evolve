import React from 'react';
import {useFloatingLabel} from './063-floating-label.js';
import {useFloatingFocus} from './063-floating-focus.js';
import {SubmissionError} from './063-forms.jsx';
import IconAlertTriangle from '@douyinfe/semi-icons/lib/es/icons/IconAlertTriangle';
import SemiPopconfirm from '@douyinfe/semi-ui/lib/es/popconfirm';
import {typography,floatingLayout,composition} from './063-ui-theme.js';

// Semi keeps positioning, visibility and keyboard navigation. The shared
// transaction boundary catches both synchronous and asynchronous failures.
export const Popconfirm = React.forwardRef(function Popconfirm({title,content,children,style,okText='确定',cancelText='取消',okButtonProps,cancelButtonProps,className='',returnFocus,description=false,onConfirm,onCancel,onVisibleChange,onClickOutSide,onEscKeyDown,icon=<IconAlertTriangle aria-hidden="true" style={{fontSize:18}}/>,...props},ref) {
 const [error,setError]=React.useState(''),[busy,setBusy]=React.useState(false);
 const lifecycle=React.useRef({epoch:0,pending:null,mounted:true});
 const focus=useFloatingFocus({visible:props.visible,returnFocus});
 const {titleId,descriptionId,labelRef}=useFloatingLabel(title != null,props['aria-label'],description&&content!=null);
 const reset=React.useCallback(()=>{lifecycle.current.epoch++;lifecycle.current.pending=null;setBusy(false);setError('');},[]);
 React.useEffect(()=>{lifecycle.current.mounted=true;return()=>{lifecycle.current.mounted=false;lifecycle.current.epoch++;};},[]);
 React.useEffect(()=>{if(props.visible===false)reset();},[props.visible,reset]);
 const confirm=async event=>{
  const state=lifecycle.current;
  if(state.pending)throw Error('操作正在处理中');
  const token={epoch:state.epoch};state.pending=token;setBusy(true);setError('');
  const isCurrent=()=>state.mounted&&state.epoch===token.epoch&&state.pending===token;
  try {
   await onConfirm?.(event,{isCurrent});
   // Rejection tells Semi not to close a newly reopened confirmation.
   if(!isCurrent())throw Error('确认已关闭');
  } catch(reason) {
   if(isCurrent())setError(reason?.message||'操作失败，请重试');
   throw reason;
  } finally {
   if(isCurrent()){state.pending=null;setBusy(false);}
  }
 };
 const bind=node=>{labelRef(node);focus.bind(node);};
 return <SemiPopconfirm ref={ref} icon={icon} showCloseIcon={false} {...props} returnFocusOnClose={false}
  onConfirm={confirm} onCancel={event=>{focus.restore();reset();return onCancel?.(event);}}
  onVisibleChange={visible=>{if(!visible){focus.close();reset();}onVisibleChange?.(visible);}}
  onClickOutSide={event=>{focus.outside();reset();onClickOutSide?.(event);}}
  onEscKeyDown={event=>{focus.restore();reset();onEscKeyDown?.(event);}}
  className={`eva-popconfirm ${content == null ? 'eva-popconfirm-single' : ''} ${className}`} style={{...floatingLayout,...style,...typography.body}}
  title={title == null ? title : <span id={titleId} ref={bind}>{title}</span>}
  content={content!=null||error?<><div id={descriptionId} ref={title==null?bind:undefined}>{content}</div><SubmissionError error={error}/></>:content}
  okText={okText} cancelText={cancelText}
  okButtonProps={{...okButtonProps,loading:busy||okButtonProps?.loading,size:composition.confirmation.controlSize,theme:'solid',style:{...okButtonProps?.style,...composition.confirmation.button}}}
  cancelButtonProps={{autoFocus:true,...cancelButtonProps,size:composition.confirmation.controlSize,type:'tertiary',theme:'light',style:{...cancelButtonProps?.style,...composition.confirmation.button}}}>
  {children}
 </SemiPopconfirm>;
});
