import vm from 'node:vm';
// Load the production task lookup boundary into the existing focused API fixtures.
export function attachTaskScope(ctx, source) {
 ctx.currentSpaceId ||= ()=> 'prod';
 ctx.loadSpaces ||= ()=>[{id:ctx.currentSpaceId()}];
 ctx.ISSUES_BY_SPACE ||= new Proxy({}, {get:(_,id)=>ctx.issuesOf(id)});
 ctx.evaTaskProjectId ||= project=>project?.collaborationId||(project?.id==='p-supply'?'prod':project?.id);
 const members=ctx.evaMembers||(()=>({store:{}}));
 ctx.evaMembers=()=>{
  const value=members();
  value.store.canRead ||= ()=>true;
  value.store.actorId ||= ()=> 'test-actor';
  return value;
 };
 const start=source.indexOf('function evaTaskRecord('),end=source.indexOf('function evaTaskDetailContext(',start);
 if(start<0||end<start)throw new Error('Task scope helper boundary missing');
 vm.runInNewContext(source.slice(start,end),ctx);
}
