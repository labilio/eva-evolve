// The updater owns package state. This connection owns only notification
// dismissal and the in-flight action, scoped to the authenticated app host.
export function connectUpdateNotification({source,present,close}) {
 let current=null, dismissedVersion=null, disposed=false, busy=false, error='';
 const render=()=>{
  if(disposed||!current||dismissedVersion===current.version)return;
  const version=current.version;
  present({...current,busy,error,
   dismiss(){if(disposed||current?.version!==version)return;dismissedVersion=version;close();},
   async restart(){
    if(disposed||busy||current?.version!==version||dismissedVersion===version)return;
    busy=true;error='';render();
    try{
     await source.install(version);
     if(!disposed&&current?.version===version){dismissedVersion=version;close();}
    }catch{
     if(!disposed&&current?.version===version)error='重启失败，请重试';
    }finally{
     busy=false;render();
    }
   },
  });
 };
 const receive=snapshot=>{
  if(disposed)return;
  const ready=snapshot?.status==='ready'&&typeof snapshot.version==='string'&&snapshot.version.trim();
  if(!ready){current=null;error='';close();return;}
  if(current?.version===snapshot.version)return;
  current={...snapshot};error='';render();
 };
 // Subscribe before reading the cached snapshot, so startup cannot miss an event.
 const unsubscribe=source.subscribe(receive);
 receive(source.getSnapshot());
 const disconnect=()=>{disposed=true;unsubscribe();close();};
 disconnect.reveal=()=>{if(disposed)return;dismissedVersion=null;render();};
 return disconnect;
}
