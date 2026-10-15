// Package state belongs to the updater. The connection owns visibility and
// command locks only; routing does not create another update operation.
const visibleStates=new Set(['available','downloading','preparing','ready','error','demo-complete','current','check-error']);
const errors={download:'更新失败。',install:'更新失败。'};
export function connectUpdateNotification({source,present,close}) {
 let current=null,dismissedVersion=null,disposed=false,error='',errorKind='',pending=null,revision=0;
 const render=()=>{
  if(disposed||!current||dismissedVersion===current.version)return;
  const version=current.version;
  const allowed=()=>!disposed&&current?.version===version&&dismissedVersion!==version;
  present({...current,status:errorKind==='download'?'error':current.status,error,errorKind,busy:pending?.action||'',
   dismiss(){if(!allowed())return;dismissedVersion=version;close();},
   download:()=>allowed()&&(errorKind==='download'||['available','error'].includes(current.status))?run('download'):Promise.resolve(),
   restart:()=>allowed()&&current.status==='ready'?run('install'):Promise.resolve(),
  });
 };
 const run=async action=>{
  if(pending)return;
  const token={action,version:current.version,revision:++revision};pending=token;error='';errorKind='';render();
  try{
   await source[action](token.version);
   if(!disposed&&revision===token.revision&&action==='install'&&current?.status==='ready'){dismissedVersion=token.version;close();}
  }catch{
   const relevant=action==='download'?['available','downloading','error'].includes(current?.status):current?.status==='ready';
   if(!disposed&&revision===token.revision&&current?.version===token.version&&relevant){error=errors[action];errorKind=action;}
  }finally{if(pending===token)pending=null;render();}
 };
 const receive=snapshot=>{
  if(disposed)return;
  if(!visibleStates.has(snapshot?.status)||typeof snapshot.version!=='string'||!snapshot.version.trim()){current=null;error='';errorKind='';revision++;close();return;}
  if(current?.version!==snapshot.version)revision++;
  if(current?.version!==snapshot.version||current?.status!==snapshot.status){error='';errorKind='';}
  current={...snapshot};render();
 };
 const unsubscribe=source.subscribe(receive);receive(source.getSnapshot());
 const disconnect=()=>{disposed=true;revision++;unsubscribe();close();};
 disconnect.reveal=()=>{if(disposed)return;dismissedVersion=null;render();};
 return disconnect;
}
