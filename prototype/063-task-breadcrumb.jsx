import React, {useLayoutEffect, useRef, useState} from 'react';
import Breadcrumb from '@douyinfe/semi-ui/lib/es/breadcrumb';
import {typography} from './063-ui-theme.js';

// The detail navigation chain owns continuity; closing it discards this state.
export function TaskBreadcrumb({items, separator, leading, currentId, viewportState}) {
  const viewport = useRef(null);
  const [tail, setTail] = useState(() => {
    const previous = viewportState.items || [];
    return previous.length > items.length && items.every((item, index) => previous[index]?.id === item.id)
      ? previous.slice(items.length) : [];
  });
  useLayoutEffect(() => {
    const host = viewport.current;
    if (!host) return;
    let frame, disposed = false;
    const previousId = viewportState.currentId;
    const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
    host.scrollTo({left: viewportState.left, behavior: 'instant'});
    const finish = () => { if (!disposed) setTail(value => value.length ? [] : value); };
    const position = (animate) => {
      cancelAnimationFrame(frame);
      const current = host.querySelector('[aria-current="page"]');
      if (!current) return;
      const rect = (tail.length ? current.querySelector('button') : current).getBoundingClientRect(), outer = host.getBoundingClientRect();
      const box = {left:rect.left, right:rect.right, width:rect.width};
      if (tail.length) {
        const trailing = parseFloat(getComputedStyle(current.querySelector('.semi-breadcrumb-item')).marginRight) || 0;
        box.width += trailing; box.right += trailing;
      }
      if (box.left >= outer.left && box.right <= outer.right) { finish(); return; }
      // On ascent, end within the shorter path's future scroll range before
      // removing the outgoing tail, preventing a second browser clamp/jump.
      const target = box.width > host.clientWidth
        ? host.scrollLeft + box.left - outer.left
        : host.scrollLeft + box.right - outer.right;
      const left = Math.max(0, Math.min(target, host.scrollWidth - host.clientWidth));
      const smooth = animate && !reduced && Math.abs(host.scrollLeft - left) > 1;
      host.scrollTo({left, behavior: smooth ? 'smooth' : 'instant'});
      if (!smooth) { finish(); return; }
      const settled = () => {
        if (disposed) return;
        if (Math.abs(host.scrollLeft - left) <= 1) finish();
        else frame = requestAnimationFrame(settled);
      };
      frame = requestAnimationFrame(settled);
    };
    if (previousId && previousId !== currentId) frame = requestAnimationFrame(() => position(true));
    else position(false);
    viewportState.currentId = currentId;
    // Store presentation data only, never callbacks bound to an unmounted task.
    viewportState.items = [...items, ...tail].map(({id, label, identifier}) => ({id, label, identifier}));
    const remember = () => { viewportState.left = host.scrollLeft; };
    const interrupt = () => { cancelAnimationFrame(frame); finish(); };
    host.addEventListener('scroll', remember, {passive:true});
    host.addEventListener('wheel', interrupt, {passive:true});
    host.addEventListener('pointerdown', interrupt);
    host.addEventListener('keydown', interrupt);
    remember();
    let width = host.clientWidth;
    const observer = new ResizeObserver(() => {
      if (width === host.clientWidth) return;
      width = host.clientWidth;
      position(false);
    });
    observer.observe(host);
    return () => {
      remember(); disposed = true; cancelAnimationFrame(frame); observer.disconnect();
      host.removeEventListener('scroll', remember);
      host.removeEventListener('wheel', interrupt);
      host.removeEventListener('pointerdown', interrupt);
      host.removeEventListener('keydown', interrupt);
    };
  }, [currentId, viewportState, items.map(item => item.label).join('|'), tail]);
  return <div className="eva-task-breadcrumb-shell">{leading}<div ref={viewport} className="eva-task-breadcrumb-scroll">
    <Breadcrumb className="eva-task-breadcrumb" aria-label="任务路径" activeIndex={items.length - 1} autoCollapse={false} showTooltip={false} separator={separator}>
      {[...items, ...tail].map((item, index) => <Breadcrumb.Item key={item.id} noLink>
        <button type="button" className="eva-task-breadcrumb-item" style={typography.body} onClick={item.onClick} disabled={!item.onClick} aria-hidden={index >= items.length ? true : undefined}>
          {item.icon}{item.identifier && <span className="eva-task-breadcrumb-id">{item.identifier}</span>}<span className="eva-task-breadcrumb-title">{item.label}</span>
        </button>
      </Breadcrumb.Item>)}
    </Breadcrumb>
  </div></div>;
}
