import React from 'react';
import SemiCard from '@douyinfe/semi-ui/lib/es/card';

// Semi owns the structure; muted is optional, not the default for every card.
export const Card=React.forwardRef(function Card({tone='default',className='',style,...props},ref){
 return <SemiCard {...props} ref={ref} className={`eva-card ${className}`} style={{...style,...(tone==='muted'?{backgroundColor:'var(--eva-surface-subtle)'}:{})}}/>;
});
Card.Meta=SemiCard.Meta;
