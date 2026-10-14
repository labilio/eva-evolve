import React from 'react';
import {dialogText} from './063-dialog-theme.js';

const candidateSelector='input:not([type="hidden"]):not([disabled]),textarea:not([disabled]),select:not([disabled]),[role="combobox"]:not([aria-disabled="true"]),button:not([disabled]),[tabindex="0"]';
const available=el=>el&&el.getClientRects().length&&!el.closest('[hidden],[inert],[aria-hidden="true"]');
const first=(root,selector)=>Array.from(root?.querySelectorAll(selector)||[]).find(available);

// Shared by themed Dialog and the legacy native Semi Modal adapter. This is
// event-local routing, not another popup state or document dismissal controller.
export function captureDialogEscape(event,panel,onCancel) {
 const native=event.nativeEvent||event;
 if(event.key!=='Escape'||native.isComposing||event.defaultPrevented)return false;
 const owner=event.target.closest('[role="dialog"]');
 if(owner&&owner!==panel)return true;
 const nested=!!first(panel,'[aria-expanded="true"],[role="listbox"],[role="menu"]');
 // Closed Select and Dropdown triggers swallow Escape before bubbling.
 if(!nested&&event.target.closest('.semi-select,[aria-expanded="false"][aria-controls],[aria-expanded="false"][aria-haspopup]')){
  event.preventDefault();event.stopPropagation();onCancel?.(event);
 }
 return nested;
}

// modalRender is Semi's public composition hook. Run inside the mounted native
// content before ModalContent's lifecycle selects its first button. No timeout,
// MutationObserver, second focus trap or per-business focus controller.
export function DialogContent({node,initialFocus='field',selectInitialText=false,onCancel,visible,dialogId,accessibleName,description,opener,returnFocus}) {
 const root=React.useRef(null),opened=React.useRef(false),nestedEscape=React.useRef(false),lastFocus=React.useRef(null);
 const originalRef=node.ref;
 const ref=React.useCallback(el=>{root.current=el;if(typeof originalRef==='function')originalRef(el);else if(originalRef)originalRef.current=el;},[originalRef]);
 React.useLayoutEffect(()=>{
  if(!visible){opened.current=false;return;}
  if(!root.current)return;
  if(opened.current){
   // Disabling/removing a focused submit button can leave focus on body.
   // Keep keyboard dismissal reachable while the existing save continues.
   if(document.activeElement===document.body&&lastFocus.current&&(!lastFocus.current.isConnected||lastFocus.current.matches(':disabled')))(first(root.current,'[data-eva-dialog-cancel]')||first(root.current,candidateSelector))?.focus({preventScroll:true});
   return;
  }
  opened.current=true;
  const panel=root.current,body=panel.querySelector('.semi-modal-body');
  let target=initialFocus==='title'?panel.querySelector('.semi-modal-title'):
   initialFocus==='cancel'?first(panel,'[data-eva-dialog-cancel]'):
   typeof initialFocus==='function'?initialFocus(panel):first(body,'input:not([type="hidden"]):not([disabled]),textarea:not([disabled]),select:not([disabled]),[role="combobox"]:not([aria-disabled="true"])')||first(body,candidateSelector);
  target=target||panel.querySelector('.semi-modal-title')||first(panel,candidateSelector);
  target?.focus({preventScroll:true});
  if(selectInitialText&&target?.matches('input,textarea'))target.select();
 });
 const restore=React.useRef({opener,returnFocus});restore.current={opener,returnFocus};
 React.useLayoutEffect(()=>()=>{
  const saved=restore.current;if(saved.opener?.isConnected&&available(saved.opener))return;
  const fallback=saved.returnFocus?.()||first(document.querySelector('main,[role="main"],.loop-page'),candidateSelector);
  fallback?.focus({preventScroll:true});
 },[]);
 const children=React.Children.map(node.props.children,child=>{
  if(!React.isValidElement(child))return child;
  if(child.props.className==='semi-modal-header')return React.cloneElement(child,{},React.Children.map(child.props.children,part=>
   React.isValidElement(part)&&part.props.className==='semi-modal-title'?React.cloneElement(part,{id:dialogId+'-title',tabIndex:-1,style:dialogText.title}):part));
  if(child.props.className?.split(' ').includes('semi-modal-body'))return React.cloneElement(child,{id:dialogId+'-body'});
  return child;
 });
 return React.cloneElement(node,{
  ref,'aria-label':accessibleName||node.props['aria-label'],
  'aria-labelledby':accessibleName||node.props['aria-label']?undefined:dialogId+'-title',
  'aria-describedby':description?dialogId+'-body':undefined,
  onFocusCapture:event=>{lastFocus.current=event.target;},
  onKeyDownCapture:event=>{
   const owner=event.target.closest('[role="dialog"]');
   if(owner&&owner!==root.current)return;
   if(event.key==='Tab'&&event.shiftKey&&event.target.tabIndex===-1){
    const nodes=Array.from(root.current.querySelectorAll(candidateSelector)).filter(el=>available(el)&&el.tabIndex>=0);
    if(nodes.length){event.preventDefault();event.stopPropagation();nodes.at(-1).focus();}return;
   }
   nestedEscape.current=captureDialogEscape(event,root.current,onCancel);
  },
  onKeyDown:event=>{
   if(event.key!=='Escape'||event.nativeEvent.isComposing)return;
   // Leave nested events available to their control/document dismissal owner.
   if(nestedEscape.current||event.defaultPrevented)return;
   event.stopPropagation();
   onCancel?.(event);
  },
 },children);
}
