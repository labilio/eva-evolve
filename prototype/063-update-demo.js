// Explicit fixture: shown only by the demo URL or a manual settings check.
// No network download, install, page reload, or product data write occurs here.
export function createUpdateDemoSource(search,{onChangelog,onRestart}) {
 let snapshot=new URLSearchParams(search).get('updateDemo')==='ready'?{status:'ready',version:'0.1.1-demo'}:{status:'idle'};
 const listeners=new Set();
 return {
  getSnapshot:()=>snapshot,
  async check(){snapshot={status:'ready',version:'0.1.1-demo'};listeners.forEach(listener=>listener(snapshot));},
  subscribe(listener){listeners.add(listener);return()=>listeners.delete(listener);},
  openChangelog:()=>onChangelog(snapshot.version),
  async install(){snapshot={status:'idle'};listeners.forEach(listener=>listener(snapshot));onRestart();},
 };
}
