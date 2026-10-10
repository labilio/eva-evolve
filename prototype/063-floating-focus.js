import React from 'react';

export function availableFocusTarget(node) {
 return !!node?.isConnected && !!node.getClientRects().length &&
  !node.closest('[hidden],[inert],[aria-hidden="true"],[aria-disabled="true"]') &&
  !node.matches(':disabled') && getComputedStyle(node).visibility !== 'hidden';
}
export function initialFloatingFocus(root, preference='field') {
 if(typeof preference==='function') {const node=preference(root);if(availableFocusTarget(node))return node;}
 if(preference!=='content') {
  for(const selector of ['input:not([type="hidden"]),textarea,select,[role="combobox"]','button,[tabindex="0"]']) {
   const node=Array.from(root.querySelectorAll(selector)).find(availableFocusTarget);if(node)return node;
  }
 }
 return root;
}

// Semi owns visibility and Tab navigation. This adapter only restores focus at
// the public lifecycle boundary, including custom triggers and removed anchors.
export function useFloatingFocus({interactive=true,visible,returnFocus}) {
 const state=React.useRef({panel:null,opener:null,open:false,skip:false});
 const latest=React.useRef({interactive,returnFocus});latest.current={interactive,returnFocus};
 const restore=React.useCallback(()=>{
  const s=state.current;if(!s.open||s.skip||!latest.current.interactive)return;
  const active=document.activeElement;
  if(active!==document.body && active?.isConnected && !s.panel?.contains(active))return;
  const requested=latest.current.returnFocus;
  const target=(typeof requested==='function'?requested():requested)||s.opener;
  if(availableFocusTarget(target))target.focus({preventScroll:true});
 },[]);
 const close=React.useCallback(()=>{restore();state.current.open=false;},[restore]);
 const bind=React.useCallback(node=>{
  if(!node)return;
  const s=state.current;s.panel=node.closest('[role="dialog"]')||node;
  if(!s.open){s.open=true;s.skip=false;s.opener=document.activeElement;}
 },[]);
 const outside=React.useCallback(()=>{state.current.skip=true;},[]);
 React.useEffect(()=>{if(visible===false)close();},[visible,close]);
 React.useEffect(()=>()=>close(),[close]);
 return {bind,close,restore,outside};
}
