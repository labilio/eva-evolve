import React from 'react';
import SemiProgress from '@douyinfe/semi-ui/lib/es/progress';
// Native progress behavior, with its locked-version styles scoped by the build.
export function Progress({className='',...props}){
 return <div className="eva-progress"><SemiProgress {...props} className={className}/></div>;
}
