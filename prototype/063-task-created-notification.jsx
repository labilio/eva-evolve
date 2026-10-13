import React from 'react';
import {notificationLayout} from './063-ui-theme.js';
import {Notification,Typography} from './063-notification.jsx';

// One composition for every Loop creation entry. Semi owns layout and lifetime.
export function notifyTaskCreated({issue,projectId,viewUrl,onView,onForward}) {
 const id=`task-created:${projectId}:${issue.id}`;
 const act=callback=>event=>{event.preventDefault();if(callback()!==false)Notification.close(id);};
 return Notification.success({id,title:'已创建任务',position:'bottomRight',style:{width:350},
  content:<>
   <div>{issue.identifier} <strong>{issue.title}</strong></div>
   <div style={{marginTop:notificationLayout.contentGap,display:'flex',columnGap:notificationLayout.actionGap}}>
    <Typography.Text link={{href:viewUrl}} onClick={act(onView)}>查看任务</Typography.Text>
    <Typography.Text link={{href:'#'}} onClick={act(onForward)}>转发</Typography.Text>
   </div>
  </>,
 });
}
