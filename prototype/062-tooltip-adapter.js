/* Compatibility adapter for declarative DOM surfaces.
 * Semi Tooltip owns hover, focus, delays, positioning, dismissal and portal state.
 * This adapter only connects an existing DOM node to the React component and
 * unmounts it when its owner removes the node. No virtual anchor or show/hide API.
 */
(function(root){
 'use strict';
 root.EvaTooltipAdapter={install({React:R,createRoot,Tooltip}){
  const h=R.createElement,selector='[data-eva-tooltip]',records=new Map();
  let serial=0;
  const events={onMouseEnter:'mouseenter',onMouseLeave:'mouseleave',onMouseOver:'mouseover',onMouseOut:'mouseout',onFocus:'focus',onBlur:'blur',onClick:'click',onKeyDown:'keydown',onContextMenu:'contextmenu'};
  const Target=R.forwardRef(function Target({target,...props},ref){
   R.useImperativeHandle(ref,()=>target,[target]);
   R.useLayoutEffect(()=>{
    const bindings=Object.entries(events).filter(([key])=>typeof props[key]==='function');
    for(const [key,event] of bindings)target.addEventListener(event,props[key]);
    const previous=target.getAttribute('aria-describedby');
    if(props['aria-describedby'])target.setAttribute('aria-describedby',props['aria-describedby']);
    return()=>{for(const [key,event] of bindings)target.removeEventListener(event,props[key]);if(previous===null)target.removeAttribute('aria-describedby');else target.setAttribute('aria-describedby',previous);};
   });
   return null;
  });
  function Tip({target,content,clamp}){
   const [eligible,setEligible]=R.useState(false);
   const [dismissed,setDismissed]=R.useState(false);
   R.useLayoutEffect(()=>{
    const measure=()=>setEligible(target.isConnected&&target.getClientRects().length>0&&(!clamp||target.scrollWidth>target.clientWidth+1||target.scrollHeight>target.clientHeight+1));
    measure();const resize=new ResizeObserver(measure);resize.observe(target);return()=>resize.disconnect();
   },[target,content,clamp]);
   R.useLayoutEffect(()=>{
    const dismiss=()=>setDismissed(true),reset=()=>setDismissed(false);
    target.addEventListener('click',dismiss);
    target.addEventListener('mouseleave',reset);
    return()=>{target.removeEventListener('click',dismiss);target.removeEventListener('mouseleave',reset);};
   },[target]);
   return eligible&&!dismissed?h(Tooltip,{content,trigger:'hover'},h(Target,{target})):null;
  }
  const host=document.createElement('div');host.setAttribute('data-eva-tooltip-adapter','');document.body.append(host);
  const reactRoot=createRoot(host);
  function reconcile(){
   let changed=false;
   for(const [target] of records)if(!target.isConnected||!target.matches(selector)){records.delete(target);changed=true;}
   for(const target of document.querySelectorAll(selector)){
    const content=target.getAttribute('data-eva-tooltip');
    if(!content){if(records.delete(target))changed=true;continue;}
    const clamp=target.hasAttribute('data-eva-tooltip-clamp');
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
