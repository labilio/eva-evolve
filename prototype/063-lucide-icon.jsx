import React from 'react';
import Icon from '@douyinfe/semi-icons/lib/es/components/Icon';

// Keep Eva's Lucide artwork; Semi owns icon geometry and baseline alignment.
export function EvaLucideIcon({name,size='default',style,...props}) {
 const pixels=typeof size==='number'?size:({'extra-small':8,small:12,default:16,large:20,'extra-large':24}[size]||16);
 return <Icon {...props} size={typeof size==='number'?'default':size} style={typeof size==='number'?{...style,fontSize:size}:style} aria-hidden="true" svg={<span dangerouslySetInnerHTML={{__html:window.__evaLucide(name,{size:pixels})}}/>}/>;
}
