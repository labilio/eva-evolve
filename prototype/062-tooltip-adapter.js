/* Compatibility adapter for declarative DOM surfaces.
 * Semi Tooltip owns hover, focus, delays, positioning, dismissal and portal state.
 * This adapter only connects an existing DOM node to the React component and
 * unmounts it when its owner removes the node. No virtual anchor or show/hide API.
 */
(function(root){
 'use strict';
 root.EvaTooltipAdapter={createTooltip({React:R,Tooltip}){
  // Semi 2.103 binds Escape on the trigger/portal only. Forward the key while
  // this instance is visible, so a mouse-opened tip can also be dismissed.
  // Semi still owns visibility, delays, hover persistence and positioning.
  return R.forwardRef(function EvaTooltip(props,ref){
   const instance=R.useRef(null),[visible,setVisible]=R.useState(false);
   R.useImperativeHandle(ref,()=>instance.current);
   R.useEffect(()=>{
    if(!visible)return;
    const escape=event=>{if(event.key==='Escape'){event.preventDefault();event.stopPropagation();instance.current?.handlePortalInnerKeyDown(event);}};
    document.addEventListener('keydown',escape,true);
    return()=>document.removeEventListener('keydown',escape,true);
   },[visible]);
   return R.createElement(Tooltip,{closeOnEsc:true,disableArrowKeyDown:true,...props,ref:instance,
    onVisibleChange:value=>{setVisible(value);props.onVisibleChange?.(value);}});
  });
 },install({React:R,createRoot,Tooltip}){
  const h=R.createElement,selector='[data-eva-tooltip]',records=new Map();
  let serial=0;
  const events={onMouseEnter:'mouseover',onMouseLeave:'mouseout',onMouseOver:'mouseover',onMouseOut:'mouseout',onFocus:'focusin',onBlur:'focusout',onClick:'click',onKeyDown:'keydown',onContextMenu:'contextmenu'};
  const Target=R.forwardRef(function Target({target,...props},ref){
   R.useImperativeHandle(ref,()=>target,[target]);
   R.useLayoutEffect(()=>{
    // Match React's enter/leave ordering across roots: native mouseleave fires
    // after the portal's synthetic enter and would re-arm Semi's close timer.
    const bindings=Object.entries(events).filter(([key])=>typeof props[key]==='function').map(([key,event])=>[event,e=>{
     if((key==='onMouseEnter'||key==='onMouseLeave')&&e.relatedTarget instanceof Node&&target.contains(e.relatedTarget))return;
     props[key](e);
    }]);
    for(const [event,handler] of bindings)target.addEventListener(event,handler);
    const previous=target.getAttribute('aria-describedby');
    if(props['aria-describedby'])target.setAttribute('aria-describedby',props['aria-describedby']);
    return()=>{for(const [event,handler] of bindings)target.removeEventListener(event,handler);if(previous===null)target.removeAttribute('aria-describedby');else target.setAttribute('aria-describedby',previous);};
   });
   return null;
  });
  function Tip({target,content,clamp}){
   const [eligible,setEligible]=R.useState(false),[present,setPresent]=R.useState(false),[open,setOpen]=R.useState(false);
   const [dismissed,setDismissed]=R.useState(false);
   R.useLayoutEffect(()=>{
    const text=typeof clamp==='string'&&clamp&&clamp!=='true'?target.querySelector(clamp):target;
    const measure=()=>{const shown=target.isConnected&&target.getClientRects().length>0;setPresent(shown);if(!shown)setOpen(false);setEligible(shown&&(clamp===null||!!text&&(text.scrollWidth>text.clientWidth+1||getComputedStyle(text).whiteSpace!=='nowrap'&&text.scrollHeight>text.clientHeight+1)));};
    measure();const resize=new ResizeObserver(measure);resize.observe(target);if(text&&text!==target)resize.observe(text);return()=>resize.disconnect();
   },[target,content,clamp]);
   R.useLayoutEffect(()=>{
    const dismiss=()=>{setDismissed(true);setOpen(false);},reset=()=>setDismissed(false);
    target.addEventListener('click',dismiss);
    target.addEventListener('mouseleave',reset);target.addEventListener('focusout',reset);
    return()=>{target.removeEventListener('click',dismiss);target.removeEventListener('mouseleave',reset);target.removeEventListener('focusout',reset);};
   },[target]);
   // Hover actions can change text width as the pointer enters the popup. Keep
   // an already-open tip mounted until Semi reports that interaction ended.
   return present&&(eligible||open)&&!dismissed?h(Tooltip,{content,trigger:'hover',className:'eva-passive-tooltip',onVisibleChange:setOpen},h(Target,{target})):null;
  }
  const host=document.createElement('div');host.setAttribute('data-eva-tooltip-adapter','');document.body.append(host);
  const reactRoot=createRoot(host);
  function reconcile(){
   let changed=false;
   for(const [target] of records)if(!target.isConnected||!target.matches(selector)){records.delete(target);changed=true;}
   for(const target of document.querySelectorAll(selector)){
    const content=target.getAttribute('data-eva-tooltip');
    if(!content){if(records.delete(target))changed=true;continue;}
    const clamp=target.getAttribute('data-eva-tooltip-clamp');
    const previous=records.get(target);
    if(!previous||previous.content!==content||previous.clamp!==clamp){records.set(target,{target,content,clamp,key:++serial});changed=true;}
   }
   if(changed)reactRoot.render(h(R.Fragment,null,...Array.from(records.values(),record=>h(Tip,record))));
  }
  // This observes DOM ownership only. It never derives or writes product state.
  const observer=new MutationObserver(reconcile);
  observer.observe(document.body,{subtree:true,childList:true,attributes:true,attributeFilter:['data-eva-tooltip','data-eva-tooltip-clamp']});
  reconcile();
 }};
})(window);
