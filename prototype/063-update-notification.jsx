import React from 'react';
import {Button} from './063-forms.jsx';
import {Notification,Typography} from './063-notification.jsx';
import {Progress} from './063-progress.jsx';
import {EvaLucideIcon} from './063-lucide-icon.jsx';
import {updateNotificationActions as layout} from './063-ui-theme.js';
import {Dialog} from './063-dialog.jsx';
import {connectUpdateNotification} from './063-update-notification-controller.js';
import {createUpdateDemoSource} from './063-update-demo.js';
function UpdateIcon({failed=false}){
 return <EvaLucideIcon name={failed?'circle-alert':'refresh-cw'} size="large" style={{color:failed?'var(--semi-color-danger)':'var(--semi-color-success)'}}/>;
}
const failureExamples={
 generic:{label:'一般下载失败',title:'下载更新失败',body:'更新未能下载完成，请稍后重试。你可以继续使用当前版本。'},
 offline:{label:'下载中途断网',title:'下载已中断',body:'网络连接已断开，请连接网络后重新下载。当前版本仍可正常使用。'},
 timeout:{label:'下载连接超时',title:'下载连接超时',body:'更新服务器暂时没有响应，请稍后重新下载。当前版本仍可正常使用。'},
 disk:{label:'存储空间不足',title:'存储空间不足',body:'无法保存更新文件，请释放存储空间后重新下载。当前版本未受影响。'},
 signature:{label:'更新包校验失败',title:'更新包校验失败',body:'无法验证更新包的真实性，本次更新已停止。请重新下载；若仍失败，请联系管理员。'},
 archive:{label:'更新包解压失败',title:'更新包解压失败',body:'无法解压更新文件，请重新下载。当前版本未受影响。'},
 permission:{label:'安装权限不足',title:'无法安装更新',body:'没有权限写入更新，请联系管理员授予安装权限后重试。你可以继续使用当前版本。'},
};
const UpdateContext=React.createContext(null),noticeId='eva-app-update';
export function CheckUpdateButton(){
 const context=React.useContext(UpdateContext),check=context?.check,[busy,setBusy]=React.useState(false),[examplesOpen,setExamplesOpen]=React.useState(false);
 const active=React.useRef(false),pending=React.useRef(false);
 React.useEffect(()=>{active.current=true;return()=>{active.current=false;};},[]);
 const handleCheck=async()=>{
  if(pending.current||!check)return;pending.current=true;setBusy(true);
  try{await check();}catch{if(active.current)Notification.error({icon:<UpdateIcon failed/>,id:'eva-update-check-error',title:'检查更新失败。',position:'bottomRight'});}
  finally{pending.current=false;if(active.current)setBusy(false);}
 };
 return <div style={layout.settingsActions}><Button size="small" loading={busy} disabled={busy||!check} onClick={handleCheck}>{busy?'正在检查更新…':'检查更新'}</Button>{context?.previewFailure&&<Button size="small" disabled={busy||context.demoBusy} aria-expanded={examplesOpen} onClick={()=>setExamplesOpen(value=>!value)}>演示更新失败</Button>}<div hidden={!examplesOpen}><div style={layout.settingsActions}><Typography.Text type="tertiary">以下均为模拟故障，不会断开真实网络或修改系统权限。下载类场景会先显示进度，重试模拟问题已解决。</Typography.Text><Typography.Text link={{href:'https://github.com/sparkle-project/Sparkle/blob/2.x/Sparkle/zh_CN.lproj/Sparkle.strings',target:'_blank',rel:'noopener noreferrer'}}>Sparkle：中文文案（GitHub）</Typography.Text><Typography.Text link={{href:'https://github.com/sparkle-project/Sparkle/blob/2.x/Sparkle/SUErrors.h',target:'_blank',rel:'noopener noreferrer'}}>Sparkle：错误分类（GitHub）</Typography.Text><Typography.Text link={{href:'https://github.com/sparkle-project/Sparkle/blob/2.x/Sparkle/SPUDownloadDriver.m',target:'_blank',rel:'noopener noreferrer'}}>Sparkle：下载错误处理（GitHub）</Typography.Text>{Object.entries(failureExamples).map(([kind,example])=><Button key={kind} disabled={context?.demoBusy} onClick={()=>{context.previewFailure(kind);setExamplesOpen(false);}}>{example.label}</Button>)}</div></div></div>;
}
function presentation(view){
 if(view.busy==='install')return {title:'正在重启 Eva 智能办公系统…'};
 if(view.failure||view.errorKind==='download'||view.status==='error')return {...(failureExamples[view.failure]||failureExamples.generic),error:true};
 return {
  available:{title:'有可用更新',body:`下载最新版 Eva 智能办公系统 ${view.version}`},
  downloading:{title:'正在下载更新'},
  preparing:{title:'正在应用更新…'},
  ready:{title:'更新已准备就绪',body:`Eva 智能办公系统 ${view.version} 已下载完成，重启后即可完成更新。`},
  current:{title:'Eva 智能办公系统已是最新',body:`Eva 智能办公系统 ${view.currentVersion||view.version}`},
  'check-error':{title:'检查更新失败。',error:true},
  'demo-complete':{title:'演示已完成',body:'已演示安装与重启流程，未执行实际安装或重启。'},
 }[view.status];
}
function DownloadProgress({view}){
 const measured=Number.isFinite(view.percent),percent=measured?Math.max(0,Math.min(100,Math.floor(view.percent))):0;
 const size=value=>`${(Math.max(0,value)/1024/1024).toFixed(1)} MB`;
 const detail=Number.isFinite(view.transferred)?size(view.transferred)+(Number.isFinite(view.total)&&view.total>0?` / ${size(view.total)}`:''):'正在下载更新';
 return <div data-update-progress aria-live="off">
  <Progress stroke="var(--semi-color-primary)" percent={percent} indeterminate={!measured} showInfo={false} aria-label="更新下载进度" aria-valuetext={measured?`${percent}%，${detail}`:'正在下载，总大小未知'}/>
  <div style={layout.downloadActions}>
   <span style={layout.progressText}>{detail}</span>
  </div>
 </div>;
}
function UpdateContent({view,onChangelog}){
 const display=presentation(view),installing=view.busy==='install',downloadable=['available','error'].includes(view.status);
 const actions=downloadable||['ready','demo-complete'].includes(view.status);
 return <div data-update-state={installing?'installing':view.status}>
  {display.body&&<div>{display.body}</div>}
  {view.status==='downloading'&&<DownloadProgress view={view}/>}
  {view.status==='preparing'&&<div style={layout.progress}><Progress stroke="var(--semi-color-primary)" indeterminate showInfo={false} aria-label="正在应用更新…"/></div>}
  {view.error&&view.errorKind!=='download'&&<div role="alert"><Typography.Text type="danger">{view.error}</Typography.Text></div>}
  {actions&&<div style={layout.actions} data-update-actions>
   {downloadable&&!display.error&&<><Button type="tertiary" theme="light" style={layout.secondary} onClick={onChangelog}>新版变化</Button><Button type="primary" theme="solid" disabled={!!view.busy} loading={view.busy==='download'} onClick={view.download}>下载</Button></>}
   {downloadable&&display.error&&<><Button type="tertiary" theme="light" style={layout.secondary} onClick={view.dismiss}>稍后再试</Button><Button type="primary" theme="solid" disabled={!!view.busy} loading={view.busy==='download'} onClick={view.download}>重新下载</Button></>}
   {view.status==='ready'&&<><Button type="tertiary" theme="light" style={layout.secondary} onClick={view.dismiss}>{view.failure?'稍后再试':'忽略'}</Button><Button type="primary" theme="solid" loading={installing} disabled={!!view.busy} onClick={view.restart}>{view.failure?'重试安装':'更新并重启'}</Button></>}
   {view.status==='demo-complete'&&<Button type="tertiary" theme="light" style={layout.secondary} onClick={view.dismiss}>完成</Button>}
  </div>}
 </div>;
}
export function UpdateNotificationHost({source,children}){
 const connection=React.useRef(null),[changelog,setChangelog]=React.useState(null);
 const [updater]=React.useState(()=>source||window.EvaDesktopUpdates||createUpdateDemoSource(window.location.search,{onChangelog:setChangelog}));
 const ownsDemo=!source&&!window.EvaDesktopUpdates;
 const [demoBusy,setDemoBusy]=React.useState(false);
 React.useEffect(()=>{
  let active=true;
  const unsubscribeDemo=ownsDemo?updater.subscribe(snapshot=>setDemoBusy(['downloading','preparing'].includes(snapshot.status))):()=>{};
  const disconnect=connectUpdateNotification({source:updater,close:()=>Notification.close(noticeId),present:view=>{
   const display=presentation(view);
   if(ownsDemo)setDemoBusy(['downloading','preparing'].includes(view.status)||view.busy==='install');
   const onChangelog=()=>Promise.resolve().then(()=>active&&updater.openChangelog(view.version)).catch(()=>{if(active)Notification.error({icon:<UpdateIcon failed/>,id:'eva-update-changelog-error',title:'无法打开新版变化',content:'请稍后重试',position:'bottomRight'});});
   Notification.open({id:noticeId,title:display.title,position:'bottomRight',duration:0,className:'eva-update-notification',
    icon:<UpdateIcon failed={Boolean(display.error||view.error)}/>,style:layout.surface,onCloseClick:view.dismiss,
    content:<UpdateContent view={view} onChangelog={onChangelog}/>,
   });
  }});
  connection.current=disconnect;
  return()=>{active=false;connection.current=null;unsubscribeDemo();disconnect();if(ownsDemo)updater.dispose();};
 },[updater,ownsDemo]);
 const check=React.useCallback(async()=>{await updater.check();connection.current?.reveal();},[updater]);
 const previewFailure=ownsDemo?kind=>{if(updater.previewFailure(kind))connection.current?.reveal();}:null;
 return <UpdateContext.Provider value={{check,previewFailure,demoBusy}}>{children}<Dialog title="新版变化" visible={!!changelog} footer={null} initialFocus="title" onCancel={()=>setChangelog(null)}><Dialog.Fields><Dialog.Text strong>Eva 智能办公系统 {changelog}</Dialog.Text><Dialog.Text secondary>此版本仅用于原型演示。</Dialog.Text></Dialog.Fields></Dialog></UpdateContext.Provider>;
}
