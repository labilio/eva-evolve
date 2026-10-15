// UI simulation only. No package download, installation, reload, or OS restart.
export function createUpdateDemoSource(search,{onChangelog,schedule=setTimeout,unschedule=clearTimeout}) {
 const params=new URLSearchParams(search),version='2.0.28',total=48*1024*1024;
 const initial=params.get('updateDemo');
 let currentVersion='2.0.27';
 let snapshot={status:initial==='ready'?'ready':(initial===null||initial==='available')?'available':'idle',version,currentVersion};
 let timer=null,disposed=false,failOnce=initial==='download-error',installFail=initial==='install-error',finishInstall=null,scenario=null;
 const listeners=new Set();
 const emit=value=>{if(disposed)return;snapshot={version,currentVersion,...value};listeners.forEach(fn=>fn(snapshot));};
 const stop=()=>{if(timer!==null)unschedule(timer);timer=null;};
 const later=(fn,ms)=>{stop();timer=schedule(()=>{timer=null;if(!disposed)fn();},ms);};
 const tick=()=>{
  const percent=Math.min(100,snapshot.percent+8);
  if((failOnce||['offline','timeout','disk'].includes(scenario))&&percent>=48){const failure=scenario;failOnce=false;scenario=null;emit({status:'error',failure,percent,transferred:total*percent/100,total});return;}
  emit({status:'downloading',percent,transferred:total*percent/100,total});
  if(percent<100)later(tick,500);
  else later(()=>{emit({status:'preparing'});later(()=>{if(['signature','archive'].includes(scenario)){const failure=scenario;scenario=null;emit({status:'error',failure});}else emit({status:'ready'});},1500);},400);
 };
 const download=async()=>{if(disposed||!['available','error'].includes(snapshot.status))return;emit({status:'downloading',percent:0,transferred:0,total});later(tick,500);};
 return {
  getSnapshot:()=>snapshot,
  previewFailure(kind='generic'){if(disposed||['downloading','preparing'].includes(snapshot.status)||finishInstall)return false;if(!['generic','offline','timeout','disk','signature','archive','permission'].includes(kind))return false;stop();failOnce=false;scenario=kind==='generic'?null:kind;if(kind==='permission'){scenario=null;emit({status:'ready',failure:'permission'});}else{emit({status:'error'});if(kind!=='generic')download();}return true;},
  subscribe(fn){listeners.add(fn);return()=>listeners.delete(fn);},
  async check(){if(['idle','demo-complete'].includes(snapshot.status))emit({status:initial==='current'?'current':initial==='check-error'?'check-error':'available'});},
  download,
  openChangelog:requested=>onChangelog(requested||currentVersion),
  install(){
   if(snapshot.status!=='ready')return Promise.reject(new Error('Update is not ready'));
   if(snapshot.failure)emit({status:'ready'});
   if(installFail){installFail=false;return Promise.reject(new Error('Demo restart cancelled'));}
   return new Promise(resolve=>{finishInstall=resolve;later(()=>{currentVersion=version;emit({status:'demo-complete'});finishInstall=null;resolve();},900);});
  },
  dispose(){disposed=true;stop();listeners.clear();finishInstall?.();finishInstall=null;},
 };
}
