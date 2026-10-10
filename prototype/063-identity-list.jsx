import React from 'react';
import List from '@douyinfe/semi-ui/lib/es/list';
import {typography} from './063-ui-theme.js';

// A single geometry for identity rows inside cards and compact confirmations.
// Callers supply identity-owned avatar and badge nodes; the list owns alignment.
export function IdentityList({items=[]}) {
 return <List className="eva-identity-list" size="small" split={false} dataSource={items}
  renderItem={({id,avatar,name,badge})=><List.Item key={id} align="center"
   header={avatar} main={<span className="eva-identity-list-name" style={typography.section}>{name}{badge}</span>}/>} />;
}
