import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import {createPatchedRuntime} from '../tools/build-runtime.mjs';
const source=createPatchedRuntime().source;
function setup(){
 const start=source.indexOf('async function evaTaskScopeIssues('),end=source.indexOf('function EvaTaskFilterIdentity(',start);
 assert.ok(start>=0&&end>start,'task relationship filter is available');
 let actor='me',project='prod',allowed=true;
 const comments=new Map(),store={actorId:()=>actor,canRead:()=>allowed,cloneRecords:()=>[{id:'clone-me',ownerId:'me'},{id:'clone-other',ownerId:'other'}]};
 const ctx={evaMembers:()=>({store}),currentSpaceId:()=>project,listComments:async id=>comments.get(id)||[]};
 vm.runInNewContext(source.slice(start,end),ctx);
 return{ctx,comments,setActor:v=>actor=v,setProject:v=>project=v,setAllowed:v=>allowed=v};
}
const task=(id,extra={})=>({id,workspace_id:'prod',creator_id:'other',source_id:'other',assignee_id:'other',...extra});
test('related combines current roles, comments, mentions and own clone, without duplicate tasks',async()=>{
 const {ctx,comments}=setup();comments.set('comment',[{author_id:'me',content:'已核对'}]);comments.set('mention',[{author_id:'other',content:'[@本人](mention://member/me) 请确认'}]);
 const tasks=[task('mine',{assignee_id:'me'}),task('source',{source_id:'me'}),task('created',{creator_id:'me'}),task('comment'),task('mention'),task('clone',{creator_id:'clone-me'}),task('clone-mention',{description:'[@分身](mention://agent/clone-me)'}),task('both',{creator_id:'me',assignee_id:'me'}),task('unrelated'),task('viewed',{viewed_by:['me']}),task('other-clone',{creator_id:'clone-other'}),task('text',{description:'@me mention://member/me [@相似](mention://member/me-other)'})];
 assert.deepEqual(Array.from(await ctx.evaTaskScopeIssues(tasks,'related'),x=>x.id),['mine','source','created','comment','mention','clone','clone-mention','both']);
 assert.deepEqual(Array.from(await ctx.evaTaskScopeIssues(tasks,'mine'),x=>x.id),['mine','both']);
});
test('relationship recomputes after transfer, comment deletion and description editing',async()=>{
 const {ctx,comments}=setup(),t=task('task',{assignee_id:'me'});
 assert.equal((await ctx.evaTaskScopeIssues([t],'related')).length,1);
 t.assignee_id='other';assert.equal((await ctx.evaTaskScopeIssues([t],'related')).length,0);
 comments.set('task',[{author_id:'clone-me',content:'参与'}]);assert.equal((await ctx.evaTaskScopeIssues([t],'related')).length,1);
 comments.set('task',[]);assert.equal((await ctx.evaTaskScopeIssues([t],'related')).length,0);
 t.description='[@本人](mention://member/me)';assert.equal((await ctx.evaTaskScopeIssues([t],'related')).length,1);
 t.description='已移除提及';assert.equal((await ctx.evaTaskScopeIssues([t],'related')).length,0);
});
test('scope cannot grant project access or include another project',async()=>{
 const s=setup(),tasks=[task('visible',{creator_id:'me'}),task('foreign',{creator_id:'me',workspace_id:'private'})];
 assert.deepEqual(Array.from(await s.ctx.evaTaskScopeIssues(tasks,'related'),x=>x.id),['visible']);
 s.setAllowed(false);assert.equal((await s.ctx.evaTaskScopeIssues(tasks,'all')).length,0);
});
test('in-flight comment loading cannot cross project or account changes',async()=>{
 const s=setup();s.ctx.listComments=async()=>{s.setProject('other-project');return[{author_id:'me'}]};
 assert.equal((await s.ctx.evaTaskScopeIssues([task('task')],'related')).length,0);
});
