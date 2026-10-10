import React from 'react';
import List from '@douyinfe/semi-ui/lib/es/list';
import {infoListText} from './063-ui-theme.js';

// Static explanations only; menus, settings and member pickers have other owners.
export function InfoList({items=[]}) {
 if (!items.length) return null;
 return <List className="eva-info-list" split={false} dataSource={items}
  renderItem={({id,icon:Icon,title,description})=><List.Item key={id}
   header={Icon ? <span className="eva-info-list-icon" aria-hidden="true"><Icon size={20} strokeWidth={1.75}/></span> : null}
   main={<><div className="eva-info-list-title" style={infoListText.title}>{title}</div>
    {description != null && description !== '' && <div className="eva-info-list-description" style={infoListText.description}>{description}</div>}</>}/>} />;
}
