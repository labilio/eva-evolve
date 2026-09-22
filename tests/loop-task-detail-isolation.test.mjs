import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import {createPatchedRuntime} from '../tools/build-runtime.mjs';
const source=createPatchedRuntime().source;
const readPrototype=name=>fs.readFileSync(new URL('../prototype/'+name+'.js',import.meta.url),'utf8');
function setup(){
 let issues=[{id:'supply-1'},{id:'new-task'},{id:'child',parent_issue_id:'supply-1'}];
 // 评论演示数据唯一来源是 009-2，运行时只按当前任务读取，不再内嵌副本。
 const window={};
 for(const name of ['009-0-demo-time','009-1-data-drive','009-2-data-supply'])vm.runInNewContext(readPrototype(name),{window});
 const ctx={issuesOf:()=>issues,window};
 for(const [name,next] of [['listRuns','listRunMessages'],['listComments','addComment'],['listChildren','listComments'],['listTimeline','resolveComment']]){
  const start=source.indexOf(name+'='),end=source.indexOf(','+next+'=',start);
  assert.ok(start>=0&&end>start,name+' extraction');vm.runInNewContext(source.slice(start,end),ctx);
 }
 return {ctx,setIssues:value=>{issues=value;}};
}
test('新任务没有其他任务运行历史，预置运行只属于 supply-1',async()=>{
 const {ctx}=setup();assert.equal((await ctx.listRuns('new-task')).length,0);assert.equal((await ctx.listRuns()).length,0);assert.equal((await ctx.listRuns('supply-1')).length,1);assert.equal((await ctx.listRuns('supply-1'))[0].issue_id,'supply-1');
});
test('评论、子任务、动态在新任务为空，预置任务内容仍存在',async()=>{
 const {ctx}=setup();for(const fn of ['listComments','listChildren','listTimeline'])assert.equal((await ctx[fn]('new-task')).length,0);
 assert.equal((await ctx.listComments('supply-1')).length,4);assert.equal((await ctx.listChildren('supply-1'))[0].id,'child');assert.equal((await ctx.listComments()).length,0);
});
test('切到其他项目后旧任务运行、评论和子任务均不泄露',async()=>{
 const s=setup();s.setIssues([{id:'other-project-task'},{id:'orphan',parent_issue_id:'supply-1'}]);
 for(const fn of ['listRuns','listComments','listChildren','listTimeline'])assert.equal((await s.ctx[fn]('supply-1')).length,0);
});
test('详情初载与重新运行后的刷新均传当前任务ID',()=>{
 assert.ok(source.includes('Promise.all([getIssue(rt),listComments(rt),listRuns(rt)])'));
 assert.ok(source.includes('Pa=()=>listRuns(rt).then(mr)'));
 assert.ok(source.includes('listTimeline(rt).then(no=>{Wi()&&sr(no)})'));
});
