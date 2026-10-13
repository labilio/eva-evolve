import React from 'react';
import SemiNotification from '@douyinfe/semi-ui/lib/es/notification';
export {default as Typography} from '@douyinfe/semi-ui/lib/es/typography';
export {default as Space} from '@douyinfe/semi-ui/lib/es/space';
import {EvaLucideIcon} from './063-lucide-icon.jsx';

const statusIcons={info:'info',warning:'triangle-alert',error:'circle-alert'};

// Semi owns content, lifetime and Portal behavior; the shared theme owns
// Eva typography, spacing, colors, radius and elevation.
function show(method,options={}) {
 const {className='',...props}=options;
 return SemiNotification[method]({...props,
  icon:options.icon!==undefined?options.icon:(statusIcons[method]?<EvaLucideIcon name={statusIcons[method]} size="large"/>:undefined),
  className:`eva-notification ${className}`,
 });
}
export const Notification=Object.freeze({
 open:options=>show('open',options),
 success:options=>show('success',options),
 info:options=>show('info',options),
 warning:options=>show('warning',options),
 error:options=>show('error',options),
 close:id=>SemiNotification.close(id),
 destroyAll:()=>SemiNotification.destroyAll(),
});
