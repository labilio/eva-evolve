import React from 'react';
import Button from '@douyinfe/semi-ui/lib/es/button';
import {useFloatingFocus,initialFloatingFocus} from './063-floating-focus.js';
import {Form} from './063-forms.jsx';
import SemiPopover from '@douyinfe/semi-ui/lib/es/popover';
import {useFloatingLabel} from './063-floating-label.js';
import {floatingSurface,floatingLayout,typography,popoverLayout,composition} from './063-ui-theme.js';

// Semi owns positioning, visibility, portals, Escape and Tab navigation. Hover
// information keeps focus on its trigger; a click/custom dialog uses Semi's
// initialFocusRef. A render-function content may supply a more specific target.
export const Popover = React.forwardRef(function Popover({style,children,title,content,className='',trigger='hover',initialFocus='field',returnFocus,description=false,...props},ref) {
 const {titleId,descriptionId,labelRef}=useFloatingLabel(title != null,props['aria-label'] || (typeof content === 'string' ? content : undefined),description);
 const focus=useFloatingFocus({interactive:trigger!=='hover'&&trigger!=='focus',visible:props.visible,returnFocus});
 return <SemiPopover disableFocusListener={false} {...props} trigger={trigger} returnFocusOnClose={false}
  onVisibleChange={value=>{if(!value)focus.close();props.onVisibleChange?.(value);}}
  onClickOutSide={event=>{focus.outside();props.onClickOutSide?.(event);}}
  onEscKeyDown={event=>{focus.restore();props.onEscKeyDown?.(event);}} className={`eva-popover ${className}`} ref={ref} style={{...floatingLayout,...style,...floatingSurface}}
  content={context => <div tabIndex={-1} ref={node=>{
   labelRef(node);focus.bind(node);
   if (trigger !== 'hover' && trigger !== 'focus' && node && !context.initialFocusRef.current?.isConnected) context.initialFocusRef.current=initialFloatingFocus(node,initialFocus);
  }} onKeyDownCapture={event=>{if(event.key==='Escape'&&event.nativeEvent.isComposing)event.stopPropagation();}} style={{padding:popoverLayout.padding}}>
   {title != null && <div id={titleId} style={typography.title}>{title}</div>}
   <div id={descriptionId} style={{...typography.body,marginTop:title != null ? popoverLayout.titleGap : undefined}}>{typeof content === 'function' ? content(context) : content}</div>
  </div>}>{children}</SemiPopover>;
});

// Standard-sized actions for explicit-save forms.
function FloatingActions({onCancel,form,busy=false,disabled=false,submitLabel='保存'}) {
 return <div style={{display:'flex',justifyContent:'flex-end',gap:composition.form.buttonGap,marginTop:composition.form.actionGap}}>
  <Button type="tertiary" theme="light" size={composition.form.controlSize} style={composition.form.button} onClick={onCancel}>取消</Button>
  <Button theme="solid" size={composition.form.controlSize} style={composition.form.button} htmlType="submit" form={form} loading={busy} disabled={disabled}>{submitLabel}</Button>
 </div>;
}

// Layout owns inter-field gaps; Semi owns labels, help and error spacing.
const FloatingFormContext=React.createContext(false);
function FloatingFields({children}) {
 if(!React.useContext(FloatingFormContext)) throw new Error("FloatingForm.Fields must be inside FloatingForm");
 return <div className="eva-form-stack" style={{display:'flex',flexDirection:'column',gap:composition.form.fieldGap}}>{children}</div>;
}

export function FloatingForm({children,onCancel,busy=false,disabled=false,submitLabel='保存',className='',style,id,...props}) {
 const generatedId=React.useId();
 const formId=id||'eva-form-floating-'+generatedId;
 return <FloatingFormContext.Provider value={true}>
  <Form {...props} id={formId} style={{...style,display:'flex',flexDirection:'column',gap:composition.form.fieldGap}} className={`eva-floating-form ${className}`}>{children}</Form>
  <FloatingActions form={formId} onCancel={onCancel} busy={busy} disabled={disabled} submitLabel={submitLabel}/>
 </FloatingFormContext.Provider>;
}

FloatingForm.Fields=FloatingFields;
