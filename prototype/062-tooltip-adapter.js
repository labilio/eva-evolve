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
 },install({React:R,createRoot,Tooltip,Popover}){
  const h=R.createElement,selector='[data-eva-tooltip], [data-eva-hover-card]',records=new Map();
  let serial=0;
  const events={onMouseEnter:'mouseover',onMouseLeave:'mouseout',onMouseOver:'mouseover',onMouseOut:'mouseout',onFocus:'focusin',onBlur:'focusout',onClick:'click',onKeyDown:'keydown',onContextMenu:'contextmenu'};
  const Target=R.forwardRef(function Target({target,...props},ref){
   R.useImperativeHandle(ref,()=>target,[target]);
   R.useLayoutEffect(()=>{
    // Match React's enter/leave ordering across roots: native mouseleave fires
    // after the portal's synthetic enter and would re-arm Semi's close timer.
    const bindings=Object.entries(events).filter(([key])=>typeof props[key]==='function').map(([key,event])=>[event,e=>{
     if((key==='onMouseEnter'||key==='onMouseLeave')&&e.relatedTarget instanceof Node&&target.contains(e.relatedTarget))return;
     // A closed Semi modal restores focus to its opener. This is focus
     // restoration, not a new request to show the opener's hover tooltip.
     if(key==='onFocus'&&(
      e.relatedTarget instanceof Element&&e.relatedTarget.closest('.semi-modal')||
      [...document.querySelectorAll('.semi-modal')].some(modal=>modal.getClientRects().length>0&&!modal.contains(target))
     ))return;
     props[key](e);
    }]);
    for(const [event,handler] of bindings)target.addEventListener(event,handler);
    const previous=target.getAttribute('aria-describedby');
    if(props['aria-describedby'])target.setAttribute('aria-describedby',props['aria-describedby']);
    return()=>{for(const [event,handler] of bindings)target.removeEventListener(event,handler);if(previous===null)target.removeAttribute('aria-describedby');else target.setAttribute('aria-describedby',previous);};
   });
   return null;
  });
  function Tip({target,content,clamp,card}){
   const [eligible,setEligible]=R.useState(false),[present,setPresent]=R.useState(false),[open,setOpen]=R.useState(false);
   const [dismissed,setDismissed]=R.useState(false);
   R.useLayoutEffect(()=>{
    const texts=typeof clamp==='string'&&clamp&&clamp!=='true'?Array.from(target.querySelectorAll(clamp)):[target];
    const measure=()=>{const shown=target.isConnected&&target.getClientRects().length>0;setPresent(shown);if(!shown)setOpen(false);setEligible(shown&&(clamp===null||texts.some(text=>text.scrollWidth>text.clientWidth+1||getComputedStyle(text).whiteSpace!=='nowrap'&&text.scrollHeight>text.clientHeight+1)));};
    measure();const resize=new ResizeObserver(measure);resize.observe(target);for(const text of texts)if(text!==target)resize.observe(text);return()=>resize.disconnect();
   },[target,content,clamp]);
   R.useLayoutEffect(()=>{
    const dismiss=()=>{setDismissed(true);setOpen(false);},reset=e=>{
     // A redraw blurs the clicked button while the pointer still rests on it.
     // Keep click dismissal until the pointer actually leaves that control.
     if(e.type==='focusout'&&target.matches(':hover'))return;
     setDismissed(false);
    };
    target.addEventListener('click',dismiss);
    target.addEventListener('mouseleave',reset);target.addEventListener('focusout',reset);
    return()=>{target.removeEventListener('click',dismiss);target.removeEventListener('mouseleave',reset);target.removeEventListener('focusout',reset);};
   },[target]);
   // Hover actions can change text width as the pointer enters the popup. Keep
   // an already-open tip mounted until Semi reports that interaction ended.
   if(!present||!(eligible||open)||dismissed)return null;
   if(card)return h(Popover,{content:h('div',{className:'eva-conversation-hover-card__body'},
     h('div',{className:'eva-conversation-hover-card__heading'},h('strong',null,card.title),card.time&&h('time',null,card.time)),
     h('div',{className:'eva-conversation-hover-card__folder'},h('span',null,'分组'),h('span',null,card.folder)),
     card.preview&&h('p',{className:'eva-conversation-hover-card__message'},card.preview)),
     trigger:'hover',position:'rightTop',mouseEnterDelay:180,mouseLeaveDelay:160,
     contentClassName:'eva-conversation-hover-card',onVisibleChange:setOpen},h(Target,{target}));
   return h(Tooltip,{content,trigger:'hover',className:'eva-passive-tooltip',onVisibleChange:setOpen},h(Target,{target}));
  }
  const host=document.createElement('div');host.setAttribute('data-eva-tooltip-adapter','');document.body.append(host);
  const reactRoot=createRoot(host);
  function reconcile(){
   let changed=false;
   const replaced=new Map();
   for(const [target,record] of records)if(!target.isConnected||!target.matches(selector)){
    const identity=target.getAttribute('data-eva-tooltip-key');
    if(identity)replaced.set(identity,record.key);
    records.delete(target);changed=true;
   }
   for(const target of document.querySelectorAll(selector)){
    const card=target.hasAttribute('data-eva-hover-card')?{
      title:target.getAttribute('data-eva-hover-title')||'',
      folder:target.getAttribute('data-eva-hover-folder')||'',
      preview:target.getAttribute('data-eva-hover-preview')||'',
      time:target.getAttribute('data-eva-hover-time')||''}:null;
    const content=card?card.title:target.getAttribute('data-eva-tooltip');
    if(!content){if(records.delete(target))changed=true;continue;}
    const clamp=target.getAttribute('data-eva-tooltip-clamp');
    const previous=records.get(target);
    const cardKey=card?JSON.stringify(card):'';
    if(!previous||previous.content!==content||previous.clamp!==clamp||previous.cardKey!==cardKey){
     const identity=target.getAttribute('data-eva-tooltip-key');
     records.set(target,{target,content,clamp,card,cardKey,key:identity&&replaced.has(identity)?replaced.get(identity):++serial});changed=true;
    }
   }
   if(changed)reactRoot.render(h(R.Fragment,null,...Array.from(records.values(),record=>h(Tip,record))));
  }
  // This observes DOM ownership only. It never derives or writes product state.
  const observer=new MutationObserver(reconcile);
  observer.observe(document.body,{subtree:true,childList:true,attributes:true,attributeFilter:['data-eva-tooltip','data-eva-tooltip-clamp','data-eva-hover-card','data-eva-hover-title','data-eva-hover-folder','data-eva-hover-preview','data-eva-hover-time']});
  reconcile();
 }};
})(window);
