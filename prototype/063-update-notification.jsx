import React from 'react';
import {Button} from './063-forms.jsx';
import {Notification,Typography} from './063-notification.jsx';
import {EvaLucideIcon} from './063-lucide-icon.jsx';
import {updateNotificationActions} from './063-ui-theme.js';
import {Dialog} from './063-dialog.jsx';
import {connectUpdateNotification} from './063-update-notification-controller.js';
import {createUpdateDemoSource} from './063-update-demo.js';

const UpdateContext=React.createContext(null);

export function CheckUpdateButton(){
 const check=React.useContext(UpdateContext);
 const [busy,setBusy]=React.useState(false);
 const active=React.useRef(false);
 React.useEffect(()=>{active.current=true;return()=>{active.current=false;};},[]);
 const handleCheck=async()=>{
  setBusy(true);
  try{await check();}
  catch{
   if(active.current)Notification.error({id:'eva-update-check-error',title:'检查更新失败',content:'请稍后重试',position:'bottomRight'});
  }finally{if(active.current)setBusy(false);}
 };
 return <Button size="small" loading={busy} disabled={busy||!check} onClick={handleCheck}>检查</Button>;
}

const noticeId='eva-app-update-ready';

export function UpdateNotificationHost({source,children}) {
 const connection=React.useRef(null);
 const [changelog,setChangelog]=React.useState(null);
 const [updater]=React.useState(()=>source||window.EvaDesktopUpdates||createUpdateDemoSource(window.location.search,{
  onChangelog:setChangelog,
  onRestart:()=>Notification.info({id:'eva-update-demo-result',title:'原型演示',content:'已演示重启操作，未执行实际安装或重启。',position:'bottomRight'}),
 }));
 React.useEffect(()=>{
  let active=true;
  const disconnect=connectUpdateNotification({source:updater,close:()=>Notification.close(noticeId),present:view=>{
   Notification.open({id:noticeId,title:'更新已就绪',position:'bottomRight',duration:0,
    icon:<EvaLucideIcon name="refresh-cw" size="large" style={{color:'var(--semi-color-success)'}}/>,
    style:{width:350,maxWidth:'calc(100vw - 40px)'},onCloseClick:view.dismiss,
    content:<>
     <div>v{view.version} 将在下次启动时生效。</div>
     {view.error&&<div role="alert"><Typography.Text type="danger">{view.error}</Typography.Text></div>}
     <div style={{marginTop:updateNotificationActions.contentGap,display:'flex',flexWrap:'wrap',gap:updateNotificationActions.buttonGap}}>
      <Button type="tertiary" theme="light" style={updateNotificationActions.secondary} onClick={()=>{Promise.resolve().then(()=>active&&updater.openChangelog(view.version)).catch(()=>{if(active)Notification.error({id:'eva-update-changelog-error',title:'无法打开更新日志',content:'请稍后重试',position:'bottomRight'});});}}>查看更新日志</Button>
      <Button type="primary" theme="solid" loading={view.busy} disabled={view.busy} aria-busy={view.busy} onClick={()=>{void view.restart();}}>立即重启</Button>
     </div>
    </>,
   });
  }});
  connection.current=disconnect;
  return()=>{active=false;connection.current=null;disconnect();};
 },[updater]);
 const check=React.useCallback(async()=>{
  if(typeof updater.check==='function')await updater.check();
  else if(updater.getSnapshot()?.status!=='ready')throw new Error('Updater check unavailable');
  connection.current?.reveal();
 },[updater]);
 return <UpdateContext.Provider value={check}>{children}<Dialog title="更新日志" visible={!!changelog} footer={null} initialFocus="title" onCancel={()=>setChangelog(null)}>
  <Typography.Paragraph strong>v{changelog}</Typography.Paragraph>
  <Typography.Paragraph>新增更新就绪通知，支持查看更新日志、关闭提醒和立即重启操作。</Typography.Paragraph>
  <Typography.Text type="secondary">此版本仅用于原型演示。</Typography.Text>
 </Dialog></UpdateContext.Provider>;
}
